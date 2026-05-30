import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// Separate port from admin-portal (5174) so both can run locally at once.
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    build: {
      sourcemap: false,
      minify: 'esbuild',
      target: 'es2022',
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('@supabase')) return 'supabase';
              if (id.includes('react-router')) return 'router';
            }
            return undefined;
          },
        },
      },
    },
    esbuild: isProd ? { drop: ['console', 'debugger'], legalComments: 'none' } : {},
    server: { port: 5175, strictPort: true },
    preview: { port: 4175, strictPort: true },
  };
});
