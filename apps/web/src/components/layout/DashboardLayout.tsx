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
    Scissors,
    ShieldCheck,
    Megaphone,
    ChevronDown,
    ChevronRight,
    Boxes,
    Layers,
    BarChart3,
    ClipboardList,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { UserRole } from '@scaffold/types';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api-error';
import { qualitySectionCategoryLabels, qualitySectionCategoryOrder, qualitySections } from '@/constants/mrpNavigation';

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
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
            active
                ? "bg-primary/10 text-primary font-medium shadow-sm ring-1 ring-primary/10"
                : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900",
            isChild ? "pl-[2.75rem] py-2 text-[13px]" : "text-sm",
            "active:scale-[0.98]"
        )}
    >
        {active && !isChild && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-primary rounded-r-full shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
        )}
        <Icon className={cn(
            "transition-colors flex-shrink-0",
            isChild ? "h-[1.125rem] w-[1.125rem]" : "h-5 w-5",
            active ? "text-primary" : "text-slate-400 group-hover:text-slate-500"
        )} />
        <span className="truncate text-left">{label}</span>
    </button>
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMrpOpen, setIsMrpOpen] = useState(true);
    const [isQualityOpen, setIsQualityOpen] = useState(true);
    const [isPostmarketOpen, setIsPostmarketOpen] = useState(true);

    const roleLabels: Record<string, string> = {
        [UserRole.SUPERADMIN]: 'Super Administrador',
        [UserRole.ADMIN]: 'Administrador',
        [UserRole.USER]: 'Usuario Estándar',
    };

    const mrpItems = [
        { icon: Package, label: 'Productos', path: '/mrp/products', roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN] },
        { icon: Package, label: 'Lista de Precios', path: '/mrp/price-list', roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN] },
        { icon: Layers, label: 'Grupos de Producto', path: '/mrp/product-groups', roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN] },
        { icon: Package, label: 'Materias Primas', path: '/mrp/raw-materials', roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN] },
        { icon: Users, label: 'Clientes', path: '/mrp/customers', roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN] },
        { icon: ShoppingCart, label: 'Proveedores', path: '/mrp/suppliers', roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN] },
        { icon: ShoppingCart, label: 'Requisiciones de Compra', path: '/mrp/purchase-requisitions', roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN] },
        { icon: ShoppingCart, label: 'Órdenes de Compra', path: '/mrp/purchase-orders', roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN] },
        { icon: ShoppingCart, label: 'Cotizaciones', path: '/mrp/quotations', roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN] },
        { icon: Package, label: 'Pedidos de Clientes', path: '/mrp/sales-orders', roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN] },
        { icon: Factory, label: 'Órdenes de Producción', path: '/mrp/production-orders', roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN] },
        { icon: Factory, label: 'Simulador Producción', path: '/mrp/production-orders/simulator', roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN] },
        { icon: BarChart3, label: 'Analíticas Producción', path: '/mrp/production-analytics', roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN] },
        { icon: Users, label: 'Operadores', path: '/mrp/operators', roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN] },
        { icon: ClipboardList, label: 'Registros de Producción', path: '/mrp/production-entries', roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN] },
        { icon: Warehouse, label: 'Inventario', path: '/mrp/inventory', roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN] },
        { icon: Warehouse, label: 'Almacenes', path: '/mrp/warehouses', roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN] },
        { icon: Scissors, label: 'Calculadora de Hilo', path: '/mrp/thread-calculator', roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN] },
        { icon: Settings, label: 'Configuración Operativa', path: '/mrp/operational-settings', roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN] },
    ];

    const mrpCategories = [
        {
            label: 'Maestros',
            items: ['/mrp/products', '/mrp/price-list', '/mrp/product-groups', '/mrp/raw-materials'],
        },
        {
            label: 'Terceros',
            items: ['/mrp/customers', '/mrp/suppliers'],
        },
        {
            label: 'Operación',
            items: ['/mrp/sales-orders', '/mrp/quotations', '/mrp/purchase-requisitions', '/mrp/purchase-orders', '/mrp/production-orders', '/mrp/production-orders/simulator', '/mrp/production-analytics', '/mrp/operators', '/mrp/production-entries', '/mrp/inventory', '/mrp/warehouses', '/mrp/thread-calculator'],
        },
        {
            label: 'Parámetros',
            items: ['/mrp/operational-settings'],
        },
    ];

    const filteredMrpItems = mrpItems.filter(item =>
        item.roles.includes(user?.role as UserRole)
    );

    const isMrpActive = location.pathname.startsWith('/mrp/') && !location.pathname.startsWith('/mrp/quality') && !location.pathname.startsWith('/mrp/postmarket');
    const isQualityActive = location.pathname.startsWith('/quality') || location.pathname.startsWith('/mrp/quality');
    const isPostmarketActive = location.pathname.startsWith('/postmarket') || location.pathname.startsWith('/mrp/postmarket');

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
            <div className="space-y-1.5">
                <button
                    onClick={() => setIsMrpOpen(!isMrpOpen)}
                    className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group select-none",
                        isMrpActive ? "bg-slate-100/80" : "hover:bg-slate-50"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "flex items-center justify-center w-7 h-7 rounded-md transition-colors shadow-sm border",
                            isMrpActive ? "bg-primary text-white border-primary/20" : "bg-white text-slate-500 border-slate-200 group-hover:border-slate-300 group-hover:text-slate-700"
                        )}>
                            <Boxes className="h-4 w-4" />
                        </div>
                        <span className={cn(
                            "text-sm font-semibold tracking-tight",
                            isMrpActive ? "text-slate-900" : "text-slate-700 group-hover:text-slate-900"
                        )}>Módulo MRP</span>
                    </div>
                    {isMrpOpen ? <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-200" /> : <ChevronRight className="h-4 w-4 text-slate-400 transition-transform duration-200" />}
                </button>

                {isMrpOpen && (
                    <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300 ease-out fill-mode-both pb-2">
                        {mrpCategories.map((category) => {
                            const categoryItems = filteredMrpItems.filter((item) => category.items.includes(item.path));
                            if (categoryItems.length === 0) return null;
                            return (
                                <div key={category.label} className="space-y-1 pt-1">
                                    <div className="pl-[2.75rem] pr-2 text-[11px] font-bold uppercase tracking-wider text-slate-400/80 mb-1">{category.label}</div>
                                    {categoryItems.map((item) => (
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
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Quality Group */}
            <div className="space-y-1.5">
                <button
                    onClick={() => setIsQualityOpen(!isQualityOpen)}
                    className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group select-none",
                        isQualityActive ? "bg-slate-100/80" : "hover:bg-slate-50"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "flex items-center justify-center w-7 h-7 rounded-md transition-colors shadow-sm border",
                            isQualityActive ? "bg-emerald-600 text-white border-emerald-600/20" : "bg-white text-slate-500 border-slate-200 group-hover:border-slate-300 group-hover:text-slate-700"
                        )}>
                            <ShieldCheck className="h-4 w-4" />
                        </div>
                        <span className={cn(
                            "text-sm font-semibold tracking-tight",
                            isQualityActive ? "text-slate-900" : "text-slate-700 group-hover:text-slate-900"
                        )}>Calidad e INVIMA</span>
                    </div>
                    {isQualityOpen ? <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-200" /> : <ChevronRight className="h-4 w-4 text-slate-400 transition-transform duration-200" />}
                </button>

                {isQualityOpen && (
                    <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300 ease-out fill-mode-both pb-2">
                        {qualitySectionCategoryOrder.map((categoryKey) => {
                            const categoryItems = qualitySections.filter((item) => item.domain === 'quality' && item.category === categoryKey);
                            if (categoryItems.length === 0) return null;
                            return (
                                <div key={categoryKey} className="space-y-1 pt-1">
                                    <div className="pl-[2.75rem] pr-2 text-[11px] font-bold uppercase tracking-wider text-slate-400/80 mb-1">
                                        {qualitySectionCategoryLabels[categoryKey]}
                                    </div>
                                    {categoryItems.map((item) => (
                                        <SidebarItem
                                            key={item.path}
                                            icon={ShieldCheck}
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
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Postmarket Group */}
            <div className="space-y-1.5">
                <button
                    onClick={() => setIsPostmarketOpen(!isPostmarketOpen)}
                    className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group select-none",
                        isPostmarketActive ? "bg-slate-100/80" : "hover:bg-slate-50"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "flex items-center justify-center w-7 h-7 rounded-md transition-colors shadow-sm border",
                            isPostmarketActive ? "bg-blue-600 text-white border-blue-600/20" : "bg-white text-slate-500 border-slate-200 group-hover:border-slate-300 group-hover:text-slate-700"
                        )}>
                            <Megaphone className="h-4 w-4" />
                        </div>
                        <span className={cn(
                            "text-sm font-semibold tracking-tight",
                            isPostmarketActive ? "text-slate-900" : "text-slate-700 group-hover:text-slate-900"
                        )}>Postmercado</span>
                    </div>
                    {isPostmarketOpen ? <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-200" /> : <ChevronRight className="h-4 w-4 text-slate-400 transition-transform duration-200" />}
                </button>

                {isPostmarketOpen && (
                    <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300 ease-out fill-mode-both pb-2">
                        {qualitySectionCategoryOrder.map((categoryKey) => {
                            const categoryItems = qualitySections.filter((item) => item.domain === 'postmarket' && item.category === categoryKey);
                            if (categoryItems.length === 0) return null;
                            return (
                                <div key={`post-${categoryKey}`} className="space-y-1 pt-1">
                                    <div className="pl-[2.75rem] pr-2 text-[11px] font-bold uppercase tracking-wider text-slate-400/80 mb-1">
                                        {qualitySectionCategoryLabels[categoryKey]}
                                    </div>
                                    {categoryItems.map((item) => (
                                        <SidebarItem
                                            key={item.path}
                                            icon={Megaphone}
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
                            );
                        })}
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
        <div className="min-h-screen bg-slate-50 flex">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex flex-col w-[280px] bg-white border-r border-slate-200/60 p-4 sticky top-0 h-screen shadow-sm z-40">
                <div className="flex items-center gap-3 mb-6 px-3 py-2">
                    <img
                        src={logo}
                        alt="Colortópedicas"
                        className="h-[52px] w-auto object-contain"
                    />
                </div>

                <nav className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                    {renderNavItems()}
                </nav>

                <div className="mt-auto pt-4 pb-2 border-t border-slate-200/60">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 mb-2">
                        <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center border border-slate-200 shadow-sm flex-shrink-0">
                            <UserCircle className="h-6 w-6 text-slate-400" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-sm font-semibold truncate text-slate-900" title={user?.email}>{user?.email}</span>
                            <span className="text-xs font-medium text-slate-500 truncate">{user ? roleLabels[user.role] : ''}</span>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-slate-600 hover:text-destructive hover:bg-destructive/10 transition-colors rounded-lg h-10 px-3"
                        onClick={handleLogout}
                    >
                        <LogOut className="mr-3 h-4 w-4" />
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
                "fixed inset-y-0 left-0 w-[280px] bg-white z-50 transform transition-transform duration-300 ease-in-out lg:hidden p-4 shadow-2xl",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex items-center justify-between mb-6 px-3 py-2">
                    <div className="flex items-center gap-3">
                        <img
                            src={logo}
                            alt="Colortópedicas"
                            className="h-[52px] w-auto object-contain"
                        />
                    </div>
                    <Button variant="ghost" size="icon" className="hover:bg-slate-100 rounded-full h-8 w-8" onClick={() => setIsMobileMenuOpen(false)}>
                        <X className="h-5 w-5 text-slate-500" />
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
