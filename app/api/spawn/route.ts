/**
 * POST /api/spawn — opens a new terminal and runs `claude` in it.
 *
 * Security (ADR-015):
 *   - The server only binds 127.0.0.1.
 *   - This endpoint has side effects (~RCE), so we require an Origin header
 *     from a known local origin to thwart drive-by CSRF from other browser
 *     tabs on the same machine.
 *   - All body fields are validated before reaching lib/spawn.
 */

import { statSync } from 'node:fs';
import path from 'node:path';
import { spawnClaudeSession, type SpawnOpts } from '@/lib/spawn';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_ORIGINS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MODELS = new Set(['opus', 'sonnet', 'haiku']);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function validate(raw: unknown): { ok: true; opts: SpawnOpts } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'body must be an object' };
  const b = raw as Record<string, unknown>;

  const sessionId = String(b.sessionId ?? '');
  if (!UUID_RE.test(sessionId)) return { ok: false, error: 'sessionId must be a UUID' };

  const name = String(b.name ?? '').trim();
  if (!name) return { ok: false, error: 'name is required' };
  if (name.length > 100) return { ok: false, error: 'name must be ≤ 100 chars' };

  const model = String(b.model ?? '');
  if (!MODELS.has(model)) return { ok: false, error: 'model must be opus | sonnet | haiku' };

  const cwd = String(b.cwd ?? '');
  if (!cwd || !path.isAbsolute(cwd)) return { ok: false, error: 'cwd must be an absolute path' };
  try {
    if (!statSync(cwd).isDirectory()) return { ok: false, error: 'cwd is not a directory' };
  } catch {
    return { ok: false, error: 'cwd does not exist' };
  }

  let task: string | undefined;
  if (b.task != null) {
    task = String(b.task);
    if (task.length > 500) return { ok: false, error: 'task must be ≤ 500 chars' };
    if (!task.trim()) task = undefined;
  }

  return { ok: true, opts: { sessionId, name, model: model as SpawnOpts['model'], cwd, task } };
}

export async function POST(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  if (!ALLOWED_ORIGINS.has(origin)) {
    return json({ error: 'forbidden: bad origin' }, 403);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: 'invalid JSON body' }, 400);
  }

  const v = validate(raw);
  if (!v.ok) return json({ error: v.error }, 400);

  try {
    const result = await spawnClaudeSession(v.opts);
    return json(result);
  } catch (e) {
    return json({ error: (e as Error)?.message ?? 'spawn failed' }, 500);
  }
}
