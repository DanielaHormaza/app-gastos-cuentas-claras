import { defineConfig } from 'vite'
import { readFileSync } from 'fs'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// La versión sale de package.json (semver). Para una nueva release: bump de "version" ahí.
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

// Vite + React + Tailwind v4 (sin tailwind.config.js: Tailwind v4 se configura desde el CSS)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
})
