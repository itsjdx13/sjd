import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Northstar — Personal Finance',
        short_name: 'Northstar',
        description: 'Private, local-first portfolio and net-worth dashboard.',
        theme_color: '#0b0d0f',
        background_color: '#f4f5f1',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.coingecko\.com\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'crypto-quotes', expiration: { maxAgeSeconds: 3600, maxEntries: 20 }, networkTimeoutSeconds: 4 }
          },
          {
            urlPattern: /^https:\/\/api\.(frankfurter\.dev|gold-api\.com)\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'market-quotes', expiration: { maxAgeSeconds: 86400, maxEntries: 30 }, networkTimeoutSeconds: 4 }
          }
        ]
      }
    })
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { target: 'es2022', cssMinify: 'lightningcss' }
});
