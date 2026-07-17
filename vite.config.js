import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      // Local stand-in for the Vercel serverless function (see dev-api.js)
      '/api': 'http://localhost:8787',
    },
  },
});
