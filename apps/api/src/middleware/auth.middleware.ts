import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { winstonLogger } from '../config/logger';

export interface AuthUser extends JwtPayload {
    role: string;
    email: string;
    id: string;
}

export interface AuthRequest extends Request {
    user?: AuthUser;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET as string, (err: unknown, user: unknown) => {
        if (err) {
            winstonLogger.warn('Invalid token', err);
            return res.sendStatus(403);
        }
        req.user = user as AuthUser;
        next();
    });
};
