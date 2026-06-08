import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/modbus-library/',
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
})
