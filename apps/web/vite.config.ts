import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Definimos __dirname para módulos ESM (necesario en vite.config.ts)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. Rutas absolutas a los paquetes compartidos
const typesSrc = path.resolve(__dirname, '../../packages/types/src/index.ts');
const schemasSrc = path.resolve(__dirname, '../../packages/schemas/src/index.ts');

export default defineConfig(({ mode }) => {
    // Cargar variables de entorno desde la raíz del monorepo si es necesario
    const env = loadEnv(mode, path.resolve(__dirname, '../..'), '');

    return {
        plugins: [react()],
        resolve: {
            alias: {
                // ✅ ESTO ES LO QUE ARREGLA EL ERROR
                // Forzamos a Vite a leer el TypeScript crudo, ignorando el CommonJS dist
                '@scaffold/types': typesSrc,
                '@scaffold/schemas': schemasSrc,
                '@': path.resolve(__dirname, './src'),
            },
        },
        server: {
            port: 3000,
            host: true,
            proxy: {
                '/api': {
                    target: env.VITE_API_URL || 'http://localhost:5050',
                    changeOrigin: true,
                    secure: false,
                },
            },
        },
        build: {
            outDir: 'dist',
            sourcemap: mode !== 'production',
            minify: 'esbuild',
            rollupOptions: {
                output: {
                    manualChunks: {
                        'react-vendor': ['react', 'react-dom'],
                        'router-vendor': ['react-router-dom'],
                    },
                },
            },
        },
        // ⚠️ IMPORTANTE: 
        // Eliminé 'optimizeDeps.include' para los paquetes locales.
        // Al usar alias a 'src', Vite los procesará mejor sin pre-optimización.
        optimizeDeps: {
            // Si usas librerías externas raras, agrégalas aquí, 
            // pero NO tus paquetes locales @scaffold/*
        },
    };
});
