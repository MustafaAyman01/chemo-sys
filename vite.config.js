import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor':   ['react', 'react-dom', 'react-router-dom'],
          'supabase':       ['@supabase/supabase-js'],
          'charts':         ['recharts'],
          'query':          ['@tanstack/react-query'],
          'table':          ['@tanstack/react-table'],
          'forms':          ['react-hook-form', 'zod', '@hookform/resolvers'],
          'state':          ['zustand'],
        },
      },
    },
  },
})
