import { Router, Response } from 'express';
import { MikroORM } from '@mikro-orm/core';
import { authenticateToken, AuthRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserService } from './user.service';
import { UserRole } from '@scaffold/types';

export const createUserRoutes = (orm: MikroORM) => {
    const router = Router();
    const userService = new UserService(orm.em);

    // Get current user
    router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
        if (!req.user) return res.sendStatus(401);
        const user = await userService.findByEmail(req.user.email);
        res.json(user);
    });

    // All user management routes require superadmin role
    router.use(authenticateToken);
    router.use(requireRole([UserRole.SUPERADMIN]));

    // List all users
    router.get('/', async (req, res, next) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            const result = await userService.listUsers(page, limit);
            res.json(result);
        } catch (error) {
            next(error);
        }
    });

    // Get user by ID
    router.get('/:id', async (req, res, next) => {
        try {
            const user = await userService.findById(req.params.id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.json(user);
        } catch (error) {
            next(error);
        }
    });

    // Create new user
    router.post('/', async (req, res, next) => {
        try {
            const { email, password, role } = req.body;

            if (!email || !password || !role) {
                return res.status(400).json({ message: 'Email, password, and role are required' });
            }

            const user = await userService.createUser({ email, password, role });
            res.status(201).json(user);
        } catch (error) {
            next(error);
        }
    });

    // Update user
    router.put('/:id', async (req, res, next) => {
        try {
            const { email, password, role } = req.body;
            const user = await userService.updateUser(req.params.id, { email, password, role });
            res.json(user);
        } catch (error) {
            next(error);
        }
    });

    // Delete user
    router.delete('/:id', async (req, res, next) => {
        try {
            await userService.deleteUser(req.params.id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    });

    return router;
};
