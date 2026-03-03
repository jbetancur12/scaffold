import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import { mrpApi } from '@/services/mrpApi';
import { ControlledDocument, DocumentCategory, DocumentStatus, Quotation, QuotationStatus } from '@scaffold/types';
import { FileDown, Pencil, RefreshCcw, Settings } from 'lucide-react';
import { useControlledDocumentsQuery } from '@/hooks/mrp/useQuality';
import { useOperationalConfigQuery, useSaveOperationalConfigMutation } from '@/hooks/mrp/useOperationalConfig';

const statusLabel: Record<QuotationStatus, string> = {
    [QuotationStatus.DRAFT]: 'Borrador',
    [QuotationStatus.SENT]: 'Enviada',
    [QuotationStatus.APPROVED_PARTIAL]: 'Aprob. Parcial',
    [QuotationStatus.APPROVED_FULL]: 'Aprob. Total',
    [QuotationStatus.REJECTED]: 'Rechazada',
    [QuotationStatus.CONVERTED]: 'Convertida',
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
            const payloadItems = (row.items || []).map((item: any) => {
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

    const canManageApproval = row.status !== QuotationStatus.CONVERTED;

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{row.code}</h1>
                    <p className="text-sm text-slate-500">{(row as any).customer?.name || row.customerId}</p>
                    <Badge variant="secondary" className="mt-2">{statusLabel[row.status]}</Badge>
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                    <Button variant="outline" onClick={load}><RefreshCcw className="h-4 w-4 mr-1" />Recargar</Button>
                    <Button variant="outline" onClick={() => navigate(`/mrp/quotations/${row.id}/edit`)}><Pencil className="h-4 w-4 mr-1" />Editar</Button>
                    <Button variant="outline" onClick={downloadPdf}><FileDown className="h-4 w-4 mr-1" />PDF</Button>
                    <Button variant="outline" size="icon" onClick={() => setShowPdfSettings(true)} title="Configurar PDF">
                        <Settings className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={() => setStatus(QuotationStatus.SENT)} disabled={row.status !== QuotationStatus.DRAFT}>Marcar enviada</Button>
                    <Button variant="outline" onClick={approveAll} disabled={!canManageApproval}>Aprobar todo</Button>
                    <Button variant="outline" onClick={savePartialApproval} disabled={!canManageApproval}>Guardar aprobación parcial</Button>
                    <Button onClick={convert} disabled={!canManageApproval}>Convertir a pedido</Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Ítems</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {(row.items || []).map((it: any) => (
                        <div key={it.id} className="border border-slate-200 rounded-xl p-3">
                            <p className="font-semibold text-slate-900">
                                {it.isCatalogItem
                                    ? `${it.product?.name || 'Producto'}${it.variant ? ` - ${it.variant.name}` : ''}`
                                    : it.customDescription || 'Ítem libre'}
                            </p>
                            <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                                <div className="text-xs text-slate-500">
                                    Cantidad solicitada
                                    <p className="text-sm text-slate-800 font-medium">{it.quantity}</p>
                                </div>
                                <div className="text-xs text-slate-500">
                                    Vr unit
                                    <p className="text-sm text-slate-800 font-medium">{Number(it.unitPrice || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</p>
                                </div>
                                <div className="text-xs text-slate-500">
                                    Desc
                                    <p className="text-sm text-slate-800 font-medium">{Number(it.discountPercent || 0).toFixed(2)}%</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-slate-500">Cantidad aprobada</p>
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
                                        className="w-full h-9 border border-slate-200 rounded-md px-2 text-sm disabled:bg-slate-100"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card><CardHeader><CardTitle className="text-sm">Subtotal</CardTitle></CardHeader><CardContent><p className="text-xl font-semibold">{Number(row.subtotalBase || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</p></CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm">Impuestos</CardTitle></CardHeader><CardContent><p className="text-xl font-semibold">{Number(row.taxTotal || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</p></CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm">Total Neto</CardTitle></CardHeader><CardContent><p className="text-xl font-semibold">{Number(row.netTotalAmount || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</p></CardContent></Card>
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
                                className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm"
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
                        <Button onClick={savePdfSettings} disabled={savingPdfSettings}>
                            {savingPdfSettings ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
