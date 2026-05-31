/**
 * Open a folder in the OS file manager / editor.
 *
 * Uses `spawn` with array args (no shell) so the path can't be interpreted
 * as shell syntax even if it contains spaces, quotes, or `;`/`&` etc.
 */

import { spawn } from 'node:child_process';

export interface OpenFolderResult {
  ok: true;
  method: string;
}

export async function openFolder(cwd: string): Promise<OpenFolderResult> {
  if (process.platform === 'darwin') {
    spawn('open', [cwd], { detached: true, stdio: 'ignore' }).unref();
    return { ok: true, method: 'macos-open' };
  }

  if (process.platform === 'win32') {
    // `start "" <path>` — the empty "" is the window title (required when path is quoted).
    spawn('cmd', ['/c', 'start', '""', cwd], { detached: true, stdio: 'ignore' }).unref();
    return { ok: true, method: 'win32-start' };
  }

  // Linux / others
  spawn('xdg-open', [cwd], { detached: true, stdio: 'ignore' }).unref();
  return { ok: true, method: 'linux-xdg-open' };
}
