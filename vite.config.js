import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ⚠️ Imposta qui il nome del tuo repository GitHub
// Es: se il repo è github.com/schneider-it/modbus-library → base: '/modbus-library/'
export default defineConfig({
  plugins: [react()],
  base: '/modbus-library/',
})
