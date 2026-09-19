import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { serviceController } from './config/service-controller.ts'

export default defineConfig({
  plugins: [react(), serviceController()],
})
