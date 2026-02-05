import redisClient from '../../config/redis';
import { winstonLogger } from '../../config/logger';

const REFRESH_TOKEN_PREFIX = 'refresh_token:';
const BLACKLIST_PREFIX = 'blacklist_token:';

export class RedisService {
    async setRefreshToken(userId: string, token: string, ttlSeconds: number): Promise<void> {
        try {
            await redisClient.set(`${REFRESH_TOKEN_PREFIX}${userId}`, token, { EX: ttlSeconds });
        } catch (error) {
            winstonLogger.error('Error setting refresh token in Redis', error);
            throw error;
        }
    }

    async getRefreshToken(userId: string): Promise<string | null> {
        return await redisClient.get(`${REFRESH_TOKEN_PREFIX}${userId}`);
    }

    async removeRefreshToken(userId: string): Promise<void> {
        await redisClient.del(`${REFRESH_TOKEN_PREFIX}${userId}`);
    }

    async blacklistToken(token: string, ttlSeconds: number): Promise<void> {
        await redisClient.set(`${BLACKLIST_PREFIX}${token}`, 'true', { EX: ttlSeconds });
    }

    async isTokenBlacklisted(token: string): Promise<boolean> {
        const result = await redisClient.get(`${BLACKLIST_PREFIX}${token}`);
        return result === 'true';
    }
}
