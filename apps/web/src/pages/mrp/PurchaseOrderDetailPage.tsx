import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import {
    ArrowLeft, Check, X, Loader2, FileText, Download,
    Calendar, Building2, CreditCard, Tag, FileSignature, ExternalLink, MessageSquare
} from 'lucide-react';
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
import { mrpApi } from '@/services/mrpApi';

const statusLabels: Record<string, string> = {
    PENDING: 'Pendiente',
    CONFIRMED: 'Confirmada',
    RECEIVED: 'Recibida',
    CANCELLED: 'Cancelada',
};

const statusColors: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200',
    RECEIVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CANCELLED: 'bg-slate-50 text-slate-700 border-slate-200',
};

const formatTraceReference = (prefix: 'REQ' | 'OP', rawId: string) => {
    const clean = rawId.trim();
    if (!clean) return `${prefix}-N/A`;
    return `${prefix}-${clean.slice(0, 8).toUpperCase()}`;
};

const prettifyOrderNotes = (notes: string) => {
    let text = notes.trim();
    if (!text) return text;

    const markers = [
        'Tipo de compra:', 'Lugar de entrega:', 'Forma de pago:', 'Moneda:',
        'Aprobador:', 'Requisitos de calidad:', 'Descuento:', 'Retención',
        'Otros cargos:', 'Total neto estimado:', 'Requisicion origen:',
        'Requisición origen:', 'OP origen:',
    ];
    for (const marker of markers) {
        const rx = new RegExp(`\\s(${marker.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')})`, 'g');
        text = text.replace(rx, `\n$1`);
    }

    text = text.replace(/Requisici(?:o|ó)n origen:\s*([a-f0-9-]{36})/gi, (_m, id: string) =>
        `Requisición origen: ${formatTraceReference('REQ', id)} (${id})`
    );
    text = text.replace(/OP origen:\s*([a-f0-9-]{36})/gi, (_m, id: string) =>
        `OP origen: ${formatTraceReference('OP', id)} (${id})`
    );

    return text;
};

