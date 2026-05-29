/**
 * GET /api/agents?since=7d|30d|all
 *
 * Pipeline (DATA_MODEL §6):
 *   1. load live session metadata (every request — never cached)
 *   2. scan project .jsonl files, parse via mtime cache
 *   3. keep entrypoint==='cli' (ADR-010)
 *   4. keep lastTimestamp >= cutoff (ADR-012)
 *   5. sort by lastTimestamp desc
 */

import path from 'node:path';
import { loadActiveSessions } from '@/lib/sessions-meta';
import {
  scanProjects,
  sessionToAgent,
  sessionEntrypoint,
  projectsRootExists,
} from '@/lib/claude-logs';
import { getCachedOrParse } from '@/lib/log-cache';
import type { Agent } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DAY_MS = 86_400_000;

function computeCutoff(since: string, now: number): number {
  if (since === 'all') return 0;
  if (since === '30d') return now - 30 * DAY_MS;
  return now - 7 * DAY_MS; // '7d' default
}

function computeTotals(agents: Agent[]) {
  return {
    total: agents.length,
    running: agents.filter((a) => a.status === 'running').length,
    review: agents.filter((a) => a.status === 'review').length,
    error: agents.filter((a) => a.status === 'error').length,
    waiting: agents.filter((a) => a.status === 'waiting').length,
    idle: agents.filter((a) => a.status === 'idle').length,
    tokens: agents.reduce((s, a) => s + a.tokens, 0),
    cost: agents.reduce((s, a) => s + a.cost, 0),
    edited: agents.reduce((s, a) => s + a.edited, 0),
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export async function GET(req: Request) {
  const since = new URL(req.url).searchParams.get('since') ?? '7d';
  const now = Date.now();
  const cutoff = computeCutoff(since, now);

  try {
    const [activeSessions, files, projectsFound] = await Promise.all([
      loadActiveSessions(),
      scanProjects(),
      projectsRootExists(),
    ]);

    const agents: Agent[] = [];
    for (const file of files) {
      const records = await getCachedOrParse(file);
      if (records.length === 0) continue;
      const sessionId = path.basename(file, '.jsonl');
      const meta = activeSessions.get(sessionId);
      if (sessionEntrypoint(records, meta) !== 'cli') continue; // ADR-010
      const agent = sessionToAgent(file, records, activeSessions);
      if (agent.lastTimestamp >= cutoff) agents.push(agent);
    }
    agents.sort((a, b) => b.lastTimestamp - a.lastTimestamp);

    return json({
      agents,
      totals: computeTotals(agents),
      filter: { since, entrypoint: 'cli' },
      projectsFound,
      generatedAt: now,
    });
  } catch (e) {
    return json({ error: (e as Error)?.message ?? 'Failed to read sessions' }, 500);
  }
}
