import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: [
<<<<<<< HEAD
      '.trycloudflare.com',
      '.ngrok-free.dev',
=======
      'transphysically-valorous-vanesa.ngrok-free.dev',
>>>>>>> bcc8c0c454eee9ac371939774e96b642ec9f5247
    ],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
<<<<<<< HEAD
        ws: true,
=======
>>>>>>> bcc8c0c454eee9ac371939774e96b642ec9f5247
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})