export default function PurchaseOrderDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
    const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);
    const [downloadingPdf, setDownloadingPdf] = useState(false);

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

    const handleDownloadPdf = async () => {
        if (!id) return;
        try {
            setDownloadingPdf(true);
            const blob = await mrpApi.getPurchaseOrderPdf(id);
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = `${order?.code || 'OC'}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(objectUrl);
        } catch (error) {
            toast({
                title: 'Error',
                description: getErrorMessage(error, 'No se pudo descargar el PDF de la orden'),
                variant: 'destructive',
            });
        } finally {
            setDownloadingPdf(false);
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
        <div>
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
                {/* Hero Header */}
                <div className="mb-8 flex flex-col gap-6">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/mrp/purchase-orders')}
                        className="w-fit text-slate-500 hover:text-slate-900 -ml-2"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver al listado
                    </Button>

                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl ring-1 ring-indigo-100">
                                <FileText className="h-8 w-8" />
                            </div>
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                                        {order.code}
                                    </h1>
                                    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${statusColors[order.status]}`}>
                                        {statusLabels[order.status]}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500">
                                    Creada el {new Date(order.orderDate).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                            <Button
                                onClick={handleDownloadPdf}
                                variant="outline"
                                disabled={downloadingPdf}
                                className="bg-white hover:bg-slate-50 shadow-sm transition-all"
                            >
                                {downloadingPdf ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Download className="mr-2 h-4 w-4 text-slate-500" />
                                )}
                                Descargar PDF
                            </Button>
                            {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
                                <>
                                    <Button
                                        onClick={() => setIsReceiveDialogOpen(true)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm border-transparent transition-all"
                                    >
                                        <Check className="mr-2 h-4 w-4" />
                                        Recibir Inventario
                                    </Button>
                                    <Button
                                        onClick={handleCancel}
                                        variant="outline"
                                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 transition-all"
                                    >
                                        <X className="mr-2 h-4 w-4" />
                                        Cancelar
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Card 1: Resumen Principal */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
                            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
                                <Building2 className="h-5 w-5 text-slate-400" />
                                <h2 className="text-lg font-bold text-slate-800">Resumen Principal</h2>
                            </div>
                            <div className="space-y-5 flex-1">
                                <div>
                                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Proveedor</div>
                                    <div className="text-base font-medium text-slate-900">{order.supplier.name}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                            <Calendar className="h-3.5 w-3.5" /> Fecha Orden
                                        </div>
                                        <div className="text-sm font-medium text-slate-900 border-l-2 border-indigo-200 pl-2 py-0.5">
                                            {new Date(order.orderDate).toLocaleDateString()}
                                        </div>
                                    </div>
                                    {order.expectedDeliveryDate && (
                                        <div>
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                                <Calendar className="h-3.5 w-3.5" /> Fecha Esperada
                                            </div>
                                            <div className="text-sm font-medium text-slate-900 border-l-2 border-amber-200 pl-2 py-0.5">
                                                {new Date(order.expectedDeliveryDate).toLocaleDateString()}
                                            </div>
                                        </div>
                                    )}
                                    {order.receivedDate && (
                                        <div>
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                                <Check className="h-3.5 w-3.5 text-emerald-500" /> Fecha Recepción
                                            </div>
                                            <div className="text-sm font-medium text-slate-900 border-l-2 border-emerald-200 pl-2 py-0.5">
                                                {new Date(order.receivedDate).toLocaleDateString()}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Card 2: Detalles Comerciales */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
                            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
                                <Tag className="h-5 w-5 text-slate-400" />
                                <h2 className="text-lg font-bold text-slate-800">Detalles Comerciales</h2>
                            </div>
                            <div className="space-y-5 flex-1">
                                <div className="grid grid-cols-2 gap-4">
                                    {order.purchaseType && (
                                        <div>
                                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Tipo de compra</div>
                                            <div className="text-sm font-medium text-slate-900">{order.purchaseType}</div>
                                        </div>
                                    )}
                                    {order.paymentMethod && (
                                        <div>
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                                <CreditCard className="h-3.5 w-3.5" /> Forma de pago
                                            </div>
                                            <div className="text-sm font-medium text-slate-900">{order.paymentMethod}</div>
                                        </div>
                                    )}
                                </div>

                                {(order.documentControlCode || order.documentControlTitle) && (
                                    <div className="pt-4 border-t border-slate-50">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                            <FileSignature className="h-3.5 w-3.5" /> Control Documental
                                        </div>
                                        <div className="text-sm font-medium text-slate-900 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                            <span className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-slate-200 mr-2">
                                                {(order.documentControlCode || 'N/A')} v{order.documentControlVersion || 1}
                                            </span>
                                            {order.documentControlTitle || 'N/A'}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {order.notes && (
                        <div className="bg-indigo-50/50 rounded-xl border border-indigo-100 p-6 mx-auto">
                            <div className="flex items-center gap-2 mb-4">
                                <MessageSquare className="h-5 w-5 text-indigo-400" />
                                <h3 className="text-base font-bold text-slate-800">Notas y Trazabilidad</h3>
                            </div>
                            <div className="text-sm text-slate-700 leading-relaxed space-y-2">
                                {prettifyOrderNotes(order.notes)
                                    .split('\n')
                                    .map((line) => line.trim())
                                    .filter((line) => line.length > 0)
                                    .map((line, index) => {
                                        const requisitionMatch = line.match(/^Requisición origen:\s*(REQ-[A-Z0-9]+)\s*\(([a-f0-9-]{36})\)$/i);
                                        if (requisitionMatch) {
                                            const ref = requisitionMatch[1];
                                            const id = requisitionMatch[2];
                                            return (
                                                <div key={`note-${index}`} className="flex items-center gap-2 mt-2">
                                                    <span className="text-slate-500 font-medium">Origen:</span>
                                                    <button
                                                        type="button"
                                                        className="inline-flex items-center px-2.5 py-1 rounded-full bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 text-xs font-medium transition-colors shadow-sm"
                                                        onClick={() => navigate(`/mrp/purchase-requisitions?highlight=${id}`)}
                                                        title={id}
                                                    >
                                                        <ExternalLink className="h-3 w-3 mr-1.5" />
                                                        Requisición {ref}
                                                    </button>
                                                </div>
                                            );
                                        }

                                        const productionOrderMatch = line.match(/^OP origen:\s*(OP-[A-Z0-9]+)\s*\(([a-f0-9-]{36})\)$/i);
                                        if (productionOrderMatch) {
                                            const ref = productionOrderMatch[1];
                                            const id = productionOrderMatch[2];
                                            return (
                                                <div key={`note-${index}`} className="flex items-center gap-2 mt-2">
                                                    <span className="text-slate-500 font-medium">Origen:</span>
                                                    <button
                                                        type="button"
                                                        className="inline-flex items-center px-2.5 py-1 rounded-full bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 text-xs font-medium transition-colors shadow-sm"
                                                        onClick={() => navigate(`/mrp/production-orders/${id}`)}
                                                        title={id}
                                                    >
                                                        <ExternalLink className="h-3 w-3 mr-1.5" />
                                                        Orden de Prod. {ref}
                                                    </button>
                                                </div>
                                            );
                                        }

                                        return <div key={`note-${index}`}>{line}</div>;
                                    })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-6">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-800">Ítems de la Orden</h2>
                        <span className="text-sm font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                            {(order.items ?? []).length} {(order.items ?? []).length === 1 ? 'ítem' : 'ítems'}
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Descripción / Referencia
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Cantidad
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Precio Unitario
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Subtotal
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {(order.items ?? []).map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900">
                                                    {item.rawMaterial?.name || item.customDescription || 'Ítem libre'}
                                                </span>
                                                <span className="text-xs text-slate-500 font-mono mt-0.5">
                                                    {item.rawMaterial?.sku || 'N/A'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="text-sm font-medium text-slate-900">
                                                {item.quantity}
                                                <span className="text-slate-500 ml-1 text-xs">{item.rawMaterial?.unit || item.customUnit || ''}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="text-sm font-medium text-slate-900">
                                                {formatCurrency(item.unitPrice)}
                                            </div>
                                            {item.taxAmount > 0 && (
                                                <div className="text-[10px] font-medium text-slate-400 mt-0.5">
                                                    + {formatCurrency(item.taxAmount / item.quantity)} IVA
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="text-sm font-bold text-slate-900">
                                                {formatCurrency(item.subtotal)}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                                <tr>
                                    <td colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-slate-500">
                                        Subtotal (Base)
                                    </td>
                                    <td className="px-6 py-3 text-right text-sm font-semibold text-slate-900">
                                        {formatCurrency(order.subtotalBase)}
                                    </td>
                                </tr>
                                <tr>
                                    <td colSpan={3} className="px-6 py-2 text-right text-sm font-medium text-slate-500">
                                        IVA Total
                                    </td>
                                    <td className="px-6 py-2 text-right text-sm font-semibold text-slate-900">
                                        {formatCurrency(order.taxTotal)}
                                    </td>
                                </tr>
                                <tr className="bg-slate-100/50">
                                    <td colSpan={3} className="px-6 py-4 text-right font-bold text-slate-900">
                                        Total Bruto
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-lg text-slate-900 border-b border-slate-200">
                                        {formatCurrency(order.totalAmount)}
                                    </td>
                                </tr>
                                {order.discountAmount ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-2 text-right text-sm font-medium text-slate-500">
                                            Descuento Aplicado
                                        </td>
                                        <td className="px-6 py-2 text-right text-sm font-semibold text-emerald-600">
                                            - {formatCurrency(order.discountAmount)}
                                        </td>
                                    </tr>
                                ) : null}
                                {order.withholdingAmount ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-2 text-right text-sm font-medium text-slate-500">
                                            Retención ({order.withholdingRate || 0}%)
                                        </td>
                                        <td className="px-6 py-2 text-right text-sm font-semibold text-red-600">
                                            - {formatCurrency(order.withholdingAmount)}
                                        </td>
                                    </tr>
                                ) : null}
                                {order.otherChargesAmount ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-2 text-right text-sm font-medium text-slate-500">
                                            Otros cargos
                                        </td>
                                        <td className="px-6 py-2 text-right text-sm font-semibold text-slate-900">
                                            {formatCurrency(order.otherChargesAmount)}
                                        </td>
                                    </tr>
                                ) : null}
                                {order.netTotalAmount !== undefined ? (
                                    <tr>
                                        <td colSpan={4} className="p-0">
                                            <div className="bg-indigo-600 text-white flex justify-end items-center px-6 py-5">
                                                <span className="text-base font-medium text-indigo-100 mr-4 uppercase tracking-wider">Total Neto</span>
                                                <span className="text-3xl font-bold tracking-tight">{formatCurrency(order.netTotalAmount)}</span>
                                            </div>
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
        </div >
    );
}
