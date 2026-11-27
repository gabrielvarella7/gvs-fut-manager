import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { vitePluginAssistente } from './src/vite-plugin-assistente'
import { vitePluginSyncNuvem } from './src/vite-plugin-sync-nuvem'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), tailwindcss(), vitePluginSyncNuvem(), vitePluginAssistente()],
})
