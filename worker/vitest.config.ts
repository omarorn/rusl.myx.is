import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run tests in src/__tests__/
    include: ['src/__tests__/**/*.test.ts'],
    // Use Node environment for pure function tests
    environment: 'node',
  },
});
