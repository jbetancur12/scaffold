import { z } from 'zod';
import { LoginSchema, RegisterSchema } from '@scaffold/schemas';

export { LoginSchema, RegisterSchema };
export type LoginDto = z.infer<typeof LoginSchema>;
export type RegisterDto = z.infer<typeof RegisterSchema>;
