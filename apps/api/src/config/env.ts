import { config } from 'dotenv';
import { join } from 'path';

// Load .env from monorepo root
// When running with ts-node-dev, cwd is the workspace root (apps/api)
// So we need to go up two levels to reach the monorepo root
config({ path: join(process.cwd(), '../../.env') });

import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.preprocess(
        () => process.env.API_PORT || process.env.PORT || '5050',
        z.string().transform(Number)
    ),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRATION: z.string().default('15m'),
    JWT_REFRESH_EXPIRATION: z.string().default('7d'),
    FRONTEND_URL: z.string().url().default('http://localhost:3000'),
    CORS_ORIGIN: z.string().optional(),
    STORAGE_PROVIDER: z.enum(['local', 'minio']).default('local'),
    MINIO_ENDPOINT: z.string().url().optional(),
    MINIO_ACCESS_KEY: z.string().optional(),
    MINIO_SECRET_KEY: z.string().optional(),
    MINIO_BUCKET: z.string().default('mrp-quality-documents'),

});

const validateEnv = () => {
    try {
        return envSchema.parse(process.env);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const missing = error.errors
                .map((err) => `${err.path.join('.')}: ${err.message}`)
                .join('\n');
            console.error('❌ Invalid environment variables:\n', missing);
        } else {
            console.error('❌ Error validating environment variables:', error);
        }
        process.exit(1);
    }
};

export const env = validateEnv();
