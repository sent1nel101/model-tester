import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // Take full control of response handling so SSE streams are forwarded
        // immediately without http-proxy's default pipe() which can buffer/close.
        selfHandleResponse: true,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes, _req, res) => {
            const headers: Record<string, string | string[] | undefined> = { ...proxyRes.headers };

            // For SSE, strip headers that cause buffering
            if (headers['content-type']?.toString().includes('text/event-stream')) {
              delete headers['content-encoding'];
              delete headers['content-length'];
            }

            res.writeHead(proxyRes.statusCode || 200, headers as any);

            // Forward every chunk immediately (avoids pipe buffering)
            proxyRes.on('data', (chunk: Buffer) => {
              res.write(chunk);
            });
            proxyRes.on('end', () => {
              res.end();
            });
            proxyRes.on('error', () => {
              res.end();
            });
          });
        },
      },
    },
  },
})
