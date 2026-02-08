import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@scaffold/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
            '@scaffold/schemas': path.resolve(__dirname, '../../packages/schemas/src/index.ts'),
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 3000,
    }
});
