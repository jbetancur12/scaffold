import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { UserRole } from '@scaffold/types';

export const requireRole = (roles: UserRole[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role as UserRole)) {
            return res.sendStatus(403);
        }
        next();
    };
};
