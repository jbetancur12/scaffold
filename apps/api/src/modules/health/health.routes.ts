import { Router } from 'express';
import { MikroORM } from '@mikro-orm/core';
import redisClient from '../../config/redis';
import { ApiResponse } from '../../shared/utils/response';

export const createHealthRoutes = (orm: MikroORM) => {
    const router = Router();

    router.get('/', async (_req, res) => {
        const health = {
            status: 'OK',
            timestamp: new Date().toISOString(),
            services: {
                database: 'Unknown',
                redis: 'Unknown'
            }
        };

        try {
            // Check Database
            const isConnected = await orm.isConnected();
            health.services.database = isConnected ? 'Connected' : 'Disconnected';

            // Check Redis
            const isRedisReady = redisClient.isReady;
            health.services.redis = isRedisReady ? 'Connected' : 'Disconnected';

            const overallHealth = isConnected && isRedisReady;
            return ApiResponse.result(
                res,
                overallHealth,
                health,
                overallHealth ? 'System is healthy' : 'System is impaired',
                overallHealth ? 200 : 503
            );
        } catch (error) {
            return ApiResponse.error(res, 'Health check failed', 503);
        }
    });

    return router;
};
