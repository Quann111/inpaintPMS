import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'inpaintPMSv3';
    const base = process.env.GITHUB_REPOSITORY ? `/${repoName}/` : '/';
    return {
      base,
      server: {
        port: 5173,
        host: '0.0.0.0',
        proxy: {
          '/api-tramsangtao': {
            target: 'https://api.tramsangtao.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api-tramsangtao/, '')
          },
          '/gcs': {
            target: 'https://storage.googleapis.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/gcs/, '')
          },
          '/cdn-tramsangtao': {
            target: 'https://cdn.tramsangtao.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/cdn-tramsangtao/, '')
          }
        }
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
