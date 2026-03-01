import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PurchaseOrder } from '@scaffold/types';
import { Button } from '../../components/ui/button';
import { Plus, Eye, Check, X, Loader2, Search, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api-error';
import { useMrpQueryErrorToast } from '@/hooks/mrp/useMrpQueryErrorToast';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useWarehousesQuery } from '@/hooks/mrp/useWarehouses';
import { useCancelPurchaseOrderMutation, usePurchaseOrdersQuery, useReceivePurchaseOrderMutation } from '@/hooks/mrp/usePurchaseOrders';

const statusLabels = {
    PENDING: 'Pendiente',
    CONFIRMED: 'Confirmada',
    RECEIVED: 'Recibida',
    CANCELLED: 'Cancelada',
};

const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    RECEIVED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
};

export default function PurchaseOrderListPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [page, setPage] = useState(1);
    const limit = 10;
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');

    // Warehouse selection
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
    const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);
    const [orderToReceive, setOrderToReceive] = useState<PurchaseOrder | null>(null);
    const {
        data: ordersResponse,
        loading,
        error: ordersError,
    } = usePurchaseOrdersQuery(page, limit);
    const { data: warehousesData, error: warehousesError } = useWarehousesQuery();
    const { execute: receiveOrder, loading: submitting } = useReceivePurchaseOrderMutation();
    const { execute: cancelOrder } = useCancelPurchaseOrderMutation();
    const orders: PurchaseOrder[] = ordersResponse?.data || [];
    const total = ordersResponse?.total || 0;
    const warehouses = warehousesData ?? [];

    useMrpQueryErrorToast(ordersError, 'No se pudieron cargar las órdenes de compra');
    useMrpQueryErrorToast(warehousesError, 'No se pudieron cargar los almacenes');


    const handleReceiveClick = (order: PurchaseOrder) => {
        setOrderToReceive(order);
        setIsReceiveDialogOpen(true);
    };

    const handleConfirmReceive = async () => {
        if (!orderToReceive) return;

        try {
            await receiveOrder({ id: orderToReceive.id, warehouseId: selectedWarehouseId || undefined });
            toast({
                title: 'Éxito',
                description: `Orden ${orderToReceive.code} recibida en inventario`,
            });
            setIsReceiveDialogOpen(false);
            setOrderToReceive(null);
        } catch (error) {
            toast({
                title: 'Error',
                description: getErrorMessage(error, 'No se pudo recibir la orden'),
                variant: 'destructive',
            });
        }
    };

    const handleCancel = async (id: string) => {
        if (!confirm('¿Estás seguro de cancelar esta orden?')) return;

        try {
            await cancelOrder(id);
            toast({
                title: 'Éxito',
                description: 'Orden cancelada',
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: getErrorMessage(error, 'No se pudo cancelar la orden'),
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

    const filteredOrders = orders.filter((order) => {
        const matchesSearch = order.supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.id.toLowerCase().includes(searchQuery.toLowerCase());
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
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Órdenes de Compra</h1>
                        <p className="text-sm text-slate-500 mt-1">Gestiona las compras de materias primas e ítems libres.</p>
                    </div>
                </div>
                <Button onClick={() => navigate('/mrp/purchase-orders/new')} className="w-full sm:w-auto shadow-sm hover:shadow-md transition-all">
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Orden
                </Button>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col lg:flex-row justify-between gap-4 mb-6">
                <div className="relative w-full lg:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Buscar por nombre de proveedor o Código de Orden (ej. OC-0001)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-11 bg-white border-slate-200 shadow-sm focus-visible:ring-blue-500 rounded-lg text-sm"
                    />
                </div>

                {/* Horizontal Status Pills (Desktop & Scrollable Mobile) */}
                <div className="flex overflow-x-auto pb-2 -mb-2 lg:pb-0 lg:mb-0 gap-2 w-full lg:w-auto scrollbar-hide">
                    {[
                        { value: 'ALL', label: 'Todos' },
                        { value: 'PENDING', label: 'Pendientes' },
                        { value: 'CONFIRMED', label: 'Confirmadas' },
                        { value: 'RECEIVED', label: 'Recibidas' },
                        { value: 'CANCELLED', label: 'Canceladas' },
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
                        {orders.length === 0 ? "Sin Órdenes de Compra" : "No se encontraron resultados"}
                    </h3>
                    <p className="text-slate-500 mb-8 max-w-md text-base">
                        {orders.length === 0
                            ? "Aún no has registrado órdenes de compra en el sistema. Comienza creando tu primera orden para gestionar inventario."
                            : "No hay órdenes que coincidan con tu búsqueda y filtros actuales. Intenta cambiar los términos."}
                    </p>
                    {orders.length === 0 && (
                        <Button
                            onClick={() => navigate('/mrp/purchase-orders/new')}
                            className="h-12 px-6 text-base shadow-sm hover:shadow-md hover:scale-105 transition-all"
                        >
                            <Plus className="mr-2 h-5 w-5" />
                            Crear primera orden
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
                                        <h3 className="text-base font-bold text-slate-900 leading-tight">{order.supplier.name}</h3>
                                        <div className="text-sm text-slate-500 font-mono mt-1">{order.code}</div>
                                    </div>
                                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${statusColors[order.status]}`}>
                                        {statusLabels[order.status]}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-slate-500 block text-xs uppercase font-medium tracking-wider">Fecha</span>
                                        <span className="text-slate-900 font-medium">{new Date(order.orderDate).toLocaleDateString()}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-slate-500 block text-xs uppercase font-medium tracking-wider">Total</span>
                                        <span className="text-slate-900 font-bold text-base">{formatCurrency(order.netTotalAmount ?? order.totalAmount)}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-3 border-t border-slate-100 mt-1">
                                    <Button
                                        variant="outline"
                                        className="flex-1 h-10 border-slate-200 text-slate-700 hover:bg-slate-50"
                                        onClick={() => navigate(`/mrp/purchase-orders/${order.id}`)}
                                    >
                                        <Eye className="h-4 w-4 mr-2" />
                                        Ver Detalle
                                    </Button>

                                    {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => handleReceiveClick(order)}
                                                className="h-10 w-10 border-slate-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200"
                                                title="Recibir Inventario"
                                            >
                                                <Check className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => handleCancel(order.id)}
                                                className="h-10 w-10 border-slate-200 text-red-600 hover:bg-red-50 hover:border-red-200"
                                                title="Cancelar Orden"
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
                                        Orden de Compra
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
                                                <span className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors cursor-pointer" onClick={() => navigate(`/mrp/purchase-orders/${order.id}`)}>
                                                    {order.supplier.name}
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
                                            <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${statusColors[order.status]}`}>
                                                {statusLabels[order.status]}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-slate-900">
                                                {formatCurrency(order.netTotalAmount ?? order.totalAmount)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => navigate(`/mrp/purchase-orders/${order.id}`)}
                                                    title="Ver detalle"
                                                    className="h-8 w-8 text-slate-500 hover:text-blue-700 hover:bg-blue-50"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleReceiveClick(order)}
                                                            title="Recibir Inventario"
                                                            className="h-8 w-8 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                                                        >
                                                            <Check className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleCancel(order.id)}
                                                            title="Cancelar Orden"
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

            <Dialog open={isReceiveDialogOpen} onOpenChange={setIsReceiveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Recibir Orden de Compra</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="bg-slate-50 border border-slate-100 p-3 rounded-md mb-2">
                            <p className="text-sm font-medium text-slate-900">{orderToReceive?.supplier.name}</p>
                            <p className="text-xs text-slate-500 font-mono">{orderToReceive?.code}</p>
                        </div>
                        <p className="text-sm text-slate-600">
                            ¿Estás seguro de recibir esta orden? Las cantidades de los ítems de catálogo se agregarán automáticamente a tu inventario.
                        </p>
                        <div className="grid gap-2">
                            <Label htmlFor="warehouse">Almacén de Destino</Label>
                            <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar almacén (Opcional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    {warehouses.map((w) => (
                                        <SelectItem key={w.id} value={w.id}>
                                            {w.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-400">
                                Si no selecciona uno, se usará el Almacén Principal.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsReceiveDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleConfirmReceive} disabled={submitting}>
                            {submitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Recibiendo...
                                </>
                            ) : (
                                'Confirmar Recepción'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
