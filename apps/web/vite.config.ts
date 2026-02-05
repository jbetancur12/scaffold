import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@scaffold/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
            '@scaffold/schemas': path.resolve(__dirname, '../../packages/schemas/src/index.ts'),
        },
    },
    server: {
        port: 3000,
    }
});
