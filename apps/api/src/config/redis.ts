import { createClient } from 'redis';
import { winstonLogger } from './logger';

const redisClient = createClient({
    url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
});

redisClient.on('error', (err) => winstonLogger.error('Redis Client Error', err));

export const connectRedis = async () => {
    await redisClient.connect();
    winstonLogger.info('Redis connected');
};

export default redisClient;
