import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@scaffold/types': '../../packages/types/src/index.ts',
            '@scaffold/schemas': '../../packages/schemas/src/index.ts',
            '@': './src',
        },
    },
    server: {
        port: 3000,
    }
});
