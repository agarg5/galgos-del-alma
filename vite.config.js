import { defineConfig } from 'vite';

const devApiPort = process.env.DEV_API_PORT || 8787;

export default defineConfig({
  server: {
    proxy: {
      // Local stand-in for the Vercel serverless function (see dev-api.js)
      '/api': `http://localhost:${devApiPort}`,
    },
  },
});
