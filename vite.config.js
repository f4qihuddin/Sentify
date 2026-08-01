import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      // Folder ini dapat berisi profil browser sementara dengan file yang
      // dikunci Chrome. Vite tidak perlu memantaunya sebagai source code.
      ignored: ['**/tmp/**', "**/src/model_api/**",],
    },
  },
})
