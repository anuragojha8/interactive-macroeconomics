import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  // "Show the code" prints `compute.toString()`. Minified identifiers would
  // keep it honest and make it useless, so they are kept.
  esbuild: { minifyIdentifiers: false },
  // The coverage report is thousands of generated HTML files; watching it makes
  // every test run look like a source change.
  server: { watch: { ignored: ['**/coverage/**', '**/test-results/**', '**/dist/**'] } },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
    coverage: {
      provider: 'v8',
      include: ['src/engine/**', 'src/models/**'],
      exclude: ['src/engine/index.ts'],
      thresholds: { lines: 95, branches: 95, functions: 95, statements: 95 },
    },
  },
});
