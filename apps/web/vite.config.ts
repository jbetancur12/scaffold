import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const typePath = path.resolve(__dirname, '../../packages/types/src/index.ts');

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, path.resolve(__dirname, '../..'), '');
    return {
        plugins: [react()],
        resolve: {
            alias: {
                '@scaffold/types': typePath,
                '@scaffold/schemas': path.resolve(__dirname, '../../packages/schemas/src/index.ts'),
                '@': path.resolve(__dirname, './src'),
            },
        },
        server: {
            port: 3000,
            host: true, // Permite conexiones externas (útil para Docker)
            // ⭐ Proxy para desarrollo - redirige /api a tu backend
            proxy: {
                '/api': {
                    target: process.env.VITE_API_URL || 'http://localhost:5050',
                    changeOrigin: true,
                    secure: false,
                    // rewrite: (path) => path.replace(/^\/api/, ''), // Si tu API no tiene /api prefix
                },
            },
        },
        // ⭐ Configuración de build para producción
        build: {
            outDir: 'dist',
            sourcemap: process.env.NODE_ENV !== 'production', // Sourcemaps solo en dev
            minify: 'esbuild', // Minificación rápida
            // ⭐ Optimización de chunks
            rollupOptions: {
                output: {
                    manualChunks: {
                        // Separa vendors grandes en chunks individuales
                        'react-vendor': ['react', 'react-dom'],
                        'router-vendor': ['react-router-dom'],
                        // Añade más si usas librerías pesadas como:
                        // 'ui-vendor': ['@mui/material', '@emotion/react'],
                        // 'form-vendor': ['react-hook-form', 'zod'],
                    },
                },
            },
            // ⭐ Chunk size warnings
            chunkSizeWarningLimit: 1000, // KB
        },
        // ⭐ Configuración de preview (para probar el build localmente)
        preview: {
            port: 3000,
            host: true,
        },
        // ⭐ Optimización de dependencias
        optimizeDeps: {
            include: ['@scaffold/types', '@scaffold/schemas'],
        },
    }
});