import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    // O navegador só conhece a 5173; /api é repassado ao NestJS.
    proxy: { '/api': 'http://localhost:3000' },
  },
})
