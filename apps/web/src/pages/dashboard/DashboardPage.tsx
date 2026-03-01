import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    Activity,
    ShieldCheck,
    ArrowRight,
    Package,
    Factory,
    AlertOctagon,
    ShoppingCart,
    ClipboardList,
    TrendingUp,
    CheckCircle2,
    Clock,
    UserCircle2
} from 'lucide-react';
import { UserRole, ProductionOrder, NonConformity, ProductionOrderStatus, NonConformityStatus, PurchaseOrderStatus, QualitySeverity } from '@scaffold/types';
import StatsCard from '@/components/dashboard/StatsCard';
import { Button } from '@/components/ui/button';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { mrpApi } from '@/services/mrpApi';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState({
        activeOrders: 0,
        openNCs: 0,
        pendingPurchases: 0,
        totalProducts: 0
    });

    // Recent activity data
    const [recentOrders, setRecentOrders] = useState<ProductionOrder[]>([]);
    const [recentNCs, setRecentNCs] = useState<NonConformity[]>([]);

    const roleLabels: Record<string, string> = {
        [UserRole.SUPERADMIN]: 'Super Administrador',
        [UserRole.ADMIN]: 'Administrador',
        [UserRole.USER]: 'Usuario Estándar',
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);

                // Fetch metrics in parallel
                const [
                    ordersRes,
                    ncsRes,
                    purchasesRes,
                    productsRes
                ] = await Promise.all([
                    mrpApi.getProductionOrders(1, 5), // Get latest 5 for activity
                    mrpApi.listNonConformities(), // Get all to filter open ones
                    mrpApi.listPurchaseOrders(1, 10, { status: PurchaseOrderStatus.PENDING }),
                    mrpApi.getProducts(1, 1) // Just need total count
                ]);

                const activeOrdersCount = ordersRes.orders.filter(o =>
                    o.status === ProductionOrderStatus.IN_PROGRESS ||
                    o.status === ProductionOrderStatus.PLANNED
                ).length;

                const openNCs = ncsRes.filter(nc =>
                    nc.status !== NonConformityStatus.CERRADA
                );

                setMetrics({
                    activeOrders: activeOrdersCount,
                    openNCs: openNCs.length,
                    pendingPurchases: purchasesRes.total,
                    totalProducts: productsRes.total,
                });

                setRecentOrders(ordersRes.orders.slice(0, 4));
                setRecentNCs(openNCs.slice(0, 4));

            } catch (error) {
                console.error("Error loading dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    // Helper for rendering status badges in activity feed
    const OrderStatusBadge = ({ status }: { status: ProductionOrderStatus }) => {
        const styles: Record<string, string> = {
            [ProductionOrderStatus.COMPLETED]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            [ProductionOrderStatus.IN_PROGRESS]: 'bg-blue-50 text-blue-700 border-blue-200',
            [ProductionOrderStatus.PLANNED]: 'bg-amber-50 text-amber-700 border-amber-200',
            [ProductionOrderStatus.DRAFT]: 'bg-slate-50 text-slate-700 border-slate-200',
            [ProductionOrderStatus.CANCELLED]: 'bg-red-50 text-red-700 border-red-200',
        };
        const labels: Record<string, string> = {
            [ProductionOrderStatus.COMPLETED]: 'Completada',
            [ProductionOrderStatus.IN_PROGRESS]: 'En Progreso',
            [ProductionOrderStatus.PLANNED]: 'Planificada',
            [ProductionOrderStatus.DRAFT]: 'Borrador',
            [ProductionOrderStatus.CANCELLED]: 'Cancelada',
        };
        return (
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${styles[status]}`}>
                {labels[status] || status}
            </Badge>
        );
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Hero Section */}
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-50/80 via-transparent to-transparent pointer-events-none" />
                <div className="p-8 relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-start gap-5">
                        <div className="p-4 bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm shrink-0">
                            <Activity className="h-8 w-8 text-violet-600" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                                Hola, {user?.email.split('@')[0]}
                            </h2>
                            <p className="text-slate-500 mt-1.5 text-base max-w-xl">
                                Bienvenido al Centro de Operaciones. Aquí tienes un resumen en tiempo real del estado de producción y calidad.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3 shrink-0">
                        <Button
                            onClick={() => navigate('/mrp/production-orders/new')}
                            className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-sm"
                        >
                            <Factory className="mr-2 h-4 w-4" />
                            Nueva Orden
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => navigate('/quality/operations')}
                            className="rounded-xl border-slate-200 hover:bg-slate-50"
                        >
                            <AlertOctagon className="mr-2 h-4 w-4 text-amber-600" />
                            Reportar NC
                        </Button>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Órdenes Activas"
                    value={loading ? '-' : metrics.activeOrders.toString()}
                    icon={Factory}
                    trend={metrics.activeOrders > 0 ? { value: 'En proceso', positive: true } : undefined}
                    description="Producción en curso o planificada"
                    className="border-blue-100/50 shadow-sm hover:shadow-md transition-shadow"
                />
                <StatsCard
                    title="No Conformidades"
                    value={loading ? '-' : metrics.openNCs.toString()}
                    icon={AlertOctagon}
                    trend={metrics.openNCs > 0 ? { value: 'Requieren atención', positive: false } : { value: 'Todo en orden', positive: true }}
                    description="Casos de calidad abiertos"
                    className="border-amber-100/50 shadow-sm hover:shadow-md transition-shadow"
                />
                <StatsCard
                    title="Compras Pendientes"
                    value={loading ? '-' : metrics.pendingPurchases.toString()}
                    icon={ShoppingCart}
                    trend={{ value: 'Por recibir', positive: true }}
                    description="Órdenes de compra emitidas"
                    className="border-emerald-100/50 shadow-sm hover:shadow-md transition-shadow"
                />
                <StatsCard
                    title="Catálogo de Productos"
                    value={loading ? '-' : metrics.totalProducts.toString()}
                    icon={Package}
                    description="Total de referencias activas"
                    className="border-violet-100/50 shadow-sm hover:shadow-md transition-shadow"
                />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">

                {/* Operations Feed (Left 2 cols) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Recent Production Orders */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                                    <Factory className="h-4 w-4" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">Producción Reciente</h3>
                            </div>
                            <Button variant="ghost" size="sm" asChild className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-xl rounded-xl -mr-2">
                                <Link to="/mrp/production-orders">
                                    Ver todas <ArrowRight className="ml-1.5 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                        <div className="p-0">
                            {loading ? (
                                <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600" /></div>
                            ) : recentOrders.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">No hay órdenes de producción recientes.</div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {recentOrders.map((order) => (
                                        <div key={order.id} className="p-4 sm:px-6 hover:bg-slate-50/80 transition-colors flex items-center justify-between group">
                                            <div className="flex items-start gap-4">
                                                <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                                    <ClipboardList className="h-5 w-5 text-slate-500" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <Link to={`/mrp/production-orders/${order.id}`} className="font-bold text-slate-900 hover:text-violet-600 transition-colors">
                                                            {order.code}
                                                        </Link>
                                                        <OrderStatusBadge status={order.status} />
                                                    </div>
                                                    <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{order.notes || 'Sin notas adicionales'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-xs font-medium text-slate-500">Inicia</p>
                                                <p className="text-sm font-semibold text-slate-700 mt-0.5">
                                                    {order.startDate ? new Date(order.startDate).toLocaleDateString() : 'Pendiente'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Open Quality Issues */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                                    <AlertOctagon className="h-4 w-4" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">Alertas de Calidad Abiertas</h3>
                            </div>
                            <Button variant="ghost" size="sm" asChild className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-xl -mr-2">
                                <Link to="/quality/operations">
                                    Ir a Calidad <ArrowRight className="ml-1.5 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                        <div className="p-0">
                            {loading ? (
                                <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600" /></div>
                            ) : recentNCs.length === 0 ? (
                                <div className="p-8 flex flex-col items-center justify-center text-center">
                                    <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                                        <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                    </div>
                                    <p className="text-slate-600 font-medium">No hay No Conformidades abiertas</p>
                                    <p className="text-slate-400 text-sm mt-1">Todo está operando dentro de los parámetros esperados.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {recentNCs.map((nc) => (
                                        <div key={nc.id} className="p-4 sm:px-6 hover:bg-slate-50/80 transition-colors flex items-start justify-between group">
                                            <div className="flex items-start gap-4">
                                                <div className={`h-2 w-2 mt-2 rounded-full shrink-0 ${nc.severity === QualitySeverity.CRITICA ? 'bg-red-500' :
                                                    nc.severity === QualitySeverity.ALTA ? 'bg-orange-500' :
                                                        nc.severity === QualitySeverity.MEDIA ? 'bg-amber-500' : 'bg-slate-400'
                                                    }`} />
                                                <div>
                                                    <p className="font-bold text-slate-900 line-clamp-1">{nc.title}</p>
                                                    <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-2">
                                                        <span className="capitalize">{nc.status.replace('_', ' ')}</span>
                                                        <span className="text-slate-300">•</span>
                                                        <span>Origen: {nc.source}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200">
                                                {nc.severity}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Profile & Context (Right Col) */}
                <div className="space-y-6">
                    {/* User Profile Card */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                        <div className="absolute -top-4 -right-4 p-8 opacity-5 group-hover:scale-110 transition-transform">
                            <ShieldCheck className="h-40 w-40 text-violet-600" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-12 w-12 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                    <UserCircle2 className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 truncate max-w-[200px]">{user?.email}</h3>
                                    <span className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700 mt-1">
                                        {user ? roleLabels[user.role] : ''}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                        <Activity className="h-3.5 w-3.5" /> Estado
                                    </span>
                                    <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Activo
                                    </span>
                                </div>

                                <RoleGuard allowedRoles={[UserRole.SUPERADMIN, UserRole.ADMIN]}>
                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <Button variant="outline" className="w-full justify-between rounded-xl bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-violet-700 group/btn" asChild>
                                            <Link to="/users">
                                                Gestión de Usuarios
                                                <ArrowRight className="h-4 w-4 opacity-50 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
                                            </Link>
                                        </Button>
                                    </div>
                                </RoleGuard>
                            </div>
                        </div>
                    </div>

                    {/* Quick Links Card */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-slate-400" /> Atajos Rápidos
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'Inventario', icon: Package, path: '/mrp/inventory', color: 'text-blue-600', bg: 'bg-blue-50' },
                                { label: 'Recepción', icon: Clock, path: '/quality/incoming', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                { label: 'Despachos', icon: ShoppingCart, path: '/quality/shipments', color: 'text-amber-600', bg: 'bg-amber-50' },
                                { label: 'Catálogo', icon: ClipboardList, path: '/mrp/products', color: 'text-violet-600', bg: 'bg-violet-50' },
                            ].map((item, i) => (
                                <Link key={i} to={item.path} className="flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-100 hover:border-slate-300 hover:shadow-sm bg-slate-50/50 hover:bg-white transition-all group">
                                    <div className={`p-2 rounded-xl mb-2 ${item.bg} group-hover:scale-110 transition-transform`}>
                                        <item.icon className={`h-5 w-5 ${item.color}`} />
                                    </div>
                                    <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
