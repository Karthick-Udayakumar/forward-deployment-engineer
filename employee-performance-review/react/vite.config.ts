import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Listen on all addresses, so both http://localhost:5173 and http://127.0.0.1:5173 work
    host: true,
    port: 5173,
    strictPort: true,
  },
})
