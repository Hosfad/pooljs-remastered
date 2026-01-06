import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
  },


  server: {
    port: 3000,
    allowedHosts: ["dev.osrsplus.fun"],
    proxy: {
      '/api': {
        target: 'http://localhost:6969',
        changeOrigin: true,
        secure: true,
        ws: true,
        rewrite: path => path.replace(/^\/api/, '')
      }
    },
  },
  plugins: [tailwindcss()],
});
