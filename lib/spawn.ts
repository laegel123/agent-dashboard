/**
 * Cross-platform "open a new terminal and run claude" launcher.
 *
 * Uses the OS shell convention to spawn an *interactive* terminal — we want
 * the user to see the session, not a backgrounded child of our server. The new
 * terminal then `cd`s to cwd and runs:
 *
 *   claude --name <name> --model <alias> --session-id <uuid> [task]
 *
 * `--session-id <uuid>` makes the placement deterministic — the resulting
 * .jsonl file is named after the UUID, so the dashboard's optimistic
 * placeholder card can reconcile by exact match (ADR-014, v3.4).
 *
 * Arg safety:
 *   - macOS: osascript runs an AppleScript string; we shell-quote each arg
 *     before embedding, then AppleScript-escape the outer string.
 *   - Linux: spawn(terminal, [...args]) — Node passes args as a vector,
 *     bypassing shell parsing.
 *   - Windows: cmd /c start uses a quoted command line; each arg is quoted.
 */

import { spawn } from 'node:child_process';

export interface SpawnOpts {
  cwd: string;
  name: string;
  model: 'opus' | 'sonnet' | 'haiku';
  sessionId: string;
  task?: string;
}

export interface SpawnResult {
  ok: true;
  method: string;
}

const cmdArgs = (opts: SpawnOpts): string[] => [
  '--name', opts.name,
  '--model', opts.model,
  '--session-id', opts.sessionId,
  ...(opts.task ? [opts.task] : []),
];

// POSIX single-quote escape: ' → '\''
const sqPosix = (s: string): string => `'${s.replace(/'/g, `'\\''`)}'`;

// Windows double-quote escape: " → \", wrap if contains whitespace or quotes
const dqWin = (s: string): string =>
  /["\s]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s;

export async function spawnClaudeSession(opts: SpawnOpts): Promise<SpawnResult> {
  const args = cmdArgs(opts);

  if (process.platform === 'win32') {
    const cmdline = ['claude', ...args].map(dqWin).join(' ');
    // `start "" cmd /k <cmdline>` opens a new console window that stays open.
    const child = spawn('cmd', ['/c', 'start', '""', 'cmd', '/k', cmdline], {
      cwd: opts.cwd,
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    return { ok: true, method: 'win32-start-cmd' };
  }

  if (process.platform === 'darwin') {
    const cmdline = `cd ${sqPosix(opts.cwd)} && claude ${args.map(sqPosix).join(' ')}`;
    // AppleScript wraps the cmdline in double quotes; escape embedded ".
    const dq = cmdline.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const script = `tell application "Terminal" to do script "${dq}"`;
    const child = spawn('osascript', ['-e', script], { detached: true, stdio: 'ignore' });
    child.unref();
    return { ok: true, method: 'macos-osascript' };
  }

  // Linux — try the user's preferred terminal first, then common fallbacks.
  const candidates = [
    process.env.TERMINAL,
    'gnome-terminal',
    'x-terminal-emulator',
    'konsole',
    'xfce4-terminal',
    'xterm',
  ].filter((x): x is string => !!x);

  for (const term of candidates) {
    try {
      const child = spawn(term, ['--working-directory', opts.cwd, '--', 'claude', ...args], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      return { ok: true, method: `linux-${term}` };
    } catch {
      continue;
    }
  }

  throw new Error('No terminal emulator found (set $TERMINAL or install gnome-terminal/konsole/xterm)');
}
