import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'; // Asegúrate de importar 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()], 
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // Alias para la carpeta src
      'app-control-horarios-frontend': path.resolve(__dirname, './src') // Alias para la carpeta src
    }
  },
})
