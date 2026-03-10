import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import { mrpApi } from '@/services/mrpApi';
import { ControlledDocument, DocumentCategory, DocumentStatus, Quotation, QuotationItemLineType, QuotationStatus } from '@scaffold/types';
import { FileDown, Pencil, RefreshCcw, Settings, ArrowLeft, Package, User, Calculator, CheckCircle2, StickyNote, ExternalLink, Receipt } from 'lucide-react';
import { useControlledDocumentsQuery } from '@/hooks/mrp/useQuality';
import { useOperationalConfigQuery, useSaveOperationalConfigMutation } from '@/hooks/mrp/useOperationalConfig';
import { formatCurrency } from '@/lib/utils';

const statusLabel: Record<QuotationStatus, string> = {
    [QuotationStatus.DRAFT]: 'Borrador',
    [QuotationStatus.SENT]: 'Enviada',
    [QuotationStatus.APPROVED_PARTIAL]: 'Aprob. Parcial',
    [QuotationStatus.APPROVED_FULL]: 'Aprob. Total',
    [QuotationStatus.REJECTED]: 'Rechazada',
    [QuotationStatus.CONVERTED]: 'Convertida',
};

const statusColors: Record<QuotationStatus, string> = {
    [QuotationStatus.DRAFT]: 'bg-slate-100 text-slate-800 border-slate-200',
    [QuotationStatus.SENT]: 'bg-blue-100 text-blue-800 border-blue-200',
    [QuotationStatus.APPROVED_PARTIAL]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [QuotationStatus.APPROVED_FULL]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    [QuotationStatus.REJECTED]: 'bg-red-100 text-red-800 border-red-200',
    [QuotationStatus.CONVERTED]: 'bg-purple-100 text-purple-800 border-purple-200',
};

