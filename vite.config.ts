import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' — 相对路径产物，可直接部署到 GitHub Pages 等任意子路径静态托管
export default defineConfig({
  plugins: [react()],
  base: './',
})
