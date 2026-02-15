import { EntityManager, EntityRepository, RequiredEntityData } from '@mikro-orm/core';
import { User } from './user.entity';
import type { CreateUserDto, UpdateUserDto } from '@scaffold/schemas';
import argon2 from 'argon2';
import { winstonLogger } from '../../config/logger';

export class UserService {
    private readonly em: EntityManager;
    private readonly userRepository: EntityRepository<User>;

    constructor(em: EntityManager) {
        this.em = em;
        this.userRepository = em.getRepository(User);
    }

    async create(data: RequiredEntityData<User>): Promise<User> {
        try {
            if (data.password) {
                data.password = await argon2.hash(data.password);
            }
            const user = this.userRepository.create(data);
            await this.em.persistAndFlush(user);
            return user;
        } catch (error) {
            winstonLogger.error('Error creating user', error);
            throw error;
        }
    }

    async findByEmail(email: string): Promise<User | null> {
        return await this.userRepository.findOne({ email });
    }

    async findById(id: string): Promise<User | null> {
        return await this.userRepository.findOne({ id });
    }

    async createUser(data: CreateUserDto): Promise<User> {
        try {
            const existingUser = await this.findByEmail(data.email);
            if (existingUser) {
                throw new Error('User with this email already exists');
            }

            const hashedPassword = await argon2.hash(data.password);
            const user = new User();
            user.email = data.email;
            user.password = hashedPassword;
            user.role = data.role;

            await this.em.persistAndFlush(user);
            return user;
        } catch (error) {
            winstonLogger.error('Error creating user', error);
            throw error;
        }
    }

    async updateUser(id: string, data: UpdateUserDto): Promise<User> {
        try {
            const user = await this.findById(id);
            if (!user) {
                throw new Error('User not found');
            }

            if (data.email) {
                const existingUser = await this.findByEmail(data.email);
                if (existingUser && existingUser.id !== id) {
                    throw new Error('User with this email already exists');
                }
                user.email = data.email;
            }

            if (data.password) {
                user.password = await argon2.hash(data.password);
            }

            if (data.role !== undefined) {
                user.role = data.role;
            }

            await this.em.persistAndFlush(user);
            return user;
        } catch (error) {
            winstonLogger.error('Error updating user', error);
            throw error;
        }
    }

    async deleteUser(id: string): Promise<void> {
        try {
            const user = await this.findById(id);
            if (!user) {
                throw new Error('User not found');
            }

            await this.em.removeAndFlush(user);
        } catch (error) {
            winstonLogger.error('Error deleting user', error);
            throw error;
        }
    }

    async listUsers(page: number = 1, limit: number = 10): Promise<{ users: User[]; total: number }> {
        try {
            const [users, total] = await this.userRepository.findAndCount(
                {},
                {
                    limit,
                    offset: (page - 1) * limit,
                    orderBy: { createdAt: 'DESC' },
                }
            );

            return { users, total };
        } catch (error) {
            winstonLogger.error('Error listing users', error);
            throw error;
        }
    }
}
