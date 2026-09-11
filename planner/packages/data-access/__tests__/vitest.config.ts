import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['packages/**/__tests__/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@shared/types': resolve(__dirname, 'packages/shared-types/index.ts'),
    },
  },
});