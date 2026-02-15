import argon2 from 'argon2';
import jwt, { SignOptions } from 'jsonwebtoken';
import { UserService } from '../user/user.service';
import { User } from '../user/user.entity';
import { RequiredEntityData } from '@mikro-orm/core';
import type { LoginDto, RegisterDto } from '@scaffold/schemas';
import { AppError } from '../../shared/utils/response';

export class AuthService {
    constructor(
        private readonly userService: UserService
    ) { }

    async register(dto: RegisterDto): Promise<User> {
        const existing = await this.userService.findByEmail(dto.email);
        if (existing) {
            throw new AppError('Ya existe un usuario con ese email', 409);
        }
        return this.userService.create(dto as unknown as RequiredEntityData<User>);
    }

    async validateUser(dto: LoginDto): Promise<User | null> {
        const user = await this.userService.findByEmail(dto.email);
        if (!user) return null;

        const valid = await argon2.verify(user.password, dto.password);
        if (!valid) return null;

        return user;
    }

    generateTokens(user: User) {
        const payload = { id: user.id, email: user.email, role: user.role };
        const accessOptions: SignOptions = {
            expiresIn: (process.env.JWT_ACCESS_EXPIRATION || '15m') as SignOptions['expiresIn'],
        };
        const refreshOptions: SignOptions = {
            expiresIn: (process.env.JWT_REFRESH_EXPIRATION || '7d') as SignOptions['expiresIn'],
        };

        const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, accessOptions);
        const refreshToken = jwt.sign(payload, process.env.JWT_SECRET!, refreshOptions);

        return { accessToken, refreshToken };
    }

    async login(user: User) {
        return this.generateTokens(user);
    }

    async getUserByEmail(email: string) {
        return this.userService.findByEmail(email);
    }

    verifyToken(token: string) {
        try {
            return jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;
        } catch (error) {
            return null;
        }
    }
}
