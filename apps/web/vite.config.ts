import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), tsconfigPaths()],
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
