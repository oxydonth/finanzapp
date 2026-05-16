import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environmentMatchGlobs: [
      ['src/__tests__/components/**', 'jsdom'],
      ['src/__tests__/store/**', 'jsdom'],
      ['**/*.component.test.ts', 'jsdom'],
      ['**/*.component.test.tsx', 'jsdom'],
    ],
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
