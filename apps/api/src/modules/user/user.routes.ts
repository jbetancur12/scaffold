import { Router } from 'express';
import { MikroORM } from '@mikro-orm/core';
import { authenticateToken } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRole } from '@scaffold/types';

export const createUserRoutes = (orm: MikroORM) => {
    const router = Router();
    const userService = new UserService(orm.em);
    const userController = new UserController(userService);

    // Get current user
    router.get('/me', authenticateToken, userController.getMe);

    // All user management routes require login and superadmin role
    router.use(authenticateToken);
    router.use(requireRole([UserRole.SUPERADMIN]));

    router.get('/', userController.list);
    router.get('/:id', userController.getById);
    router.post('/', userController.create);
    router.put('/:id', userController.update);
    router.delete('/:id', userController.delete);

    return router;
};
