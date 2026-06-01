/**
 * Per-suite test setup.
 *
 * Routes ~/.claude reads at a fixtures directory so tests never touch the
 * developer's real home. `os.homedir()` honors `process.env.HOME` on POSIX
 * (and `USERPROFILE` on Windows), and both `lib/sessions-meta.ts` and
 * `lib/claude-logs.ts` call `os.homedir()` lazily on every invocation, so
 * pointing the env at our fixture dir is sufficient — no DI plumbing needed.
 */

import path from 'node:path';

const FIXTURE_HOME = path.resolve(__dirname, 'fixtures/claude-home-root');
process.env.HOME = FIXTURE_HOME;
process.env.USERPROFILE = FIXTURE_HOME;
