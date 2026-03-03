import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import { mrpApi } from '@/services/mrpApi';
import { Quotation, QuotationStatus } from '@scaffold/types';
import { FileDown, Pencil, RefreshCcw } from 'lucide-react';

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

    const load = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const data = await mrpApi.getQuotation(id);
            setRow(data);
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
            const blob = await mrpApi.getQuotationPdf(id);
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

    if (loading || !row) {
        return <div className="p-6 text-sm text-slate-500">Cargando...</div>;
    }

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
                    <Button variant="outline" onClick={() => setStatus(QuotationStatus.SENT)}>Marcar enviada</Button>
                    <Button variant="outline" onClick={approveAll}>Aprobar</Button>
                    <Button onClick={convert}>Convertir a pedido</Button>
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
                            <p className="text-xs text-slate-500">
                                Cant {it.quantity} | Aprob {it.approvedQuantity} | Vr {Number(it.unitPrice || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })} | Desc {it.discountPercent || 0}%
                            </p>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card><CardHeader><CardTitle className="text-sm">Subtotal</CardTitle></CardHeader><CardContent><p className="text-xl font-semibold">{Number(row.subtotalBase || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</p></CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm">Impuestos</CardTitle></CardHeader><CardContent><p className="text-xl font-semibold">{Number(row.taxTotal || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</p></CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm">Total Neto</CardTitle></CardHeader><CardContent><p className="text-xl font-semibold">{Number(row.netTotalAmount || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</p></CardContent></Card>
            </div>
        </div>
    );
}
