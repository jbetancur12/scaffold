import { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@scaffold/types';

interface RoleGuardProps {
    children: ReactNode;
    allowedRoles: UserRole[];
    fallback?: ReactNode;
}

/**
 * Component to wrap parts of the UI that should only be visible to specific roles.
 */
export const RoleGuard = ({ children, allowedRoles, fallback = null }: RoleGuardProps) => {
    const { user } = useAuth();

    if (!user || !allowedRoles.includes(user.role as UserRole)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
};

/**
 * Hook to check for permissions programmatically.
 */
export const useHasRole = () => {
    const { user } = useAuth();

    return {
        hasRole: (roles: UserRole[]) => user && roles.includes(user.role as UserRole),
        role: user?.role as UserRole | undefined
    };
};
