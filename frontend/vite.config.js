import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Явный путь помогает при кириллице в пути проекта и сбоях dependency scan в Vite
    alias: {
      'lucide-react': path.resolve(__dirname, 'node_modules/lucide-react'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: false,
  },
  optimizeDeps: {
    include: ['lucide-react'],
  },
  build: {
    target: 'es2020',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('docx-preview')) return 'docx-preview';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('react-dom') || id.includes('react-router')) return 'react-vendor';
          if (id.includes('react')) return 'react-core';
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
})
