import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Trasshy - Ruslaflokkun',
        short_name: 'trash.myx.is',
        description: 'Greindu rusl með myndavélinni og finndu rétta tunnuna á Íslandi',
        theme_color: '#16a34a',
        background_color: '#1f2937',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Runtime caching strategies
        runtimeCaching: [
          {
            // Cache quiz images
            urlPattern: /\/api\/quiz\/image\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'quiz-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache static quiz data
            urlPattern: /\/api\/quiz\/(random|leaderboard)/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'quiz-data',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              networkTimeoutSeconds: 5,
            },
          },
          {
            // Don't cache identify API (needs fresh results)
            urlPattern: /\/api\/identify/i,
            handler: 'NetworkOnly',
          },
          {
            // Cache stats with network first
            urlPattern: /\/api\/stats/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'stats-data',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 10, // 10 minutes
              },
              networkTimeoutSeconds: 3,
            },
          },
        ],
      },
    })
  ],
  server: { host: true, port: 5173 }
});
