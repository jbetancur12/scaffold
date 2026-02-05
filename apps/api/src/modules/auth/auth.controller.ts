import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginSchema, RegisterSchema } from './auth.dto';
import { RedisService } from '../../shared/services/redis.service';
import { ApiResponse, AppError } from '../../shared/utils/response';
import { asyncHandler } from '../../shared/middleware/error.middleware';
import { eventEmitter, APP_EVENTS } from '../../shared/services/event-emitter.service';

export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly redisService: RedisService
    ) { }

    register = asyncHandler(async (req: Request, res: Response) => {
        const dto = RegisterSchema.parse(req.body);
        const user = await this.authService.register(dto);
        return ApiResponse.success(res, { id: user.id, email: user.email }, 'Registro exitoso', 201);
    });

    login = asyncHandler(async (req: Request, res: Response) => {
        const { email, password } = LoginSchema.parse(req.body);

        const user = await this.authService.validateUser({ email, password });
        if (!user) {
            throw new AppError('Credenciales inválidas', 401);
        }

        const { accessToken, refreshToken } = await this.authService.login(user);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        eventEmitter.emitSafe(APP_EVENTS.USER_LOGGED_IN, { userId: user.id, email: user.email });

        return ApiResponse.success(res, {
            accessToken,
            user: { id: user.id, email: user.email, role: user.role }
        }, 'Login exitoso');
    });

    refresh = asyncHandler(async (req: Request, res: Response) => {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            throw new AppError('No hay token de actualización', 401);
        }

        const decoded = this.authService.verifyToken(refreshToken);
        if (!decoded) {
            throw new AppError('Token de actualización inválido', 401);
        }

        // Check if blacklisted
        const isBlacklisted = await this.redisService.get(`blacklist:${refreshToken}`);
        if (isBlacklisted) {
            throw new AppError('Token revocado', 401);
        }

        const user = await this.authService.getUserByEmail(decoded.email);
        if (!user) {
            throw new AppError('Usuario no encontrado', 404);
        }

        const tokens = this.authService.generateTokens(user);

        return ApiResponse.success(res, { accessToken: tokens.accessToken }, 'Token actualizado');
    });

    logout = asyncHandler(async (req: Request, res: Response) => {
        const refreshToken = req.cookies.refreshToken;
        if (refreshToken) {
            // Blacklist the refresh token for its remaining life (roughly 7 days)
            await this.redisService.set(`blacklist:${refreshToken}`, 'true', 3600 * 24 * 7);
        }

        res.clearCookie('refreshToken');
        return ApiResponse.success(res, null, 'Sesión cerrada');
    });
}
