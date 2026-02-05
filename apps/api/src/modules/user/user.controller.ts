import { Request, Response } from 'express';
import { UserService } from './user.service';
import { ApiResponse, AppError } from '../../shared/utils/response';
import { asyncHandler } from '../../shared/middleware/error.middleware';
import { AuthRequest } from '../../middleware/auth.middleware';

export class UserController {
    constructor(private readonly userService: UserService) { }

    getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
        if (!req.user) throw new AppError('No autenticado', 401);
        const user = await this.userService.findByEmail(req.user.email);
        return ApiResponse.success(res, user);
    });

    list = asyncHandler(async (req: Request, res: Response) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const { users, total } = await this.userService.listUsers(page, limit);
        return ApiResponse.pagination(res, users, total, page, limit);
    });

    getById = asyncHandler(async (req: Request, res: Response) => {
        const user = await this.userService.findById(req.params.id);
        if (!user) throw new AppError('Usuario no encontrado', 404);
        return ApiResponse.success(res, user);
    });

    create = asyncHandler(async (req: Request, res: Response) => {
        const { email, password, role } = req.body;
        if (!email || !password || !role) {
            throw new AppError('Email, contraseña y rol son requeridos', 400);
        }
        const user = await this.userService.createUser({ email, password, role });
        return ApiResponse.success(res, user, 'Usuario creado', 201);
    });

    update = asyncHandler(async (req: Request, res: Response) => {
        const user = await this.userService.updateUser(req.params.id, req.body);
        return ApiResponse.success(res, user, 'Usuario actualizado');
    });

    delete = asyncHandler(async (req: Request, res: Response) => {
        await this.userService.deleteUser(req.params.id);
        return ApiResponse.success(res, null, 'Usuario eliminado', 200);
    });
}
