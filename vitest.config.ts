import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: { alias: {
    '@': fileURLToPath(new URL('./src', import.meta.url)),
    'virtual:pwa-register': fileURLToPath(new URL('./src/test/pwa-register-stub.ts', import.meta.url)),
  } },
  optimizeDeps: { noDiscovery: true },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    pool: 'vmThreads'
  }
});
