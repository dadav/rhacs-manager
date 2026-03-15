import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'vendor', test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/ },
            { name: 'patternfly', test: /[\\/]node_modules[\\/]@patternfly[\\/](react-core|react-icons)[\\/]/ },
            { name: 'charts', test: /[\\/]node_modules[\\/]recharts[\\/]/ },
            { name: 'query', test: /[\\/]node_modules[\\/]@tanstack[\\/]react-query[\\/]/ },
          ],
        },
      },
    },
  },
})
