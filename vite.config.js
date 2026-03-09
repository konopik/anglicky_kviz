import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// U v4 Tailwindu se doporučuje toto čisté nastavení
export default defineConfig({
  plugins: [react()],
})
