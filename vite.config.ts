import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // ścieżki względne – działa pod dowolnym adresem (np. GitHub Pages /kuznia/)
  base: './',
  build: { target: ['safari15', 'es2020'] },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'favicon.svg'],
      manifest: {
        name: 'Kuźnia – trening i dieta',
        short_name: 'Kuźnia',
        description: 'Darmowy dziennik treningowy i dietetyczny oparty na badaniach.',
        lang: 'pl',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f0e0d',
        theme_color: '#e4572e',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,json}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  server: { host: true },
  preview: { host: true },
})
