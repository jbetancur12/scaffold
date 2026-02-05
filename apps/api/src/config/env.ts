import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.string().transform(Number).default('5000'),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRATION: z.string().default('15m'),
    JWT_REFRESH_EXPIRATION: z.string().default('7d'),
    FRONTEND_URL: z.string().url().default('http://localhost:3000'),
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
