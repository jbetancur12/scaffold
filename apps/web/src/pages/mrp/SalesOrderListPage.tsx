import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SalesOrder, SalesOrderStatus } from '@scaffold/types';
import { Button } from '../../components/ui/button';
import { Plus, Eye, X, Loader2, Search, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api-error';
import { useMrpQueryErrorToast } from '@/hooks/mrp/useMrpQueryErrorToast';
import { useSalesOrdersQuery, useUpdateSalesOrderStatusMutation } from '@/hooks/mrp/useSalesOrders';

const statusLabels: Record<string, string> = {
    [SalesOrderStatus.PENDING]: 'Pendiente',
    [SalesOrderStatus.IN_PRODUCTION]: 'En Producción',
    [SalesOrderStatus.READY_TO_SHIP]: 'Listo para Envío',
    [SalesOrderStatus.SHIPPED]: 'Despachado',
    [SalesOrderStatus.CANCELLED]: 'Cancelado',
};

const statusColors: Record<string, string> = {
    [SalesOrderStatus.PENDING]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [SalesOrderStatus.IN_PRODUCTION]: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    [SalesOrderStatus.READY_TO_SHIP]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    [SalesOrderStatus.SHIPPED]: 'bg-blue-100 text-blue-800 border-blue-200',
    [SalesOrderStatus.CANCELLED]: 'bg-slate-100 text-slate-800 border-slate-200',
};

export default function SalesOrderListPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [page, setPage] = useState(1);
    const limit = 10;
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');

    const {
        data: ordersResponse,
        loading,
        error: ordersError,
    } = useSalesOrdersQuery(page, limit, {
        status: statusFilter !== 'ALL' ? (statusFilter as any) : undefined,
        search: searchQuery || undefined
    });
    const { execute: updateStatus } = useUpdateSalesOrderStatusMutation();

    const orders: SalesOrder[] = ordersResponse?.data || [];
    const total = ordersResponse?.total || 0;

    useMrpQueryErrorToast(ordersError, 'No se pudieron cargar los pedidos de clientes');

    const handleCancel = async (id: string) => {
        if (!confirm('¿Estás seguro de cancelar este pedido?')) return;

        try {
            await updateStatus({ id, payload: { status: SalesOrderStatus.CANCELLED } });
            toast({
                title: 'Éxito',
                description: 'Pedido cancelado',
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: getErrorMessage(error, 'No se pudo cancelar el pedido'),
                variant: 'destructive',
            });
        }
    };

    if (loading) {
        return (
            <div className="p-6 flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    // El backend puede que no tenga filtro de search aún, así que lo filtramos en frontend también por si acaso
    const filteredOrders = orders.filter((order) => {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
            (order.customer?.name || '').toLowerCase().includes(query) ||
            order.code.toLowerCase().includes(query);
        const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                        <FileText className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Pedidos de Clientes</h1>
                        <p className="text-sm text-slate-500 mt-1">Gestiona las ventas y despachos a clientes.</p>
                    </div>
                </div>
                <Button onClick={() => navigate('/mrp/sales-orders/new')} className="w-full sm:w-auto shadow-sm hover:shadow-md transition-all">
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Pedido
                </Button>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col lg:flex-row justify-between gap-4 mb-6">
                <div className="relative w-full lg:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Buscar por cliente o código (ej. PED-0001)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-11 bg-white border-slate-200 shadow-sm focus-visible:ring-blue-500 rounded-lg text-sm"
                    />
                </div>

                {/* Horizontal Status Pills */}
                <div className="flex overflow-x-auto pb-2 -mb-2 lg:pb-0 lg:mb-0 gap-2 w-full lg:w-auto scrollbar-hide">
                    {[
                        { value: 'ALL', label: 'Todos' },
                        { value: SalesOrderStatus.PENDING, label: 'Pendientes' },
                        { value: SalesOrderStatus.IN_PRODUCTION, label: 'En Producción' },
                        { value: SalesOrderStatus.READY_TO_SHIP, label: 'Listo Envío' },
                        { value: SalesOrderStatus.SHIPPED, label: 'Despachados' },
                        { value: SalesOrderStatus.CANCELLED, label: 'Cancelados' },
                    ].map((status) => (
                        <button
                            key={status.value}
                            onClick={() => setStatusFilter(status.value)}
                            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${statusFilter === status.value
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            {status.label}
                        </button>
                    ))}
                </div>
            </div>

            {filteredOrders.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                    <div className="h-24 w-24 bg-blue-50/50 rounded-full flex items-center justify-center mb-6 ring-8 ring-slate-50">
                        <FileText className="h-12 w-12 text-blue-300" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                        {orders.length === 0 ? "Sin Pedidos Registrados" : "No se encontraron resultados"}
                    </h3>
                    <p className="text-slate-500 mb-8 max-w-md text-base">
                        {orders.length === 0
                            ? "Aún no has registrado pedidos en el sistema. Comienza creando tu primer pedido para gestionar ventas."
                            : "No hay pedidos que coincidan con tu búsqueda y filtros actuales. Intenta cambiar los términos."}
                    </p>
                    {orders.length === 0 && (
                        <Button
                            onClick={() => navigate('/mrp/sales-orders/new')}
                            className="h-12 px-6 text-base shadow-sm hover:shadow-md hover:scale-105 transition-all"
                        >
                            <Plus className="mr-2 h-5 w-5" />
                            Crear primer pedido
                        </Button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Mobile Card View */}
                    <div className="grid grid-cols-1 gap-4 lg:hidden">
                        {filteredOrders.map((order) => (
                            <div key={order.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col gap-4 transition-all hover:shadow-md">
                                <div className="flex justify-between items-start gap-3">
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900 leading-tight">{order.customer?.name}</h3>
                                        <div className="text-sm text-slate-500 font-mono mt-1">{order.code}</div>
                                    </div>
                                    <span className={`whitespace-nowrap px-2.5 py-1 text-xs font-semibold rounded-full border ${statusColors[order.status] || 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                                        {statusLabels[order.status] || order.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-slate-500 block text-xs uppercase font-medium tracking-wider">Fecha</span>
                                        <span className="text-slate-900 font-medium">{new Date(order.orderDate).toLocaleDateString()}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-slate-500 block text-xs uppercase font-medium tracking-wider">Total</span>
                                        <span className="text-slate-900 font-bold text-base">{formatCurrency(order.netTotalAmount || order.totalAmount)}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-3 border-t border-slate-100 mt-1">
                                    <Button
                                        variant="outline"
                                        className="flex-1 h-10 border-slate-200 text-slate-700 hover:bg-slate-50"
                                        onClick={() => navigate(`/mrp/sales-orders/${order.id}`)}
                                    >
                                        <Eye className="h-4 w-4 mr-2" />
                                        Ver Detalle
                                    </Button>

                                    {(order.status === SalesOrderStatus.PENDING) && (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => handleCancel(order.id)}
                                                className="h-10 w-10 border-slate-200 text-red-600 hover:bg-red-50 hover:border-red-200"
                                                title="Cancelar Pedido"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden lg:block bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Pedido
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Fecha
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Estado
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Total Neto
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {filteredOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors cursor-pointer" onClick={() => navigate(`/mrp/sales-orders/${order.id}`)}>
                                                    {order.customer?.name}
                                                </span>
                                                <span className="text-xs text-slate-500 font-mono mt-0.5">{order.code}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-slate-600 font-medium">
                                                {new Date(order.orderDate).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${statusColors[order.status] || 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                                                {statusLabels[order.status] || order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-slate-900">
                                                {formatCurrency(order.netTotalAmount || order.totalAmount)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => navigate(`/mrp/sales-orders/${order.id}`)}
                                                    title="Ver detalle"
                                                    className="h-8 w-8 text-slate-500 hover:text-blue-700 hover:bg-blue-50"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                {(order.status === SalesOrderStatus.PENDING) && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleCancel(order.id)}
                                                            title="Cancelar Pedido"
                                                            className="h-8 w-8 text-slate-500 hover:text-red-700 hover:bg-red-50"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {total > limit && (
                <div className="mt-4 flex justify-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        Anterior
                    </Button>
                    <span className="flex items-center px-4">
                        Página {page} de {Math.ceil(total / limit)}
                    </span>
                    <Button
                        variant="outline"
                        onClick={() => setPage(p => p + 1)}
                        disabled={page >= Math.ceil(total / limit)}
                    >
                        Siguiente
                    </Button>
                </div>
            )}
        </div>
    );
}
