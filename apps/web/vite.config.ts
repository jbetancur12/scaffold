import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), tsconfigPaths()],
    resolve: {
        alias: {
            '@scaffold/types': '/app/packages/types/src/index.ts',
            '@scaffold/schemas': '/app/packages/schemas/src/index.ts',
            '@': '/app/apps/web/src',
        },
    },
    optimizeDeps: {
        include: ['@scaffold/types', '@scaffold/schemas'],
    },
    server: {
        port: 3000,
    }
});
