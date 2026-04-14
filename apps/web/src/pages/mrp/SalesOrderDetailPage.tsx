import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
    ArrowLeft,
    Calendar,
    FileText,
    Package,
    Loader2,
    CheckCircle2,
    Truck,
    Clock,
    XCircle,
    User,
    Download,
    Factory,
    Receipt,
    Settings,
    Lock,
    Link,
    ExternalLink,
    Unlink,
    Edit2
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { useSalesOrderQuery, useUpdateSalesOrderStatusMutation } from '@/hooks/mrp/useSalesOrders';
import { useWarehousesQuery } from '@/hooks/mrp/useWarehouses';
import { useMrpQueryErrorToast } from '@/hooks/mrp/useMrpQueryErrorToast';
import { SalesOrderStatus, ProductionOrder, ProductionOrderStatus, ControlledDocument, DocumentCategory, WarehouseType } from '@scaffold/types';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import { mrpApi } from '@/services/mrpApi';
import { useControlledDocumentsQuery } from '@/hooks/mrp/useQuality';
import { useOperationalConfigQuery, useSaveOperationalConfigMutation } from '@/hooks/mrp/useOperationalConfig';

const formatDate = (dateString?: string | Date | null) => {
    if (!dateString) return '';
    return new Intl.DateTimeFormat('es-CO', {
        year: 'numeric', month: 'long', day: 'numeric'
    }).format(new Date(dateString));
};

const formatQuantity = (value?: number | null) => {
    const numericValue = Number(value || 0);
    return new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: Number.isInteger(numericValue) ? 0 : 2,
        maximumFractionDigits: 3,
    }).format(numericValue);
};

const statusColors = {
    [SalesOrderStatus.PENDING]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [SalesOrderStatus.IN_PRODUCTION]: 'bg-purple-100 text-purple-800 border-purple-200',
    [SalesOrderStatus.READY_TO_SHIP]: 'bg-blue-100 text-blue-800 border-blue-200',
    [SalesOrderStatus.SHIPPED]: 'bg-green-100 text-green-800 border-green-200',
    [SalesOrderStatus.CANCELLED]: 'bg-red-100 text-red-800 border-red-200',
};

const statusLabels = {
    [SalesOrderStatus.PENDING]: 'Pendiente',
    [SalesOrderStatus.IN_PRODUCTION]: 'En Producción',
    [SalesOrderStatus.READY_TO_SHIP]: 'Listo para Enviar',
    [SalesOrderStatus.SHIPPED]: 'Enviado',
    [SalesOrderStatus.CANCELLED]: 'Cancelado',
};

const statusIcons = {
    [SalesOrderStatus.PENDING]: Clock,
    [SalesOrderStatus.IN_PRODUCTION]: Package,
    [SalesOrderStatus.READY_TO_SHIP]: CheckCircle2,
    [SalesOrderStatus.SHIPPED]: Truck,
    [SalesOrderStatus.CANCELLED]: XCircle,
};

