import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// Hardening per BRIEFING.md § 4 (banned list) + § 7-L2 (no source maps in prod):
// - sourcemap: false (never publish source maps)
// - minify: true
// - drop console / debugger statements in prod build
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    build: {
      sourcemap: false,
      minify: 'esbuild',
      target: 'es2022',
      // Aim for chunks <500KB so Cloudflare Pages serves the first paint fast.
      // Tremor + recharts + d3 are the big offenders — split them. recharts
      // and d3 are separately huge, so each gets its own chunk. React/router
      // stay together so the first paint is one small chunk.
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('@tremor') || id.includes('recharts')) return 'recharts';
              if (id.includes('d3-')) return 'd3';
              if (id.includes('@supabase')) return 'supabase';
              if (id.includes('@sentry')) return 'sentry';
              if (id.includes('posthog-js')) return 'posthog';
              if (id.includes('react-router')) return 'router';
            }
            return undefined;
          },
        },
      },
      chunkSizeWarningLimit: 700,
    },
    esbuild: isProd
      ? {
          drop: ['console', 'debugger'],
          legalComments: 'none',
        }
      : {},
    server: {
      port: 5174,
      strictPort: true,
    },
    preview: {
      port: 4174,
      strictPort: true,
    },
  };
});
