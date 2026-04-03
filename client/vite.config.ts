import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    base: '/tarot/',
    resolve: {
        alias: {
            '@shared': resolve(__dirname, '../shared'),
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
    },
    server: {
        port: 3000,
        open: true,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8787',
                changeOrigin: true,
            },
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
    },
});
