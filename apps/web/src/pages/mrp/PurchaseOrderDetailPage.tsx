import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { ArrowLeft, Check, X, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api-error';
import { useMrpQueryErrorRedirect } from '@/hooks/mrp/useMrpQueryErrorRedirect';
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
import { useCancelPurchaseOrderMutation, usePurchaseOrderQuery, useReceivePurchaseOrderMutation } from '@/hooks/mrp/usePurchaseOrders';

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

export default function PurchaseOrderDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
    const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);

    const { data: order, loading, error, execute: reloadOrder } = usePurchaseOrderQuery(id);
    const { data: warehousesData, error: warehousesError } = useWarehousesQuery();
    const { execute: receiveOrder, loading: submitting } = useReceivePurchaseOrderMutation();
    const { execute: cancelOrder } = useCancelPurchaseOrderMutation();
    const warehouses = warehousesData ?? [];

    useMrpQueryErrorRedirect(error, 'No se pudo cargar la orden de compra', '/mrp/purchase-orders');
    useMrpQueryErrorToast(warehousesError, 'No se pudieron cargar los almacenes');

    const handleReceive = async () => {
        if (!id) return;
        try {
            await receiveOrder({ id, warehouseId: selectedWarehouseId || undefined });
            toast({
                title: 'Éxito',
                description: 'Orden recibida e inventario actualizado',
            });
            setIsReceiveDialogOpen(false);
            await reloadOrder({ force: true });
        } catch (error) {
            toast({
                title: 'Error',
                description: getErrorMessage(error, 'No se pudo recibir la orden'),
                variant: 'destructive',
            });
        }
    };

    const handleCancel = async () => {
        if (!confirm('¿Estás seguro de cancelar esta orden?')) return;
        if (!id) return;

        try {
            await cancelOrder(id);
            toast({
                title: 'Éxito',
                description: 'Orden cancelada',
            });
            navigate('/mrp/purchase-orders');
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

    if (!order) {
        return (
            <div className="p-6">Orden no encontrada</div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <Button
                    variant="ghost"
                    onClick={() => navigate('/mrp/purchase-orders')}
                    className="mb-4"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Button>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold">Orden de Compra</h1>
                        <p className="text-slate-600">Detalles de la orden de compra.</p>
                    </div>
                    <div className="flex gap-2">
                        {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
                            <>
                                <Button onClick={() => setIsReceiveDialogOpen(true)} variant="default">
                                    <Check className="mr-2 h-4 w-4" />
                                    Recibir Orden
                                </Button>
                                <Button onClick={handleCancel} variant="destructive">
                                    <X className="mr-2 h-4 w-4" />
                                    Cancelar
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Información General</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <div className="text-sm text-slate-600">Proveedor</div>
                            <div className="font-medium">{order.supplier.name}</div>
                        </div>
                        <div>
                            <div className="text-sm text-slate-600">Estado</div>
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[order.status]}`}>
                                {statusLabels[order.status]}
                            </span>
                        </div>
                        <div>
                            <div className="text-sm text-slate-600">Fecha de Orden</div>
                            <div className="font-medium">
                                {new Date(order.orderDate).toLocaleDateString()}
                            </div>
                        </div>
                        {order.expectedDeliveryDate && (
                            <div>
                                <div className="text-sm text-slate-600">Fecha Esperada de Entrega</div>
                                <div className="font-medium">
                                    {new Date(order.expectedDeliveryDate).toLocaleDateString()}
                                </div>
                            </div>
                        )}
                        {order.receivedDate && (
                            <div>
                                <div className="text-sm text-slate-600">Fecha de Recepción</div>
                                <div className="font-medium">
                                    {new Date(order.receivedDate).toLocaleDateString()}
                                </div>
                            </div>
                        )}
                        <div>
                            <div className="text-sm text-slate-600">Total</div>
                            <div className="font-medium text-lg">{formatCurrency(order.totalAmount)}</div>
                        </div>
                        {order.netTotalAmount !== undefined && (
                            <div>
                                <div className="text-sm text-slate-600">Total Neto</div>
                                <div className="font-medium text-lg">{formatCurrency(order.netTotalAmount)}</div>
                            </div>
                        )}
                        {order.purchaseType && (
                            <div>
                                <div className="text-sm text-slate-600">Tipo de compra</div>
                                <div className="font-medium">{order.purchaseType}</div>
                            </div>
                        )}
                        {order.paymentMethod && (
                            <div>
                                <div className="text-sm text-slate-600">Forma de pago</div>
                                <div className="font-medium">{order.paymentMethod}</div>
                            </div>
                        )}
                    </div>
                    {order.notes && (
                        <div className="mt-4">
                            <div className="text-sm text-slate-600">Notas</div>
                            <div className="mt-1 text-sm">{order.notes}</div>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Ítems de la Orden</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Materia Prima
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        SKU
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Cantidad
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Precio Unitario
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Subtotal
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {(order.items ?? []).map((item) => (
                                    <tr key={item.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-slate-900">
                                                {item.rawMaterial.name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-slate-500">{item.rawMaterial.sku}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="text-sm text-slate-900">
                                                {item.quantity} {item.rawMaterial.unit}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="text-sm text-slate-900">
                                                {formatCurrency(item.unitPrice)}
                                            </div>
                                            {item.taxAmount > 0 && (
                                                <div className="text-[10px] text-slate-400">
                                                    + {formatCurrency(item.taxAmount / item.quantity)} IVA
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="text-sm font-medium text-slate-900">
                                                {formatCurrency(item.subtotal)}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                                <tr>
                                    <td colSpan={4} className="px-6 py-2 text-right text-sm text-slate-500">
                                        Subtotal (Base):
                                    </td>
                                    <td className="px-6 py-2 text-right text-sm text-slate-700">
                                        {formatCurrency(order.subtotalBase)}
                                    </td>
                                </tr>
                                <tr>
                                    <td colSpan={4} className="px-6 py-2 text-right text-sm text-slate-500">
                                        IVA Total:
                                    </td>
                                    <td className="px-6 py-2 text-right text-sm text-slate-700">
                                        {formatCurrency(order.taxTotal)}
                                    </td>
                                </tr>
                                <tr className="bg-slate-100/50">
                                    <td colSpan={4} className="px-6 py-4 text-right font-bold text-slate-900">
                                        Total Bruto:
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-xl text-slate-900">
                                        {formatCurrency(order.totalAmount)}
                                    </td>
                                </tr>
                                {order.discountAmount ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-2 text-right text-sm text-slate-500">
                                            Descuento:
                                        </td>
                                        <td className="px-6 py-2 text-right text-sm text-slate-700">
                                            - {formatCurrency(order.discountAmount)}
                                        </td>
                                    </tr>
                                ) : null}
                                {order.withholdingAmount ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-2 text-right text-sm text-slate-500">
                                            Retención ({order.withholdingRate || 0}%):
                                        </td>
                                        <td className="px-6 py-2 text-right text-sm text-slate-700">
                                            - {formatCurrency(order.withholdingAmount)}
                                        </td>
                                    </tr>
                                ) : null}
                                {order.otherChargesAmount ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-2 text-right text-sm text-slate-500">
                                            Otros cargos:
                                        </td>
                                        <td className="px-6 py-2 text-right text-sm text-slate-700">
                                            {formatCurrency(order.otherChargesAmount)}
                                        </td>
                                    </tr>
                                ) : null}
                                {order.netTotalAmount !== undefined ? (
                                    <tr className="bg-slate-100/80">
                                        <td colSpan={4} className="px-6 py-4 text-right font-bold text-slate-900">
                                            Total Neto:
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-xl text-slate-900">
                                            {formatCurrency(order.netTotalAmount)}
                                        </td>
                                    </tr>
                                ) : null}
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>

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
                        <Button onClick={handleReceive} disabled={submitting}>
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
