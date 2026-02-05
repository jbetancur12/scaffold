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

    // router.post('/register', (req, res) => authController.register(req, res));
    router.post('/login', (req, res) => authController.login(req, res));
    router.post('/logout', (req, res) => authController.logout(req, res));

    return router;
};
