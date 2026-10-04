import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.jpg', '_redirects'],
      manifest: {
        name: 'mybiz POS System',
        short_name: 'mybiz',
        description: 'Offline-first POS system for retail',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'icon.jpg',
            sizes: '192x192',
            type: 'image/jpeg'
          },
          {
            src: 'icon.jpg',
            sizes: '512x512',
            type: 'image/jpeg'
          }
        ]
      }
    })
  ],
})