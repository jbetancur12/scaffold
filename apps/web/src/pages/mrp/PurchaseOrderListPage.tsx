import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PurchaseOrder } from '@scaffold/types';
import { Button } from '../../components/ui/button';
import { Plus, Eye, Check, X, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
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

    // Warehouse selection
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
    const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);
    const [orderToReceive, setOrderToReceive] = useState<string | null>(null);
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


    const handleReceiveClick = (id: string) => {
        setOrderToReceive(id);
        setIsReceiveDialogOpen(true);
    };

    const handleConfirmReceive = async () => {
        if (!orderToReceive) return;

        try {
            await receiveOrder({ id: orderToReceive, warehouseId: selectedWarehouseId || undefined });
            toast({
                title: 'Éxito',
                description: 'Orden recibida e inventario actualizado',
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
            <div className="p-6">Cargando...</div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Órdenes de Compra</h1>
                    <p className="text-slate-600">Gestiona las compras de materias primas.</p>
                </div>
                <Button onClick={() => navigate('/mrp/purchase-orders/new')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Orden
                </Button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Proveedor
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Fecha Orden
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Estado
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Total
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {orders.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-4 text-center text-slate-500">
                                    No hay órdenes de compra registradas.
                                </td>
                            </tr>
                        ) : (
                            orders.map((order) => (
                                <tr key={order.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-slate-900">{order.supplier.name}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-slate-500">
                                            {new Date(order.orderDate).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[order.status]}`}>
                                            {statusLabels[order.status]}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                        {formatCurrency(order.totalAmount)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => navigate(`/mrp/purchase-orders/${order.id}`)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleReceiveClick(order.id)}
                                                        className="text-green-600 hover:text-green-700"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleCancel(order.id)}
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

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
                        <p className="text-sm text-slate-500">
                            ¿Estás seguro de recibir esta orden? Los artículos se agregarán al inventario.
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
