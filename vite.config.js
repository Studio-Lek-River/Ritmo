import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    VitePWA({
      // 'prompt' in plaats van 'autoUpdate': een nieuwe service worker blijft
      // wachten tot wij hem activeren. Zo herlaadt Ritmo alleen tijdens het
      // openingsscherm (zie src/utils/swUpdate.js) en nooit midden in een sessie,
      // waar dat de invoer van de gebruiker zou weggooien.
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      workbox: {
        // De serverless functions onder /api zijn geen onderdeel van de SPA. De
        // OAuth-callback wordt bovendien als top-level navigatie aangeroepen
        // (Microsoft redirect de browser erheen), en zonder deze denylist vangt
        // de navigateFallback die af en beantwoordt hem uit de cache met
        // index.html — het verzoek bereikt de server dan nooit.
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: 'Ritmo',
        short_name: 'Ritmo',
        description: 'Jouw dag, jouw ritme.',
        theme_color: '#0d9488',
        background_color: '#fafaf9',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'nl',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ]
});