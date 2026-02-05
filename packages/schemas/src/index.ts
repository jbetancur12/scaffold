import { z } from 'zod';
import { UserRole } from '@scaffold/types';

export const LoginSchema = z.object({
    email: z.string().email('Correo electrónico inválido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export const RegisterSchema = z.object({
    email: z.string().email('Correo electrónico inválido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    role: z.nativeEnum(UserRole).default(UserRole.USER),
});

export const CreateUserSchema = z.object({
    email: z.string().email('Correo electrónico inválido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    role: z.nativeEnum(UserRole),
});

export const UpdateUserSchema = z.object({
    email: z.string().email('Correo electrónico inválido').optional(),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').optional(),
    role: z.nativeEnum(UserRole).optional(),
});