export default function SalesOrderDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    const { data: order, loading: isLoading, error, execute: reloadOrder } = useSalesOrderQuery(id!);
    const { execute: updateStatus, loading: isUpdatingStatus } = useUpdateSalesOrderStatusMutation();
    const { data: warehouses } = useWarehousesQuery();

    // Link Production Order dialog
    const [showLinkPoDialog, setShowLinkPoDialog] = useState(false);
    const [allProductionOrders, setAllProductionOrders] = useState<ProductionOrder[]>([]);
    const [selectedPoId, setSelectedPoId] = useState('');
    const [linkingPo, setLinkingPo] = useState(false);
    const [unlinkingPoId, setUnlinkingPoId] = useState<string | null>(null);
    const [showSettlementDialog, setShowSettlementDialog] = useState(false);
    const [settlementWarehouseId, setSettlementWarehouseId] = useState('');
    const [settlementNotes, setSettlementNotes] = useState('');
    const [settlementQuantities, setSettlementQuantities] = useState<Record<string, number>>({});
    const [settlementRejectedQuantities, setSettlementRejectedQuantities] = useState<Record<string, number>>({});
    const [submittingSettlement, setSubmittingSettlement] = useState(false);

    // PDF dialog state
    const [showPdfDialog, setShowPdfDialog] = useState(false);
    const [pdfMode, setPdfMode] = useState<'production' | 'billing'>('production');
    const [downloadingPdf, setDownloadingPdf] = useState(false);

    // Per-mode doc code editing toggle
    const [editingProductionDoc, setEditingProductionDoc] = useState(false);
    const [editingBillingDoc, setEditingBillingDoc] = useState(false);
    const [draftProductionCode, setDraftProductionCode] = useState('');
    const [draftBillingCode, setDraftBillingCode] = useState('');
    const [savingDoc, setSavingDoc] = useState(false);

    // Operational config (source of truth for default doc codes)
    const { data: operationalConfig } = useOperationalConfigQuery();
    const { execute: saveOperationalConfig } = useSaveOperationalConfigMutation();

    // Controlled documents list for dropdown
    const { data: controlledDocumentsAll } = useControlledDocumentsQuery({ documentCategory: DocumentCategory.FOR });

    const latestDocByCode = useMemo(
        () =>
            (controlledDocumentsAll ?? []).reduce<Record<string, ControlledDocument>>((acc, doc) => {
                const current = acc[doc.code];
                if (!current || doc.version > current.version) acc[doc.code] = doc;
                return acc;
            }, {}),
        [controlledDocumentsAll]
    );
    const documentCodeOptions = useMemo(
        () => Object.values(latestDocByCode).sort((a, b) => a.code.localeCompare(b.code)),
        [latestDocByCode]
    );

    // Sync draft values with saved config
    useEffect(() => {
        setDraftProductionCode(operationalConfig?.defaultSalesOrderProductionDocCode || '');
        setDraftBillingCode(operationalConfig?.defaultSalesOrderBillingDocCode || '');
    }, [operationalConfig]);

    useEffect(() => {
        const finishedGoodsWarehouse = (warehouses || []).find((warehouse) => warehouse.type === WarehouseType.FINISHED_GOODS);
        if (finishedGoodsWarehouse && !settlementWarehouseId) {
            setSettlementWarehouseId(finishedGoodsWarehouse.id);
        }
    }, [warehouses, settlementWarehouseId]);

    const handleOpenLinkDialog = async () => {
        try {
            const result = await mrpApi.getProductionOrders(1, 100);
            setAllProductionOrders(result.orders || []);
            setSelectedPoId('');
        } catch { /* ignore */ }
        setShowLinkPoDialog(true);
    };

    const handleLinkPo = async () => {
        if (!selectedPoId) return;
        try {
            setLinkingPo(true);
            await mrpApi.linkProductionToSalesOrder(selectedPoId, id!);
            await reloadOrder({ force: true });
            setShowLinkPoDialog(false);
            toast({ title: 'Vinculado', description: 'Orden de producción vinculada al pedido' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo vincular'), variant: 'destructive' });
        } finally {
            setLinkingPo(false);
        }
    };

    const handleUnlinkPo = async (poId: string) => {
        if (!confirm('¿Desvincular esta orden de producción del pedido?')) return;
        try {
            setUnlinkingPoId(poId);
            await mrpApi.linkProductionToSalesOrder(poId, null);
            await reloadOrder({ force: true });
            toast({ description: 'Orden desvinculada' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo desvincular'), variant: 'destructive' });
        } finally {
            setUnlinkingPoId(null);
        }
    };

    useMrpQueryErrorToast(error, 'No se pudo cargar el pedido');

    const settlementRows = useMemo(
        () =>
            (order?.items ?? [])
                .filter((item) => item.variantId)
                .map((item) => ({
                    variantId: item.variantId as string,
                    productName: item.product?.name || 'Producto',
                    variantName: item.variant?.name || item.variant?.sku || 'Variante',
                    quantity: Number(item.quantity || 0),
                })),
        [order?.items]
    );

    const settlementTotalsByVariant = useMemo(
        () =>
            Object.fromEntries(
                settlementRows.map((row) => {
                    const completed = Number(settlementQuantities[row.variantId] || 0);
                    const rejected = Number(settlementRejectedQuantities[row.variantId] || 0);
                    return [row.variantId, Math.max(0, row.quantity - completed - rejected)];
                })
            ) as Record<string, number>,
        [settlementQuantities, settlementRejectedQuantities, settlementRows]
    );

    const settlementTotals = useMemo(
        () =>
            settlementRows.reduce(
                (acc, row) => {
                    const completed = Number(settlementQuantities[row.variantId] || 0);
                    const rejected = Number(settlementRejectedQuantities[row.variantId] || 0);
                    const cancelled = Math.max(0, row.quantity - completed - rejected);
                    return {
                        planned: acc.planned + row.quantity,
                        completed: acc.completed + completed,
                        rejected: acc.rejected + rejected,
                        cancelled: acc.cancelled + cancelled,
                    };
                },
                { planned: 0, completed: 0, rejected: 0, cancelled: 0 }
            ),
        [settlementQuantities, settlementRejectedQuantities, settlementRows]
    );

    if (isLoading || !order) {
        return (
            <div className="p-6 flex justify-center items-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const StatusIcon = statusIcons[order.status];
    const canEditOrder =
        order.status === SalesOrderStatus.PENDING &&
        (!order.productionOrders || order.productionOrders.length === 0);
    const activeProductionOrders = (order.productionOrders || []).filter(
        (productionOrder) => productionOrder.status !== ProductionOrderStatus.CANCELLED
    );
    const hasProductionStarted = activeProductionOrders.some(
        (productionOrder) =>
            productionOrder.status === ProductionOrderStatus.IN_PROGRESS ||
            productionOrder.status === ProductionOrderStatus.COMPLETED
    );
    const hasCompletedProduction = activeProductionOrders.some(
        (productionOrder) => productionOrder.status === ProductionOrderStatus.COMPLETED
    );
    const canCancelOrderNormally =
        order.status === SalesOrderStatus.PENDING ||
        (order.status === SalesOrderStatus.IN_PRODUCTION && !hasProductionStarted);
    const canCancelOrderWithSettlement =
        order.status === SalesOrderStatus.IN_PRODUCTION &&
        hasProductionStarted &&
        !hasCompletedProduction;

    const handleUpdateStatus = async (newStatus: SalesOrderStatus) => {
        try {
            await updateStatus({ id: order.id, payload: { status: newStatus } });
            toast({ title: 'Éxito', description: 'Estado actualizado correctamente' });
        } catch {
            toast({ title: 'Error', description: 'No se pudo actualizar el estado', variant: 'destructive' });
        }
    };

    const openSettlementDialog = () => {
        const initialQuantities = Object.fromEntries(
            settlementRows.map((row) => [row.variantId, 0])
        ) as Record<string, number>;
        const initialRejectedQuantities = Object.fromEntries(
            settlementRows.map((row) => [row.variantId, 0])
        ) as Record<string, number>;
        setSettlementQuantities(initialQuantities);
        setSettlementRejectedQuantities(initialRejectedQuantities);
        setSettlementNotes('');
        setShowSettlementDialog(true);
    };

    const handleSubmitSettlement = async () => {
        if (!settlementWarehouseId) {
            toast({ title: 'Dato requerido', description: 'Selecciona una bodega de producto terminado', variant: 'destructive' });
            return;
        }

        try {
            setSubmittingSettlement(true);
            await mrpApi.cancelSalesOrderWithSettlement(order.id, {
                warehouseId: settlementWarehouseId,
                notes: settlementNotes || undefined,
                items: settlementRows.map((row) => ({
                    variantId: row.variantId,
                    completedQuantity: Number(settlementQuantities[row.variantId] || 0),
                    rejectedQuantity: Number(settlementRejectedQuantities[row.variantId] || 0),
                })),
            });
            await reloadOrder({ force: true });
            setShowSettlementDialog(false);
            toast({ title: 'Pedido cancelado', description: 'Se liquidó la producción parcial y se canceló el pedido.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo cancelar con liquidación parcial'), variant: 'destructive' });
        } finally {
            setSubmittingSettlement(false);
        }
    };
    const cancellationSettlement = order.cancellationSettlement;

    const handleSaveDocCode = async (mode: 'production' | 'billing') => {
        if (!operationalConfig) return;
        try {
            setSavingDoc(true);
            const payload = {
                ...(operationalConfig as any),
                defaultSalesOrderProductionDocCode: mode === 'production' ? draftProductionCode || null : operationalConfig.defaultSalesOrderProductionDocCode,
                defaultSalesOrderBillingDocCode: mode === 'billing' ? draftBillingCode || null : operationalConfig.defaultSalesOrderBillingDocCode,
            };
            await saveOperationalConfig(payload);
            toast({ title: 'Guardado', description: 'Documento de control actualizado' });
            if (mode === 'production') setEditingProductionDoc(false);
            else setEditingBillingDoc(false);
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo guardar'), variant: 'destructive' });
        } finally {
            setSavingDoc(false);
        }
    };

    const handleDownloadPdf = async () => {
        if (!id) return;
        try {
            setDownloadingPdf(true);
            const docCode = pdfMode === 'production'
                ? (operationalConfig?.defaultSalesOrderProductionDocCode || undefined)
                : (operationalConfig?.defaultSalesOrderBillingDocCode || undefined);
            const selectedDoc = docCode ? latestDocByCode[docCode] : undefined;
            const blob = await mrpApi.getSalesOrderPdf(id, pdfMode, {
                docCode: selectedDoc?.code || undefined,
                docTitle: selectedDoc?.title || undefined,
                docVersion: selectedDoc?.version || undefined,
            });
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = `${order.code}-${pdfMode}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(objectUrl);
            setShowPdfDialog(false);
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo generar el PDF'), variant: 'destructive' });
        } finally {
            setDownloadingPdf(false);
        }
    };

    const handlePlanFulfillment = async () => {
        if (!order) return;
        try {
            const updated = await updateStatus({ id: order.id, payload: { status: SalesOrderStatus.IN_PRODUCTION } });
            await reloadOrder({ force: true });
            if (updated.status === SalesOrderStatus.READY_TO_SHIP) {
                toast({
                    title: 'Cobertura completa',
                    description: 'El pedido quedó listo para envío con stock disponible.',
                });
                return;
            }
            toast({
                title: 'Producción planificada',
                description: 'Se creó o reutilizó cobertura de producción para faltantes.',
            });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo planificar el cumplimiento del pedido'), variant: 'destructive' });
        }
    };

    const renderActionButtons = () => {
        if (isUpdatingStatus) {
            return (
                <Button disabled variant="outline">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />Actualizando...
                </Button>
            );
        }

        switch (order.status) {
            case SalesOrderStatus.PENDING:
            case SalesOrderStatus.IN_PRODUCTION:
                return (
                    <div className="flex flex-wrap gap-2">
                        {order.status === SalesOrderStatus.PENDING && (
                            <Button variant="default" className="bg-purple-600 hover:bg-purple-700"
                                onClick={handlePlanFulfillment}>
                                <Package className="mr-2 h-4 w-4" />Planificar cumplimiento
                            </Button>
                        )}
                        {canCancelOrderNormally ? (
                            <Button variant="destructive"
                                onClick={() => { if (confirm('¿Estás seguro de cancelar este pedido? Si la producción no ha iniciado, se cancelará automáticamente. Si ya inició, deberás liquidarla manualmente antes.')) handleUpdateStatus(SalesOrderStatus.CANCELLED); }}>
                                <XCircle className="mr-2 h-4 w-4" />Cancelar Pedido
                            </Button>
                        ) : canCancelOrderWithSettlement ? (
                            <Button variant="destructive" onClick={openSettlementDialog}>
                                <XCircle className="mr-2 h-4 w-4" />Cancelar con liquidación
                            </Button>
                        ) : (
                            <Button
                                variant="destructive"
                                disabled
                                title="Existe una OP completada. Debes gestionarla manualmente antes de cancelar el pedido."
                            >
                                <XCircle className="mr-2 h-4 w-4" />Cancelar Pedido
                            </Button>
                        )}
                    </div>
                );
            case SalesOrderStatus.READY_TO_SHIP:
                return (
                    <Button variant="default" className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleUpdateStatus(SalesOrderStatus.SHIPPED)}>
                        <Truck className="mr-2 h-4 w-4" />Marcar como Enviado
                    </Button>
                );
            default:
                return null;
        }
    };

    // Helper: render the locked/editable doc selector for a given mode
    const renderDocSelector = (mode: 'production' | 'billing') => {
        const isProduction = mode === 'production';
        const savedCode = isProduction
            ? operationalConfig?.defaultSalesOrderProductionDocCode
            : operationalConfig?.defaultSalesOrderBillingDocCode;
        const defaultFallback = isProduction ? 'GP-FOR-10 (por defecto)' : 'GAF-FOR-01 (por defecto)';
        const savedDoc = savedCode ? latestDocByCode[savedCode] : undefined;
        const isEditing = isProduction ? editingProductionDoc : editingBillingDoc;
        const draftCode = isProduction ? draftProductionCode : draftBillingCode;
        const setDraftCode = isProduction ? setDraftProductionCode : setDraftBillingCode;
        const setEditing = isProduction ? setEditingProductionDoc : setEditingBillingDoc;
        const accentColor = isProduction ? 'text-purple-700 bg-purple-50 border-purple-200' : 'text-blue-700 bg-blue-50 border-blue-200';
        const label = isProduction ? 'Documento para Producción' : 'Documento para Remisión';

        return (
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase text-slate-500 tracking-wider">{label}</Label>
                    <button
                        type="button"
                        onClick={() => { setEditing((v: boolean) => !v); setDraftCode(savedCode || ''); }}
                        className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded"
                        title="Cambiar documento de control">
                        <Settings className="h-3.5 w-3.5" />
                    </button>
                </div>

                {!isEditing ? (
                    /* Locked display */
                    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium ${savedDoc ? accentColor : 'text-slate-500 bg-slate-50 border-slate-200'}`}>
                        <Lock className="h-3.5 w-3.5 shrink-0 opacity-60" />
                        {savedDoc
                            ? <span>{savedDoc.code} — {savedDoc.title} <span className="opacity-60 font-normal">(v{savedDoc.version})</span></span>
                            : <span className="text-slate-400 font-normal italic">{defaultFallback}</span>
                        }
                    </div>
                ) : (
                    /* Edit mode */
                    <div className="space-y-2">
                        <select
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={draftCode}
                            onChange={(e) => setDraftCode(e.target.value)}>
                            <option value="">Automático ({defaultFallback})</option>
                            {documentCodeOptions.map((doc) => (
                                <option key={doc.code} value={doc.code}>
                                    {doc.code} (v{doc.version}, {doc.status}) — {doc.title}
                                </option>
                            ))}
                        </select>
                        <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleSaveDocCode(mode)} disabled={savingDoc} className="flex-1 text-xs">
                                {savingDoc ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}Guardar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="text-xs">Cancelar</Button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/mrp/sales-orders')} className="shrink-0">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
                            {order.code}
                            <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border ${statusColors[order.status]}`}>
                                <StatusIcon className="w-3.5 h-3.5 mr-1" />
                                {statusLabels[order.status]}
                            </span>
                        </h1>
                        <p className="text-slate-500 mt-1 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Creado el {formatDate(order.createdAt)}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {canEditOrder && (
                        <Button
                            variant="outline"
                            onClick={() => navigate(`/mrp/sales-orders/${order.id}/edit`)}
                            className="border-slate-200 text-slate-700 hover:bg-slate-50"
                        >
                            <Edit2 className="mr-2 h-4 w-4" />Editar
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => setShowPdfDialog(true)} className="border-slate-200 text-slate-700 hover:bg-slate-50">
                        <Download className="mr-2 h-4 w-4" />Exportar PDF
                    </Button>
                    {renderActionButtons()}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Package className="h-5 w-5 text-blue-600" />
                                Productos del Pedido
                            </h2>
                            <div className="text-sm text-slate-500 font-medium">
                                {order.items?.length || 0} {order.items?.length === 1 ? 'ítem' : 'ítems'}
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold text-slate-600">Producto</th>
                                        <th className="px-6 py-4 font-semibold text-slate-600">Variante</th>
                                        <th className="px-6 py-4 font-semibold text-slate-600 text-right">Cantidad</th>
                                        <th className="px-6 py-4 font-semibold text-slate-600 text-right">Precio Unit.</th>
                                        <th className="px-6 py-4 font-semibold text-slate-600 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(order.items || []).map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900">{item.product?.name}</div>
                                                <div className="text-slate-500 text-xs mt-0.5">{item.product?.sku}</div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">{(item as any).variant?.name || '—'}</td>
                                            <td className="px-6 py-4 text-right font-medium">{item.quantity}</td>
                                            <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(item.unitPrice)}</td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(item.quantity * item.unitPrice)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-50/80 border-t border-slate-200">
                                    <tr>
                                        <td colSpan={4} className="px-6 py-4 text-right font-semibold text-slate-700 text-base">Total del Pedido</td>
                                        <td className="px-6 py-4 text-right font-black text-blue-700 text-lg">{formatCurrency(order.totalAmount)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <User className="h-5 w-5 text-blue-600" />
                                Información del Cliente
                            </h2>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Nombre</label>
                                <div className="text-sm font-medium text-slate-900">{order.customer?.name}</div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Identificación / NIT</label>
                                <div className="text-sm text-slate-700">{(order.customer as any)?.documentNumber || (order.customer as any)?.taxId || 'No registrada'}</div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Email</label>
                                <div className="text-sm text-slate-700">{(order.customer as any)?.email || 'No registrado'}</div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Teléfono</label>
                                <div className="text-sm text-slate-700">{(order.customer as any)?.phone || 'No registrado'}</div>
                            </div>
                        </div>
                    </div>

                    {order.sourceQuotation && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-5 border-b border-slate-100">
                                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-indigo-600" />
                                    Cotización Origen
                                </h2>
                            </div>
                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Cotización</label>
                                    <div className="text-sm font-medium text-slate-900">{order.sourceQuotation.code}</div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Estado</label>
                                    <div className="text-sm text-slate-700">{order.sourceQuotation.status}</div>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={() => navigate(`/mrp/quotations/${order.sourceQuotation?.id}`)}
                                    className="w-full border-slate-200 text-slate-700 hover:bg-slate-50"
                                >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Ver cotización
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Factory className="h-5 w-5 text-blue-600" />
                                Órdenes de Producción
                            </h2>
                            <Button size="sm" variant="outline" onClick={handleOpenLinkDialog}
                                className="text-xs border-slate-200 hover:bg-slate-50">
                                <Link className="h-3.5 w-3.5 mr-1" />Vincular OP
                            </Button>
                        </div>
                        <div className="p-5">
                            {(!order.productionOrders || order.productionOrders.length === 0) ? (
                                <p className="text-sm text-slate-400 italic">Sin órdenes de producción vinculadas.</p>
                            ) : (
                                <div className="space-y-2">
                                    {order.productionOrders.map((po) => (
                                        <div key={po.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors group">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="font-semibold text-sm text-slate-900">{po.code}</span>
                                                <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${po.status === ProductionOrderStatus.COMPLETED ? 'bg-green-50 text-green-700 border-green-200' :
                                                    po.status === ProductionOrderStatus.IN_PROGRESS ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                        po.status === ProductionOrderStatus.CANCELLED ? 'bg-red-50 text-red-700 border-red-200' :
                                                            'bg-amber-50 text-amber-700 border-amber-200'
                                                    }`}>{po.status}</span>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button type="button"
                                                    onClick={() => navigate(`/mrp/production-orders/${po.id}`)}
                                                    className="p-1 rounded text-slate-400 hover:text-blue-600" title="Ver detalle">
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                </button>
                                                <button type="button"
                                                    onClick={() => handleUnlinkPo(po.id)}
                                                    disabled={unlinkingPoId === po.id}
                                                    className="p-1 rounded text-slate-400 hover:text-red-500" title="Desvincular">
                                                    {unlinkingPoId === po.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {cancellationSettlement && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-5 border-b border-slate-100">
                                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <XCircle className="h-5 w-5 text-red-600" />
                                    Liquidación de Cancelación
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Registrada el {formatDate(cancellationSettlement.settledAt)}
                                </p>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bodega destino</p>
                                            <p className="mt-1 text-sm font-semibold text-slate-900">{cancellationSettlement.warehouseName}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">OP vinculadas</p>
                                            <p className="mt-1 text-sm text-slate-900">{cancellationSettlement.productionOrderCodes.join(', ') || 'Sin OP'}</p>
                                        </div>
                                    </div>
                                    {cancellationSettlement.notes && (
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Observación</p>
                                            <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{cancellationSettlement.notes}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Planeado</p>
                                        <p className="mt-1 font-bold text-slate-900">{formatQuantity(cancellationSettlement.totalPlanned)}</p>
                                    </div>
                                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                                        <p className="text-[11px] uppercase tracking-wide text-emerald-700">Terminado</p>
                                        <p className="mt-1 font-bold text-emerald-900">{formatQuantity(cancellationSettlement.totalCompleted)}</p>
                                    </div>
                                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                                        <p className="text-[11px] uppercase tracking-wide text-rose-700">Rechazado</p>
                                        <p className="mt-1 font-bold text-rose-900">{formatQuantity(cancellationSettlement.totalRejected)}</p>
                                    </div>
                                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                                        <p className="text-[11px] uppercase tracking-wide text-amber-700">Cancelado</p>
                                        <p className="mt-1 font-bold text-amber-900">{formatQuantity(cancellationSettlement.totalCancelled)}</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Detalle por variante</p>
                                    <div className="space-y-2">
                                        {cancellationSettlement.items.map((item) => (
                                            <div key={item.variantId} className="rounded-lg border border-slate-200 p-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-900">{item.productName}</p>
                                                        <p className="text-xs text-slate-500">
                                                            {item.variantName}
                                                            {item.variantSku ? ` · ${item.variantSku}` : ''}
                                                        </p>
                                                    </div>
                                                    <p className="text-xs font-medium text-slate-500">
                                                        Planeado {formatQuantity(item.plannedQuantity)}
                                                    </p>
                                                </div>
                                                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                                                    <div className="rounded-md bg-emerald-50 px-2 py-2 text-emerald-800">
                                                        Terminado: {formatQuantity(item.completedQuantity)}
                                                    </div>
                                                    <div className="rounded-md bg-rose-50 px-2 py-2 text-rose-800">
                                                        Rechazado: {formatQuantity(item.rejectedQuantity)}
                                                    </div>
                                                    <div className="rounded-md bg-amber-50 px-2 py-2 text-amber-800">
                                                        Cancelado: {formatQuantity(item.cancelledQuantity)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}


                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-blue-600" />
                                Detalles Adicionales
                            </h2>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Fecha Esperada de Entrega</label>
                                <div className="text-sm text-slate-900 font-medium">
                                    {order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : 'No especificada'}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Notas</label>
                                <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 min-h-[4rem]">
                                    {order.notes || 'Ninguna nota adicional.'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── PDF Export Dialog ──────────────────────────────── */}
            <Dialog open={showPdfDialog} onOpenChange={setShowPdfDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Download className="h-5 w-5 text-blue-600" />
                            Exportar PDF — {order.code}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 py-2">
                        <div>
                            <Label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">Tipo de documento</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <button type="button" onClick={() => setPdfMode('production')}
                                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${pdfMode === 'production' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                                    <Factory className="h-6 w-6" />
                                    <span className="text-sm font-semibold">Producción</span>
                                    <span className="text-xs text-center opacity-70">Sin precios</span>
                                </button>
                                <button type="button" onClick={() => setPdfMode('billing')}
                                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${pdfMode === 'billing' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                                    <Receipt className="h-6 w-6" />
                                    <span className="text-sm font-semibold">Remisión</span>
                                    <span className="text-xs text-center opacity-70">Con precios</span>
                                </button>
                            </div>
                        </div>
                        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-1">
                            {pdfMode === 'production' ? renderDocSelector('production') : renderDocSelector('billing')}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPdfDialog(false)}>Cancelar</Button>
                        <Button onClick={handleDownloadPdf} disabled={downloadingPdf}
                            className={pdfMode === 'production' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}>
                            {downloadingPdf ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generando...</> : <><Download className="mr-2 h-4 w-4" />Descargar PDF</>}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Link Production Order Dialog ─────────────────── */}
            <Dialog open={showLinkPoDialog} onOpenChange={setShowLinkPoDialog}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Link className="h-5 w-5 text-blue-600" />
                            Vincular Orden de Producción
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-2 space-y-3">
                        <p className="text-sm text-slate-500">Selecciona una orden de producción para vincularla a este pedido.</p>
                        <select
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={selectedPoId}
                            onChange={(e) => setSelectedPoId(e.target.value)}>
                            <option value="">— Seleccionar orden —</option>
                            {allProductionOrders
                                .filter(po => !order.productionOrders?.some(linked => linked.id === po.id))
                                .map(po => (
                                    <option key={po.id} value={po.id}>
                                        {po.code} ({po.status})
                                    </option>
                                ))}
                        </select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowLinkPoDialog(false)}>Cancelar</Button>
                        <Button onClick={handleLinkPo} disabled={!selectedPoId || linkingPo} className="bg-blue-600 hover:bg-blue-700">
                            {linkingPo ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Vinculando...</> : <><Link className="mr-2 h-4 w-4" />Vincular</>}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showSettlementDialog} onOpenChange={setShowSettlementDialog}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Cancelar con Liquidación Parcial</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                            La liquidación parcial ingresará a bodega solo las cantidades terminadas. El resto quedará repartido entre rechazo y cancelación.
                        </div>
                        <div className="space-y-1.5">
                            <Label>Bodega destino</Label>
                            <select
                                value={settlementWarehouseId}
                                onChange={(e) => setSettlementWarehouseId(e.target.value)}
                                className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm"
                            >
                                <option value="">Selecciona una bodega...</option>
                                {(warehouses || [])
                                    .filter((warehouse) => warehouse.type === WarehouseType.FINISHED_GOODS)
                                    .map((warehouse) => (
                                        <option key={warehouse.id} value={warehouse.id}>
                                            {warehouse.name}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div className="space-y-3">
                            <Label>Cantidades terminadas a ingresar</Label>
                            {settlementRows.map((row) => (
                                <div key={row.variantId} className="grid grid-cols-1 md:grid-cols-[1.6fr_0.6fr_0.8fr_0.8fr] gap-3 rounded-lg border border-slate-200 p-3">
                                    <div>
                                        <p className="font-medium text-slate-900">{row.productName}</p>
                                        <p className="text-sm text-slate-500">{row.variantName}</p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Cancelado: {settlementTotalsByVariant[row.variantId] ?? row.quantity}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Planeado</p>
                                        <p className="text-sm font-semibold text-slate-900">{row.quantity}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs uppercase tracking-wide text-slate-500">Terminado</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={row.quantity}
                                            step={0.001}
                                            value={settlementQuantities[row.variantId] || ''}
                                            onChange={(e) =>
                                                {
                                                    const nextCompleted = Math.max(0, Number(e.target.value) || 0);
                                                    const currentRejected = Number(settlementRejectedQuantities[row.variantId] || 0);
                                                    const boundedCompleted = Math.min(row.quantity - currentRejected, nextCompleted);
                                                    setSettlementQuantities((current) => ({
                                                        ...current,
                                                        [row.variantId]: boundedCompleted,
                                                    }));
                                                }
                                            }
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs uppercase tracking-wide text-slate-500">Rechazado</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={row.quantity}
                                            step={0.001}
                                            value={settlementRejectedQuantities[row.variantId] || ''}
                                            onChange={(e) =>
                                                {
                                                    const nextRejected = Math.max(0, Number(e.target.value) || 0);
                                                    const currentCompleted = Number(settlementQuantities[row.variantId] || 0);
                                                    const boundedRejected = Math.min(row.quantity - currentCompleted, nextRejected);
                                                    setSettlementRejectedQuantities((current) => ({
                                                        ...current,
                                                        [row.variantId]: boundedRejected,
                                                    }));
                                                }
                                            }
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-1.5">
                            <Label>Observación</Label>
                            <Input
                                value={settlementNotes}
                                onChange={(e) => setSettlementNotes(e.target.value)}
                                placeholder="Motivo o contexto de la cancelación parcial"
                            />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                <p className="text-[11px] uppercase tracking-wide text-slate-500">Planeado</p>
                                <p className="mt-1 font-bold text-slate-900">{settlementTotals.planned}</p>
                            </div>
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                                <p className="text-[11px] uppercase tracking-wide text-emerald-700">Terminado</p>
                                <p className="mt-1 font-bold text-emerald-900">{settlementTotals.completed}</p>
                            </div>
                            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                                <p className="text-[11px] uppercase tracking-wide text-rose-700">Rechazado</p>
                                <p className="mt-1 font-bold text-rose-900">{settlementTotals.rejected}</p>
                            </div>
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                                <p className="text-[11px] uppercase tracking-wide text-amber-700">Cancelado</p>
                                <p className="mt-1 font-bold text-amber-900">{settlementTotals.cancelled}</p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSettlementDialog(false)}>Cerrar</Button>
                        <Button onClick={handleSubmitSettlement} disabled={submittingSettlement} className="bg-red-600 hover:bg-red-700">
                            {submittingSettlement ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Confirmar cancelación
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
