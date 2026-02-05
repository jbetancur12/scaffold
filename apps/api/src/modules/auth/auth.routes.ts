import { Router } from 'express';
import { MikroORM } from '@mikro-orm/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { RedisService } from '../../shared/services/redis.service';

export const createAuthRoutes = (orm: MikroORM) => {
    const router = Router();
    const redisService = new RedisService();
    const userService = new UserService(orm.em);
    const authService = new AuthService(userService);
    const authController = new AuthController(authService, redisService);

    // router.post('/register', authController.register);
    router.post('/login', authController.login);
    router.post('/refresh', authController.refresh);
    router.post('/logout', authController.logout);

    return router;
};
