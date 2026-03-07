import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ClipboardList, FileDown, ShoppingCart, XCircle } from 'lucide-react';
import { PurchaseRequisitionStatus } from '@scaffold/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import { useMrpQueryErrorRedirect } from '@/hooks/mrp/useMrpQueryErrorRedirect';
import { usePurchaseRequisitionQuery, useUpdatePurchaseRequisitionStatusMutation } from '@/hooks/mrp/usePurchaseRequisitions';
import { mrpApi } from '@/services/mrpApi';

const statusConfig: Record<PurchaseRequisitionStatus, { label: string; classes: string }> = {
    [PurchaseRequisitionStatus.PENDIENTE]: {
        label: 'Pendiente',
        classes: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    [PurchaseRequisitionStatus.APROBADA]: {
        label: 'Aprobada',
        classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    [PurchaseRequisitionStatus.CONVERTIDA]: {
        label: 'Convertida',
        classes: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    [PurchaseRequisitionStatus.CANCELADA]: {
        label: 'Cancelada',
        classes: 'bg-slate-50 text-slate-600 border-slate-200',
    },
};

export default function PurchaseRequisitionDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    const { data: requisition, loading, error, execute: reload } = usePurchaseRequisitionQuery(id);
    const { execute: updateStatus, loading: updatingStatus } = useUpdatePurchaseRequisitionStatusMutation();

    useMrpQueryErrorRedirect(error, 'No se pudo cargar la requisición', '/mrp/purchase-requisitions');

    const totalItems = requisition?.items?.length ?? 0;
    const totalUnits = useMemo(
        () => (requisition?.items ?? []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        [requisition?.items]
    );
    const associatedProductionOrders = requisition?.productionOrderIds?.length
        ? requisition.productionOrderIds
        : (requisition?.productionOrderId ? [requisition.productionOrderId] : []);

    const handleUpdateStatus = async (status: PurchaseRequisitionStatus) => {
        if (!id) return;
        try {
            await updateStatus({ id, status });
            await reload({ force: true });
            toast({ title: 'Requisición actualizada' });
        } catch (err) {
            toast({
                title: 'Error',
                description: getErrorMessage(err, 'No se pudo actualizar el estado de la requisición'),
                variant: 'destructive',
            });
        }
    };

    const handleDownloadPdf = async () => {
        if (!id) return;
        try {
            const blob = await mrpApi.getPurchaseRequisitionPdf(id);
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `REQ-${id.slice(0, 8).toUpperCase()}.pdf`;
            document.body.appendChild(link);
            link.click();
            URL.revokeObjectURL(link.href);
            document.body.removeChild(link);
        } catch (err) {
            toast({
                title: 'Error',
                description: getErrorMessage(err, 'No se pudo generar el PDF de la requisición'),
                variant: 'destructive',
            });
        }
    };

    if (loading) return <div className="p-6">Cargando requisición...</div>;
    if (!requisition) return <div className="p-6">Requisición no encontrada</div>;

    const cfg = statusConfig[requisition.status];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/20 to-slate-50 print:bg-white">
            <style>{`
                @media print {
                    .print-hidden { display: none !important; }
                    .print-shell { box-shadow: none !important; border-color: #e2e8f0 !important; }
                    body { background: white !important; }
                }
            `}</style>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <div className="print-hidden">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/mrp/purchase-requisitions')}
                        className="-ml-2 text-slate-500 hover:text-slate-900"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver a Requisiciones
                    </Button>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 print-shell">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-orange-50 rounded-2xl ring-1 ring-orange-100 shrink-0 print-hidden">
                                <ClipboardList className="h-6 w-6 text-orange-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                                    Requisición de Compra
                                </h1>
                                <p className="text-sm text-slate-500 mt-1">
                                    ID: {requisition.id}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 print-hidden">
                            <Button variant="outline" onClick={handleDownloadPdf}>
                                <FileDown className="mr-2 h-4 w-4" />
                                Descargar PDF
                            </Button>
                            {requisition.status === PurchaseRequisitionStatus.PENDIENTE && (
                                <Button
                                    variant="outline"
                                    disabled={updatingStatus}
                                    onClick={() => handleUpdateStatus(PurchaseRequisitionStatus.APROBADA)}
                                    className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                >
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Aprobar
                                </Button>
                            )}
                            {(requisition.status === PurchaseRequisitionStatus.PENDIENTE || requisition.status === PurchaseRequisitionStatus.APROBADA) && (
                                <Button
                                    onClick={() => navigate(`/mrp/purchase-orders/new?requisitionId=${requisition.id}`)}
                                    className="bg-orange-600 hover:bg-orange-700 text-white"
                                >
                                    <ShoppingCart className="mr-2 h-4 w-4" />
                                    Crear OC
                                </Button>
                            )}
                            {(requisition.status === PurchaseRequisitionStatus.PENDIENTE || requisition.status === PurchaseRequisitionStatus.APROBADA) && (
                                <Button
                                    variant="outline"
                                    disabled={updatingStatus}
                                    onClick={() => handleUpdateStatus(PurchaseRequisitionStatus.CANCELADA)}
                                    className="border-red-200 text-red-700 hover:bg-red-50"
                                >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Cancelar
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                            <div className="text-xs text-slate-500 uppercase tracking-wide">Solicitante</div>
                            <div className="text-sm font-semibold text-slate-900 mt-1">{requisition.requestedBy}</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                            <div className="text-xs text-slate-500 uppercase tracking-wide">Fecha</div>
                            <div className="text-sm font-semibold text-slate-900 mt-1">
                                {new Date(requisition.createdAt).toLocaleDateString('es-CO')}
                            </div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                            <div className="text-xs text-slate-500 uppercase tracking-wide">Estado</div>
                            <div className="mt-1">
                                <Badge variant="outline" className={cfg.classes}>
                                    {cfg.label}
                                </Badge>
                            </div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                            <div className="text-xs text-slate-500 uppercase tracking-wide">OP Asociadas</div>
                            <div className="text-sm font-semibold text-slate-900 mt-1">
                                {associatedProductionOrders.length > 0 ? `${associatedProductionOrders.length} seleccionada(s)` : 'Manual'}
                            </div>
                            {associatedProductionOrders.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {associatedProductionOrders.map((productionOrderId) => (
                                        <Badge key={productionOrderId} variant="outline" className="bg-white text-slate-700 border-slate-200 font-mono text-[10px]">
                                            OP-{productionOrderId.slice(0, 8).toUpperCase()}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {requisition.notes && (
                        <div className="mt-4 bg-orange-50/50 border border-orange-100 rounded-xl p-4">
                            <div className="text-xs text-slate-500 uppercase tracking-wide">Notas</div>
                            <p className="text-sm text-slate-700 mt-1 whitespace-pre-line">{requisition.notes}</p>
                        </div>
                    )}
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden print-shell">
                    <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                        <h2 className="font-semibold text-slate-800">Detalle de Ítems</h2>
                        <p className="text-sm text-slate-500">
                            {totalItems} ítems · {totalUnits.toLocaleString('es-CO')} unidades
                        </p>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/80">
                                <TableHead>Material</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead>Unidad</TableHead>
                                <TableHead className="text-right">Cantidad</TableHead>
                                <TableHead>Proveedor sugerido</TableHead>
                                <TableHead>Origen OP</TableHead>
                                <TableHead>Notas</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(requisition.items ?? []).map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium text-slate-900">{item.rawMaterial.name}</TableCell>
                                    <TableCell className="font-mono text-xs text-slate-600">{item.rawMaterial.sku}</TableCell>
                                    <TableCell className="text-slate-600">{item.rawMaterial.unit}</TableCell>
                                    <TableCell className="text-right font-semibold text-slate-900">
                                        {Number(item.quantity || 0).toLocaleString('es-CO')}
                                    </TableCell>
                                    <TableCell className="text-slate-700">{item.suggestedSupplier?.name || 'Sin sugerencia'}</TableCell>
                                    <TableCell className="text-slate-600">
                                        {item.sourceProductionOrders?.length ? (
                                            <div className="flex flex-wrap gap-1">
                                                {item.sourceProductionOrders.map((source) => (
                                                    <Badge key={`${source.productionOrderId}-${source.quantity}`} variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[10px]">
                                                        {(source.productionOrderCode || `OP-${source.productionOrderId.slice(0, 8).toUpperCase()}`)} · {Number(source.quantity).toLocaleString('es-CO')}
                                                    </Badge>
                                                ))}
                                            </div>
                                        ) : '—'}
                                    </TableCell>
                                    <TableCell className="text-slate-600">{item.notes || '—'}</TableCell>
                                </TableRow>
                            ))}
                            {(requisition.items?.length ?? 0) === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-slate-500 py-10">
                                        Esta requisición no tiene ítems.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
