import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mrpApi } from '../../services/mrpApi';
import { Button } from '../../components/ui/button';
import { ArrowLeft, Check, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface PurchaseOrderItem {
    id: string;
    rawMaterial: {
        id: string;
        name: string;
        sku: string;
        unit: string;
    };
    quantity: number;
    unitPrice: number;
    subtotal: number;
}

interface PurchaseOrder {
    id: string;
    supplier: { id: string; name: string };
    orderDate: string;
    expectedDeliveryDate?: string;
    receivedDate?: string;
    status: 'PENDING' | 'CONFIRMED' | 'RECEIVED' | 'CANCELLED';
    totalAmount: number;
    notes?: string;
    items: PurchaseOrderItem[];
}

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
    const [order, setOrder] = useState<PurchaseOrder | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            loadOrder();
        }
    }, [id]);

    const loadOrder = async () => {
        try {
            setLoading(true);
            const response = await mrpApi.getPurchaseOrder(id!);
            setOrder(response.data);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'No se pudo cargar la orden de compra',
                variant: 'destructive',
            });
            navigate('/dashboard/mrp/purchase-orders');
        } finally {
            setLoading(false);
        }
    };

    const handleReceive = async () => {
        if (!confirm('¿Estás seguro de recibir esta orden? Esto actualizará el inventario.')) return;

        try {
            await mrpApi.receivePurchaseOrder(id!);
            toast({
                title: 'Éxito',
                description: 'Orden recibida e inventario actualizado',
            });
            loadOrder();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'No se pudo recibir la orden',
                variant: 'destructive',
            });
        }
    };

    const handleCancel = async () => {
        if (!confirm('¿Estás seguro de cancelar esta orden?')) return;

        try {
            await mrpApi.cancelPurchaseOrder(id!);
            toast({
                title: 'Éxito',
                description: 'Orden cancelada',
            });
            navigate('/dashboard/mrp/purchase-orders');
        } catch (error) {
            toast({
                title: 'Error',
                description: 'No se pudo cancelar la orden',
                variant: 'destructive',
            });
        }
    };

    if (loading) {
        return <div className="p-6">Cargando...</div>;
    }

    if (!order) {
        return <div className="p-6">Orden no encontrada</div>;
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <Button
                    variant="ghost"
                    onClick={() => navigate('/dashboard/mrp/purchase-orders')}
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
                                <Button onClick={handleReceive} variant="default">
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
                            <div className="font-medium text-lg">${order.totalAmount.toFixed(2)}</div>
                        </div>
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
                                {order.items.map((item) => (
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
                                                ${item.unitPrice.toFixed(2)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="text-sm font-medium text-slate-900">
                                                ${item.subtotal.toFixed(2)}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50">
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 text-right font-semibold">
                                        Total:
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-lg">
                                        ${order.totalAmount.toFixed(2)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
