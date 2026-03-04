import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Quotation, QuotationStatus } from '@scaffold/types';
import { Plus, FileText, Search, Eye } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import { mrpApi } from '@/services/mrpApi';
import { formatCurrency } from '@/lib/utils';

const statusLabels: Record<QuotationStatus, string> = {
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

export default function QuotationListPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [rows, setRows] = useState<Quotation[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [page] = useState(1);
    const limit = 50;

    const load = async () => {
        try {
            setLoading(true);
            const res = await mrpApi.listQuotations(page, limit, {
                search: searchQuery || undefined,
                status: statusFilter !== 'ALL' ? (statusFilter as QuotationStatus) : undefined,
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
    }, [page, statusFilter]);

    const filteredOrders = rows.filter((order) => {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
            ((order as any).customer?.name || '').toLowerCase().includes(query) ||
            order.code.toLowerCase().includes(query);
        const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                        <FileText className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Cotizaciones</h1>
                        <p className="text-sm text-slate-500 mt-1">Gestiona propuestas comerciales antes de convertir a pedidos.</p>
                    </div>
                </div>
                <Button onClick={() => navigate('/mrp/quotations/new')} className="w-full sm:w-auto shadow-sm hover:shadow-md transition-all">
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Cotización
                </Button>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col lg:flex-row justify-between gap-4 mb-6">
                <div className="relative w-full lg:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Buscar por cliente o código..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && load()}
                        className="pl-9 h-11 bg-white border-slate-200 shadow-sm focus-visible:ring-indigo-500 rounded-lg text-sm"
                    />
                </div>

                {/* Horizontal Status Pills */}
                <div className="flex overflow-x-auto pb-2 -mb-2 lg:pb-0 lg:mb-0 gap-2 w-full lg:w-auto scrollbar-hide">
                    {[
                        { value: 'ALL', label: 'Todas' },
                        { value: QuotationStatus.DRAFT, label: 'Borrador' },
                        { value: QuotationStatus.SENT, label: 'Enviadas' },
                        { value: QuotationStatus.APPROVED_PARTIAL, label: 'Aprob. Parcial' },
                        { value: QuotationStatus.APPROVED_FULL, label: 'Aprob. Total' },
                        { value: QuotationStatus.REJECTED, label: 'Rechazadas' },
                        { value: QuotationStatus.CONVERTED, label: 'Convertidas' },
                    ].map((status) => (
                        <button
                            key={status.value}
                            onClick={() => setStatusFilter(status.value)}
                            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${statusFilter === status.value
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            {status.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="p-6 flex justify-center items-center h-64">
                    <p className="text-sm text-slate-500">Cargando cotizaciones...</p>
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                    <div className="h-24 w-24 bg-indigo-50/50 rounded-full flex items-center justify-center mb-6 ring-8 ring-slate-50">
                        <FileText className="h-12 w-12 text-indigo-300" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                        {rows.length === 0 ? "Sin Cotizaciones Registradas" : "No se encontraron resultados"}
                    </h3>
                    <p className="text-slate-500 mb-8 max-w-md text-base">
                        {rows.length === 0
                            ? "Aún no has registrado cotizaciones en el sistema. Comienza creando tu primera propuesta comercial."
                            : "No hay cotizaciones que coincidan con tu búsqueda y filtros actuales. Intenta cambiar los términos."}
                    </p>
                    {rows.length === 0 && (
                        <Button
                            onClick={() => navigate('/mrp/quotations/new')}
                            className="h-12 px-6 text-base shadow-sm hover:shadow-md hover:scale-105 transition-all"
                        >
                            <Plus className="mr-2 h-5 w-5" />
                            Crear primera cotización
                        </Button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Mobile Card View */}
                    <div className="grid grid-cols-1 gap-4 lg:hidden">
                        {filteredOrders.map((order) => (
                            <div key={order.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col gap-4 transition-all hover:shadow-md">
                                <div className="flex justify-between items-start gap-3">
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900 leading-tight">{(order as any).customer?.name || order.customerId}</h3>
                                        <div className="text-sm text-slate-500 font-mono mt-1">{order.code}</div>
                                    </div>
                                    <span className={`whitespace-nowrap px-2.5 py-1 text-xs font-semibold rounded-full border ${statusColors[order.status] || 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                                        {statusLabels[order.status] || order.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="text-right">
                                        <span className="text-slate-500 block text-xs uppercase font-medium tracking-wider">Total</span>
                                        <span className="text-slate-900 font-bold text-base">{formatCurrency(order.netTotalAmount || 0)}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-3 border-t border-slate-100 mt-1">
                                    <Button
                                        variant="outline"
                                        className="flex-1 h-10 border-slate-200 text-slate-700 hover:bg-slate-50"
                                        onClick={() => navigate(`/mrp/quotations/${order.id}`)}
                                    >
                                        <Eye className="h-4 w-4 mr-2" />
                                        Ver Detalle
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden lg:block bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Cotización
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Estado
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Total Neto
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {filteredOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors cursor-pointer" onClick={() => navigate(`/mrp/quotations/${order.id}`)}>
                                                    {(order as any).customer?.name || order.customerId}
                                                </span>
                                                <span className="text-xs text-slate-500 font-mono mt-0.5">{order.code}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${statusColors[order.status] || 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                                                {statusLabels[order.status] || order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-slate-900">
                                                {formatCurrency(order.netTotalAmount || 0)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => navigate(`/mrp/quotations/${order.id}`)}
                                                    title="Ver detalle"
                                                    className="h-8 w-8 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
