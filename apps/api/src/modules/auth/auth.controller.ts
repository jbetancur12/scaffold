import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginSchema, RegisterSchema } from './auth.dto';
import { winstonLogger } from '../../config/logger';
import { RedisService } from '../../shared/services/redis.service'; // Added for logout

export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly redisService: RedisService
    ) { }

    register = async (req: Request, res: Response) => {
        try {
            const dto = RegisterSchema.parse(req.body);
            const user = await this.authService.register(dto);
            res.status(201).json({ id: user.id, email: user.email });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error registering user';
            winstonLogger.error('Register error', error);
            res.status(400).json({ message: errorMessage });
        }
    };

    login = async (req: Request, res: Response) => {
        try {
            const dto = LoginSchema.parse(req.body);
            const user = await this.authService.validateUser(dto);
            if (!user) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            const { accessToken, refreshToken } = await this.authService.login(user);

            // HttpOnly Cookie for Refresh Token
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });

            res.json({ accessToken, user: { id: user.id, email: user.email, role: user.role } });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error logging in';
            winstonLogger.error('Login error', error);
            res.status(400).json({ message: errorMessage });
        }
    };

    logout = async (req: Request, res: Response) => {
        const refreshToken = req.cookies.refreshToken;
        if (refreshToken) {
            // Blacklist the refresh token
            // Decode to get exp? Or just default TTL.
            // For simplicity, verify signature and get exp.
            // Or just set strict TTL (e.g. 7 days).
            await this.redisService.blacklistToken(refreshToken, 7 * 24 * 60 * 60);
        }
        res.clearCookie('refreshToken');
        res.json({ message: 'Logged out successfully' });
    };

    // refreshToken endpoint needed as well
}
