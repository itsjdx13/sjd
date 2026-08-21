import { defineConfig } from 'vitest/config';

export default defineConfig({
  optimizeDeps: { noDiscovery: true },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    pool: 'vmThreads'
  }
});
