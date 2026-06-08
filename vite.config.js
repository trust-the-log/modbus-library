import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'write-version',
      buildStart() {
        fs.writeFileSync(
          'public/version.json',
          JSON.stringify({ date: new Date().toISOString() })
        );
      }
    }
  ],
  base: '/modbus-library/',
})
