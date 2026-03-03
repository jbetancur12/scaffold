import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mrpApi } from '@/services/mrpApi';
import { Quotation, QuotationStatus } from '@scaffold/types';
import { Plus, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';

const statusLabel: Record<QuotationStatus, string> = {
    [QuotationStatus.DRAFT]: 'Borrador',
    [QuotationStatus.SENT]: 'Enviada',
    [QuotationStatus.APPROVED_PARTIAL]: 'Aprob. Parcial',
    [QuotationStatus.APPROVED_FULL]: 'Aprob. Total',
    [QuotationStatus.REJECTED]: 'Rechazada',
    [QuotationStatus.CONVERTED]: 'Convertida',
};

export default function QuotationListPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [rows, setRows] = useState<Quotation[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<string>('');

    const load = async () => {
        try {
            setLoading(true);
            const res = await mrpApi.listQuotations(1, 50, {
                search: search || undefined,
                status: (status || undefined) as QuotationStatus | undefined,
            });
            setRows(res.data);
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo cargar cotizaciones'), variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 p-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Cotizaciones</h1>
                    <p className="text-sm text-slate-500">Gestiona propuestas comerciales antes de convertir a pedidos.</p>
                </div>
                <Button onClick={() => navigate('/mrp/quotations/new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Cotización
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filtros</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input placeholder="Buscar por código o cliente" value={search} onChange={(e) => setSearch(e.target.value)} />
                    <select className="h-10 border border-slate-200 rounded-md px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="">Todos los estados</option>
                        {Object.values(QuotationStatus).map((st) => (
                            <option key={st} value={st}>{statusLabel[st]}</option>
                        ))}
                    </select>
                    <Button variant="outline" onClick={load}>Aplicar</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Listado</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? <p className="text-sm text-slate-500">Cargando...</p> : (
                        <div className="space-y-3">
                            {rows.length === 0 && <p className="text-sm text-slate-500">Sin cotizaciones</p>}
                            {rows.map((row) => (
                                <button
                                    key={row.id}
                                    className="w-full text-left rounded-xl border border-slate-200 p-4 hover:bg-slate-50"
                                    onClick={() => navigate(`/mrp/quotations/${row.id}`)}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-slate-900 flex items-center gap-2">
                                                <FileText className="h-4 w-4" />
                                                {row.code}
                                            </p>
                                            <p className="text-xs text-slate-500">{(row as any).customer?.name || row.customerId}</p>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant="secondary">{statusLabel[row.status]}</Badge>
                                            <p className="text-sm font-semibold mt-1">{Number(row.netTotalAmount || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
