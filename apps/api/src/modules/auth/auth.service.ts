import argon2 from 'argon2';
import jwt, { SignOptions } from 'jsonwebtoken';
import { UserService } from '../user/user.service';
import { User } from '../user/user.entity';
import { RequiredEntityData } from '@mikro-orm/core';
import { LoginDto, RegisterDto } from './auth.dto';

export class AuthService {
    constructor(
        private readonly userService: UserService
    ) { }

    async register(dto: RegisterDto): Promise<User> {
        const existing = await this.userService.findByEmail(dto.email);
        if (existing) {
            throw new Error('User already exists');
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expiresIn: (process.env.JWT_ACCESS_EXPIRATION || '15m') as any,
        };
        const refreshOptions: SignOptions = {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expiresIn: (process.env.JWT_REFRESH_EXPIRATION || '7d') as any,
        };

        const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, accessOptions);
        const refreshToken = jwt.sign(payload, process.env.JWT_SECRET!, refreshOptions);

        return { accessToken, refreshToken };
    }

    async login(user: User) {
        const tokens = this.generateTokens(user);
        return tokens;
    }
}
