import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    // Os decorators emitem metadados via Reflect; no app quem carrega o polyfill é o próprio Nest.
    setupFiles: ['reflect-metadata'],
  },
});
