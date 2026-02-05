export enum UserRole {
    USER = 'user',
    ADMIN = 'admin',
    SUPERADMIN = 'superadmin',
}

export interface User {
    id: string;
    email: string;
    role: UserRole;
    createdAt: string;
    updatedAt: string;
}
