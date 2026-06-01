import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(process.cwd()) },
  },
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    setupFiles: ['./test/setup.ts'],
    // Component tests opt-in to jsdom via `// @vitest-environment jsdom` per file.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['lib/**/*.ts', 'app/api/**/*.ts'],
      exclude: ['lib/mock-data.ts', 'lib/types.ts', 'lib/status-meta.ts'],
      thresholds: {
        'lib/**/*.ts': { lines: 80, functions: 90 },
        'app/api/**/*.ts': { lines: 70 },
      },
    },
  },
});
