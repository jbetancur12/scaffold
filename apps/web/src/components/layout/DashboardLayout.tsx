import React, { useState } from 'react';
import logo from '@/assets/logo.jpg';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
    LayoutDashboard,
    Users,
    LogOut,
    Menu,
    X,
    Bell,
    Search,
    UserCircle,
    Package,
    ShoppingCart,
    Factory,
    Warehouse,
    Settings,
    ChevronDown,
    ChevronRight,
    Boxes
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { UserRole } from '@scaffold/types';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api-error';

interface SidebarItemProps {
    icon: React.ElementType;
    label: string;
    active: boolean;
    onClick: () => void;
    isChild?: boolean;
}

const SidebarItem = ({ icon: Icon, label, active, onClick, isChild }: SidebarItemProps) => (
    <button
        onClick={onClick}
        className={cn(
            "sidebar-link w-full",
            active && "sidebar-link-active",
            isChild && "pl-11 py-1.5 h-auto text-xs opacity-80 hover:opacity-100"
        )}
    >
        <Icon className={cn("h-5 w-5", isChild && "h-4 w-4")} />
        <span>{label}</span>
    </button>
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMrpOpen, setIsMrpOpen] = useState(true);

    const roleLabels: Record<string, string> = {
        [UserRole.SUPERADMIN]: 'Super Administrador',
        [UserRole.ADMIN]: 'Administrador',
        [UserRole.USER]: 'Usuario Estándar',
    };

    const mrpItems = [
        { icon: Package, label: 'Productos', path: '/mrp/products', roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN] },
        { icon: Package, label: 'Materias Primas', path: '/mrp/raw-materials', roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN] },
        { icon: ShoppingCart, label: 'Proveedores', path: '/mrp/suppliers', roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN] },
        { icon: ShoppingCart, label: 'Órdenes de Compra', path: '/mrp/purchase-orders', roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN] },
        { icon: Factory, label: 'Órdenes de Producción', path: '/mrp/production-orders', roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN] },
        { icon: Warehouse, label: 'Inventario', path: '/mrp/inventory', roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN] },
        { icon: Warehouse, label: 'Almacenes', path: '/mrp/warehouses', roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN] },
        { icon: Settings, label: 'Configuración Operativa', path: '/mrp/operational-settings', roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN] },
    ];

    const filteredMrpItems = mrpItems.filter(item =>
        item.roles.includes(user?.role as UserRole)
    );

    const isMrpActive = location.pathname.includes('/mrp/');

    const handleLogout = async () => {
        try {
            await logout();
            toast({
                title: 'Sesión cerrada',
                description: 'Has cerrado sesión exitosamente.',
            });
            navigate('/login');
        } catch (error) {
            toast({
                title: 'Error',
                description: getErrorMessage(error, 'No se pudo cerrar la sesión. Inténtalo de nuevo.'),
                variant: 'destructive',
            });
        }
    };

    const renderNavItems = (onItemClick?: () => void) => (
        <>
            <SidebarItem
                icon={LayoutDashboard}
                label="Resumen"
                active={location.pathname === '/'}
                onClick={() => {
                    navigate('/');
                    onItemClick?.();
                }}
            />

            {/* MRP Group */}
            <div className="space-y-1">
                <button
                    onClick={() => setIsMrpOpen(!isMrpOpen)}
                    className={cn(
                        "sidebar-link w-full justify-between pr-4",
                        isMrpActive && "text-primary font-medium bg-primary/5"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <Boxes className="h-5 w-5" />
                        <span>Módulo MRP</span>
                    </div>
                    {isMrpOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>

                {isMrpOpen && (
                    <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                        {filteredMrpItems.map((item) => (
                            <SidebarItem
                                key={item.path}
                                icon={item.icon}
                                label={item.label}
                                active={location.pathname === item.path}
                                isChild={true}
                                onClick={() => {
                                    navigate(item.path);
                                    onItemClick?.();
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {user?.role === UserRole.SUPERADMIN && (
                <SidebarItem
                    icon={Users}
                    label="Usuarios"
                    active={location.pathname === '/users'}
                    onClick={() => {
                        navigate('/users');
                        onItemClick?.();
                    }}
                />
            )}
        </>
    );

    return (
        <div className="min-h-screen bg-[#f8fafc] flex">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-200 p-6 sticky top-0 h-screen">
                <div className="flex items-center gap-3 mb-10 px-2">
                    <img
                        src={logo}
                        alt="Colortópedicas"
                        className="h-12 w-auto object-contain"
                    />
                </div>

                <nav className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                    {renderNavItems()}
                </nav>

                <div className="mt-auto pt-6 border-t border-slate-100">
                    <div className="flex items-center gap-3 px-2 mb-6">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                            <UserCircle className="h-6 w-6 text-slate-500" />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-semibold truncate text-slate-900">{user?.email}</span>
                            <span className="text-xs text-slate-500">{user ? roleLabels[user.role] : ''}</span>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-slate-500 hover:text-destructive hover:bg-destructive/5"
                        onClick={handleLogout}
                    >
                        <LogOut className="mr-3 h-5 w-5" />
                        Cerrar sesión
                    </Button>
                </div>
            </aside>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <aside className={cn(
                "fixed inset-y-0 left-0 w-72 bg-white z-50 transform transition-transform duration-300 lg:hidden p-6",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex items-center justify-between mb-10 px-2">
                    <div className="flex items-center gap-3">
                        <img
                            src={logo}
                            alt="Colortópedicas"
                            className="h-12 w-auto object-contain"
                        />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                        <X className="h-6 w-6" />
                    </Button>
                </div>

                <nav className="space-y-2 overflow-y-auto h-[calc(100vh-200px)]">
                    {renderNavItems(() => setIsMobileMenuOpen(false))}
                </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-6 flex items-center justify-between lg:justify-end">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden"
                        onClick={() => setIsMobileMenuOpen(true)}
                    >
                        <Menu className="h-6 w-6" />
                    </Button>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center bg-slate-100 rounded-full px-4 py-1.5 border border-slate-200 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                            <Search className="h-4 w-4 text-slate-400 mr-2" />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                className="bg-transparent border-none outline-none text-sm w-48 text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                        <Button variant="ghost" size="icon" className="relative text-slate-500">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-2 right-2.5 h-2 w-2 bg-destructive rounded-full border border-white" />
                        </Button>
                        <div className="h-8 w-[1px] bg-slate-200 mx-2 hidden sm:block" />
                        <div className="hidden sm:flex flex-col items-end">
                            <span className="text-sm font-medium text-slate-900">{user?.email.split('@')[0]}</span>
                            <span className="text-[10px] uppercase tracking-wider font-bold text-primary">{user ? roleLabels[user.role] : ''}</span>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-6 lg:p-10 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
