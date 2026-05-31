/**
 * POST /api/open-folder — open the agent's cwd in the OS file manager.
 * Origin-checked like /api/spawn (ADR-015).
 */

import { statSync } from 'node:fs';
import path from 'node:path';
import { openFolder } from '@/lib/open-folder';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_ORIGINS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export async function POST(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  if (!ALLOWED_ORIGINS.has(origin)) return json({ error: 'forbidden: bad origin' }, 403);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: 'invalid JSON body' }, 400);
  }

  const cwd = String((raw as { cwd?: unknown } | null)?.cwd ?? '');
  if (!cwd || !path.isAbsolute(cwd)) return json({ error: 'cwd must be an absolute path' }, 400);
  try {
    if (!statSync(cwd).isDirectory()) return json({ error: 'cwd is not a directory' }, 400);
  } catch {
    return json({ error: 'cwd does not exist' }, 400);
  }

  try {
    const result = await openFolder(cwd);
    return json(result);
  } catch (e) {
    return json({ error: (e as Error)?.message ?? 'open-folder failed' }, 500);
  }
}