export default function QuotationDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [row, setRow] = useState<Quotation | null>(null);
    const [loading, setLoading] = useState(false);
    const [approvals, setApprovals] = useState<Record<string, number>>({});
    const [showPdfSettings, setShowPdfSettings] = useState(false);
    const [draftPdfDocCode, setDraftPdfDocCode] = useState('');
    const { data: operationalConfig } = useOperationalConfigQuery();
    const { execute: saveOperationalConfig, loading: savingPdfSettings } = useSaveOperationalConfigMutation();
    const { data: controlledDocuments } = useControlledDocumentsQuery({
        documentCategory: DocumentCategory.FOR,
        status: DocumentStatus.APROBADO,
    });

    const latestDocByCode = useMemo(
        () =>
            (controlledDocuments ?? []).reduce<Record<string, ControlledDocument>>((acc, doc) => {
                const current = acc[doc.code];
                if (!current || doc.version > current.version) acc[doc.code] = doc;
                return acc;
            }, {}),
        [controlledDocuments]
    );
    const documentCodeOptions = useMemo(
        () => Object.values(latestDocByCode).sort((a, b) => a.code.localeCompare(b.code)),
        [latestDocByCode]
    );

    const load = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const data = await mrpApi.getQuotation(id);
            setRow(data);
            const nextApprovals: Record<string, number> = {};
            (data.items || []).forEach((item: any) => {
                if (item.lineType === QuotationItemLineType.NOTE) return;
                nextApprovals[item.id] = Number(item.approvedQuantity ?? 0);
            });
            setApprovals(nextApprovals);
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo cargar la cotización'), variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        setDraftPdfDocCode(operationalConfig?.defaultSalesOrderBillingDocCode || '');
    }, [operationalConfig]);

    const setStatus = async (status: QuotationStatus) => {
        if (!id) return;
        try {
            await mrpApi.updateQuotationStatus(id, { status });
            await load();
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo cambiar estado'), variant: 'destructive' });
        }
    };

    const approveAll = async () => {
        if (!id) return;
        try {
            await mrpApi.approveQuotation(id, {});
            await load();
            toast({ title: 'Aprobada', description: 'Cotización aprobada' });
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo aprobar'), variant: 'destructive' });
        }
    };

    const savePartialApproval = async () => {
        if (!id || !row) return;
        try {
            const payloadItems = (row.items || [])
                .filter((item: any) => item.lineType !== QuotationItemLineType.NOTE)
                .map((item: any) => {
                const maxQty = Number(item.quantity || 0);
                const requested = Number(approvals[item.id] ?? item.approvedQuantity ?? 0);
                const approvedQuantity = Math.max(0, Math.min(maxQty, requested));
                return {
                    quotationItemId: item.id,
                    approved: approvedQuantity > 0,
                    approvedQuantity,
                };
            });
            await mrpApi.approveQuotation(id, { items: payloadItems });
            await load();
            toast({ title: 'Aprobación guardada', description: 'Cantidades aprobadas actualizadas' });
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo guardar aprobación'), variant: 'destructive' });
        }
    };

    const convert = async () => {
        if (!id) return;
        try {
            const res = await mrpApi.convertQuotation(id, {});
            toast({ title: 'Convertida', description: `Pedido ${res.salesOrderCode} generado` });
            navigate(`/mrp/sales-orders/${res.salesOrderId}`);
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo convertir'), variant: 'destructive' });
        }
    };

    const downloadPdf = async () => {
        if (!id || !row) return;
        try {
            const configuredCode = operationalConfig?.defaultSalesOrderBillingDocCode || '';
            const selectedDoc = configuredCode ? latestDocByCode[configuredCode] : undefined;
            const blob = await mrpApi.getQuotationPdf(id, {
                docCode: selectedDoc?.code || undefined,
                docTitle: selectedDoc?.title || undefined,
                docVersion: selectedDoc?.version || undefined,
            });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${row.code}.pdf`;
            document.body.appendChild(link);
            link.click();
            URL.revokeObjectURL(link.href);
            document.body.removeChild(link);
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo generar PDF'), variant: 'destructive' });
        }
    };

    const savePdfSettings = async () => {
        if (!operationalConfig) return;
        try {
            const payload = {
                ...(operationalConfig as any),
                defaultSalesOrderBillingDocCode: draftPdfDocCode || null,
            };
            await saveOperationalConfig(payload);
            toast({ title: 'Guardado', description: 'Configuración de PDF actualizada' });
            setShowPdfSettings(false);
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo guardar la configuración PDF'), variant: 'destructive' });
        }
    };

    if (loading || !row) {
        return <div className="p-6 text-sm text-slate-500">Cargando...</div>;
    }

    const itemCostRows = (row.items || [])
        .filter((item: any) => item.lineType !== QuotationItemLineType.NOTE)
        .map((item: any) => {
        const quantity = Number(item.quantity || 0);
        const variant = item.variant;
        let laborUnitCost = Number(variant?.laborCost || 0);
        let indirectUnitCost = Number(variant?.indirectCost || 0);

        if (variant?.productionMinutes && operationalConfig) {
            laborUnitCost = Number(variant.productionMinutes || 0) * Number(operationalConfig.modCostPerMinute || 0);
            indirectUnitCost = Number(variant.productionMinutes || 0) * Number(operationalConfig.cifCostPerMinute || 0);
        }

        const totalUnitCost = Number(item.baseUnitCost || 0);
        const materialUnitCost = Math.max(0, totalUnitCost - laborUnitCost - indirectUnitCost);

        return {
            item,
            quantity,
            materialCost: materialUnitCost * quantity,
            laborCost: laborUnitCost * quantity,
            indirectCost: indirectUnitCost * quantity,
            totalCost: totalUnitCost * quantity,
        };
    });

    const totalMaterialCost = itemCostRows.reduce((sum, row) => sum + row.materialCost, 0);
    const totalLaborCost = itemCostRows.reduce((sum, row) => sum + row.laborCost, 0);
    const totalIndirectCost = itemCostRows.reduce((sum, row) => sum + row.indirectCost, 0);
    const totalQuotedCost = itemCostRows.reduce((sum, row) => sum + row.totalCost, 0);
    const estimatedMarginAmount = Number(row.netTotalAmount || 0) - totalQuotedCost;
    const estimatedMarginPercent = Number(row.netTotalAmount || 0) > 0
        ? (estimatedMarginAmount / Number(row.netTotalAmount || 0)) * 100
        : 0;

    const canManageApproval = row.status !== QuotationStatus.CONVERTED && row.status !== QuotationStatus.REJECTED;

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/mrp/quotations')} className="shrink-0">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
                            {row.code}
                            <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border ${statusColors[row.status]}`}>
                                {statusLabel[row.status]}
                            </span>
                        </h1>
                        <p className="text-slate-500 mt-1 flex items-center gap-2">
                            {(row as any).customer?.name || row.customerId}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Button variant="outline" onClick={load} className="border-slate-200 text-slate-700 hover:bg-slate-50"><RefreshCcw className="h-4 w-4 mr-2" />Recargar</Button>
                    <Button variant="outline" onClick={() => navigate(`/mrp/quotations/${row.id}/edit`)} className="border-slate-200 text-slate-700 hover:bg-slate-50"><Pencil className="h-4 w-4 mr-2" />Editar</Button>
                    <Button variant="outline" onClick={downloadPdf} className="border-slate-200 text-slate-700 hover:bg-slate-50"><FileDown className="h-4 w-4 mr-2" />PDF</Button>
                    <Button variant="outline" size="icon" onClick={() => setShowPdfSettings(true)} title="Configurar PDF">
                        <Settings className="h-4 w-4" />
                    </Button>

                    {row.status === QuotationStatus.DRAFT && (
                        <Button variant="default" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setStatus(QuotationStatus.SENT)}>
                            Marcar enviada
                        </Button>
                    )}
                    {canManageApproval && row.status !== QuotationStatus.APPROVED_FULL && (
                        <Button variant="default" className="bg-emerald-600 hover:bg-emerald-700" onClick={approveAll}>
                            Aprobar Todo
                        </Button>
                    )}
                    {canManageApproval && (row.status === QuotationStatus.APPROVED_PARTIAL || row.status === QuotationStatus.APPROVED_FULL) && (
                        <Button variant="default" className="bg-purple-600 hover:bg-purple-700" onClick={convert}>
                            Convertir a Pedido
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Package className="h-5 w-5 text-indigo-600" />
                                Ítems de la Cotización
                            </h2>
                            <div className="flex items-center gap-3">
                                {canManageApproval && (
                                    <Button size="sm" variant="outline" onClick={savePartialApproval}>
                                        <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" />
                                        Guardar cambios de cantidad
                                    </Button>
                                )}
                                <div className="text-sm text-slate-500 font-medium">
                                    {row.items?.length || 0} {row.items?.length === 1 ? 'ítem' : 'ítems'}
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold text-slate-600 min-w-[200px]">Producto/Detalle</th>
                                        <th className="px-6 py-4 font-semibold text-slate-600 text-right">Cant. Solicitada</th>
                                        <th className="px-6 py-4 font-semibold text-slate-600 text-right">Cant. Aprobada</th>
                                        <th className="px-6 py-4 font-semibold text-slate-600 text-right">Vr Unit.</th>
                                        <th className="px-6 py-4 font-semibold text-slate-600 text-right">Desc. %</th>
                                        <th className="px-6 py-4 font-semibold text-slate-600 text-right">Costo Est.</th>
                                        <th className="px-6 py-4 font-semibold text-slate-600 text-right">Total Neto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(row.items || []).map((it: any) => {
                                        if (it.lineType === QuotationItemLineType.NOTE) {
                                            return (
                                                <tr key={it.id} className="bg-amber-50/50">
                                                    <td className="px-6 py-4" colSpan={7}>
                                                        <div className="flex items-start gap-3 text-slate-700">
                                                            <StickyNote className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                                                            <div>
                                                                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Nota de cotización</p>
                                                                <p className="mt-1 whitespace-pre-line text-sm">{it.noteText || it.customDescription || 'Sin texto'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        }
                                        const subtotal = Number(it.quantity || 0) * Number(it.unitPrice || 0);
                                        const discountVal = subtotal * (Number(it.discountPercent || 0) / 100);
                                        const netItem = subtotal - discountVal;

                                        return (
                                            <tr key={it.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-slate-900">
                                                        {it.isCatalogItem
                                                            ? `${it.product?.name || 'Producto'}${it.variant ? ` - ${it.variant.name}` : ''}`
                                                            : it.customDescription || 'Ítem libre'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium text-slate-600">
                                                    {it.quantity}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={Number(it.quantity || 0)}
                                                        step="0.001"
                                                        value={approvals[it.id] ?? Number(it.approvedQuantity || 0)}
                                                        onChange={(e) => {
                                                            const requested = Number(e.target.value);
                                                            const maxQty = Number(it.quantity || 0);
                                                            const safe = Number.isFinite(requested) ? Math.max(0, Math.min(maxQty, requested)) : 0;
                                                            setApprovals((prev) => ({ ...prev, [it.id]: safe }));
                                                        }}
                                                        disabled={!canManageApproval}
                                                        className="w-24 h-8 border border-slate-200 rounded-md px-2 text-sm text-right focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 inline-block"
                                                    />
                                                </td>
                                                <td className="px-6 py-4 text-right text-slate-600">
                                                    {formatCurrency(Number(it.unitPrice || 0))}
                                                </td>
                                                <td className="px-6 py-4 text-right text-slate-600">
                                                    {Number(it.discountPercent || 0).toFixed(2)}%
                                                </td>
                                                <td className="px-6 py-4 text-right text-slate-600">
                                                    {formatCurrency(Number(it.baseUnitCost || 0) * Number(it.quantity || 0))}
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-slate-900">
                                                    {formatCurrency(netItem)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <User className="h-5 w-5 text-indigo-600" />
                                Información Cliente
                            </h2>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Nombre</label>
                                <div className="text-sm font-medium text-slate-900">{(row as any).customer?.name || row.customerId}</div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Identificación</label>
                                <div className="text-sm text-slate-700">{(row as any).customer?.documentNumber || (row as any).customer?.taxId || 'No registrada'}</div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Email</label>
                                <div className="text-sm text-slate-700">{(row as any).customer?.email || 'No registrado'}</div>
                            </div>
                        </div>
                    </div>

                    {row.convertedSalesOrder && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-5 border-b border-slate-100">
                                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Receipt className="h-5 w-5 text-purple-600" />
                                    Pedido Vinculado
                                </h2>
                            </div>
                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Pedido generado</label>
                                    <div className="text-sm font-medium text-slate-900">{row.convertedSalesOrder.code}</div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Estado</label>
                                    <div className="text-sm text-slate-700">{row.convertedSalesOrder.status}</div>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={() => navigate(`/mrp/sales-orders/${row.convertedSalesOrder?.id}`)}
                                    className="w-full border-slate-200 text-slate-700 hover:bg-slate-50"
                                >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Ver pedido
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Calculator className="h-5 w-5 text-emerald-600" />
                                Estructura de Costo
                            </h2>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Materia prima</p>
                                    <p className="mt-1 text-base font-bold text-slate-900">{formatCurrency(totalMaterialCost)}</p>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-[11px] uppercase tracking-wide text-slate-500">MOD</p>
                                    <p className="mt-1 text-base font-bold text-slate-900">{formatCurrency(totalLaborCost)}</p>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-[11px] uppercase tracking-wide text-slate-500">CIF</p>
                                    <p className="mt-1 text-base font-bold text-slate-900">{formatCurrency(totalIndirectCost)}</p>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Costo total</p>
                                    <p className="mt-1 text-base font-bold text-slate-900">{formatCurrency(totalQuotedCost)}</p>
                                </div>
                            </div>
                            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-xs uppercase tracking-wider text-emerald-700">Margen estimado</p>
                                        <p className="mt-1 text-lg font-bold text-emerald-900">{formatCurrency(estimatedMarginAmount)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-black text-emerald-700">{estimatedMarginPercent.toFixed(1)}%</p>
                                        <p className="text-xs text-emerald-700">sobre valor neto cotizado</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Calculator className="h-5 w-5 text-indigo-600" />
                                Resumen Financiero
                            </h2>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500 font-medium">Subtotal</span>
                                <span className="text-slate-900 font-medium">{formatCurrency(Number(row.subtotalBase || 0))}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500 font-medium">Impuestos</span>
                                <span className="text-slate-900 font-medium">{formatCurrency(Number(row.taxTotal || 0))}</span>
                            </div>
                            {Number(row.discountAmount || 0) > 0 && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium">Descuento Global</span>
                                    <span className="text-slate-900 font-medium text-red-600">-{formatCurrency(Number(row.discountAmount || 0))}</span>
                                </div>
                            )}
                            <div className="pt-3 flex justify-between items-center border-t border-slate-100 text-base">
                                <span className="text-slate-900 font-bold">Total Neto</span>
                                <span className="text-indigo-700 font-black">{formatCurrency(Number(row.netTotalAmount || 0))}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={showPdfSettings} onOpenChange={setShowPdfSettings}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Configuración PDF de Cotización</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <Label>Documento controlado por defecto</Label>
                            <select
                                className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                value={draftPdfDocCode}
                                onChange={(e) => setDraftPdfDocCode(e.target.value)}
                            >
                                <option value="">Usar fallback automático</option>
                                {documentCodeOptions.map((doc) => (
                                    <option key={doc.code} value={doc.code}>
                                        {doc.code} - {doc.title} (v{doc.version})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <p className="text-xs text-slate-500">
                            Si no seleccionas uno, el sistema usa fallback automático en backend.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPdfSettings(false)}>Cancelar</Button>
                        <Button onClick={savePdfSettings} disabled={savingPdfSettings} className="bg-indigo-600 hover:bg-indigo-700">
                            {savingPdfSettings ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
