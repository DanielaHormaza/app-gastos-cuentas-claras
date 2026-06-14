import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite + React + Tailwind v4 (sin tailwind.config.js: Tailwind v4 se configura desde el CSS)
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
