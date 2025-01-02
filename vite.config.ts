/// <reference types="vitest/config"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss()]
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    css: false,
    include: ['./src/**/*.test.ts', './src/**/*.test.tsx'],
  },
})
