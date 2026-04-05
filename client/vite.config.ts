import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    base: '/tarot/',
    define: {
        'import.meta.env.VITE_BUILD_TIME': JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')),
    },
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
        open: process.env.PLAYWRIGHT !== '1',
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
        exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    },
});
