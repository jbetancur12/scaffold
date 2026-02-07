import { env } from './config/env';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import mikroConfig from '../mikro-orm.config';
import { winstonLogger } from './config/logger';
import { connectRedis } from './config/redis';
import { createAuthRoutes } from './modules/auth/auth.routes';
import { createUserRoutes } from './modules/user/user.routes';
import { createHealthRoutes } from './modules/health/health.routes';
import { createMrpRoutes } from './modules/mrp/mrp.routes';
import { rateLimit } from 'express-rate-limit';
import { errorHandler } from './shared/middleware/error.middleware';
import { setupSwagger } from './config/swagger';

const app = express();
const PORT = env.PORT;

app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
setupSwagger(app);

// Rate limiting - only in production
if (process.env.NODE_ENV === 'production') {
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        limit: 100, // Limit each IP to 100 requests per windowMs
        standardHeaders: 'draft-7',
        legacyHeaders: false,
    });
    app.use(limiter);
}


const main = async () => {
    try {
        const orm = await MikroORM.init(mikroConfig);

        // Sync schema in development
        if (process.env.NODE_ENV !== 'production') {
            const generator = orm.getSchemaGenerator();
            await generator.ensureDatabase();
            await generator.updateSchema();
            winstonLogger.info('Database schema synchronized');
        }

        winstonLogger.info('Database connected successfully');

        await connectRedis();

        // Dependency Injection Request Context
        app.use((_req, _res, next) => {
            RequestContext.create(orm.em, next);
        });

        // Routes
        app.use('/auth', createAuthRoutes(orm));
        app.use('/health', createHealthRoutes(orm));
        app.use('/users', createUserRoutes(orm));
        app.use('/mrp', createMrpRoutes(orm));

        app.get('/', (_req, res) => {
            res.json({ message: 'API is running' });
        });

        // Global Error Handler (Must be last)
        app.use(errorHandler);

        app.listen(PORT, () => {
            winstonLogger.info(`Server running on port ${PORT}`);
        });
    } catch (error) {
        winstonLogger.error('Error starting server:', error);
        process.exit(1);
    }
};

main();
