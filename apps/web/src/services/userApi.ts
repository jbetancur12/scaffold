import api from './api';
import { User } from '@scaffold/types';
import type { CreateUserDto, UpdateUserDto } from '@scaffold/schemas';
export type CreateUserData = CreateUserDto;
export type UpdateUserData = UpdateUserDto;

export interface UsersResponse {
    items: User[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export const userApi = {
    getUsers: async (page: number = 1, limit: number = 10): Promise<UsersResponse> => {
        const response = await api.get(`/users?page=${page}&limit=${limit}`);
        return response.data;
    },

    getUserById: async (id: string): Promise<User> => {
        const response = await api.get(`/users/${id}`);
        return response.data;
    },

    createUser: async (data: CreateUserData): Promise<User> => {
        const response = await api.post('/users', data);
        return response.data;
    },

    updateUser: async (id: string, data: UpdateUserData): Promise<User> => {
        const response = await api.put(`/users/${id}`, data);
        return response.data;
    },

    deleteUser: async (id: string): Promise<void> => {
        await api.delete(`/users/${id}`);
    },
};
