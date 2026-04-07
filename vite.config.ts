import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'inpaintPMS';
    const base = process.env.GITHUB_REPOSITORY ? `/${repoName}/` : '/inpaintPMS/';
    return {
      base,
      server: {
        port: 5173,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
