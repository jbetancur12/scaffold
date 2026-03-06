import { useMemo, useState } from 'react';
import { ProductionAnalyticsDetailGroupBy, ProductionOrderStatus } from '@scaffold/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowDown, ArrowUp, BarChart3, Download, Factory, Loader2, Package, Users } from 'lucide-react';
import {
    useProductionAnalyticsDetailQuery,
    useProductionAnalyticsSummaryQuery,
    useProductionAnalyticsTopCustomersQuery,
    useProductionAnalyticsTopProductsQuery,
    useProductionAnalyticsTrendQuery,
} from '@/hooks/mrp/useProductionAnalytics';
import { useMrpQueryErrorToast } from '@/hooks/mrp/useMrpQueryErrorToast';
import { mrpApi } from '@/services/mrpApi';
import { getErrorMessage } from '@/lib/api-error';
import { useToast } from '@/components/ui/use-toast';

const nowMonth = new Date().toISOString().slice(0, 7);

const formatNumber = (value: number) => value.toLocaleString('es-CO', { maximumFractionDigits: 2 });

const statusFilterOptions = [
    { value: 'all', label: 'Todos los estados' },
    { value: ProductionOrderStatus.PLANNED, label: 'Planificadas' },
    { value: ProductionOrderStatus.IN_PROGRESS, label: 'En progreso' },
    { value: ProductionOrderStatus.COMPLETED, label: 'Completadas' },
    { value: ProductionOrderStatus.CANCELLED, label: 'Canceladas' },
];

const groupOptions: Array<{ value: ProductionAnalyticsDetailGroupBy; label: string }> = [
    { value: 'variant', label: 'Por variante' },
    { value: 'product', label: 'Por producto' },
    { value: 'customer', label: 'Por cliente' },
];

type DetailSortColumn = 'label' | 'producedQty' | 'plannedQty' | 'inProgressQty' | 'completionRatePercent' | 'orderCount';
type SortDirection = 'asc' | 'desc';

export default function ProductionAnalyticsPage() {
    const { toast } = useToast();
    const [month, setMonth] = useState(nowMonth);
    const [status, setStatus] = useState<string>('all');
    const [groupBy, setGroupBy] = useState<ProductionAnalyticsDetailGroupBy>('variant');
    const [exporting, setExporting] = useState(false);
    const [sortColumn, setSortColumn] = useState<DetailSortColumn>('producedQty');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    const filters = useMemo(() => ({
        month,
        status: status === 'all' ? undefined : status,
    }), [month, status]);

    const detailFilters = useMemo(() => ({
        ...filters,
        groupBy,
    }), [filters, groupBy]);

    const { data: summary, loading: loadingSummary, error: summaryError } = useProductionAnalyticsSummaryQuery(filters);
    const { data: trend, loading: loadingTrend, error: trendError } = useProductionAnalyticsTrendQuery(filters);
    const { data: topProducts, loading: loadingTopProducts, error: topProductsError } = useProductionAnalyticsTopProductsQuery(filters, 5);
    const { data: topCustomers, loading: loadingTopCustomers, error: topCustomersError } = useProductionAnalyticsTopCustomersQuery(filters, 5);
    const { data: detail, loading: loadingDetail, error: detailError } = useProductionAnalyticsDetailQuery(detailFilters);

    useMrpQueryErrorToast(summaryError, 'No se pudo cargar el resumen de analíticas');
    useMrpQueryErrorToast(trendError, 'No se pudo cargar la tendencia de producción');
    useMrpQueryErrorToast(topProductsError, 'No se pudo cargar top de productos');
    useMrpQueryErrorToast(topCustomersError, 'No se pudo cargar top de clientes');
    useMrpQueryErrorToast(detailError, 'No se pudo cargar el detalle de producción');

    const trendMax = useMemo(() => {
        const rows = trend || [];
        return rows.reduce((max, row) => Math.max(max, row.producedQty, row.plannedQty), 0) || 1;
    }, [trend]);

    const sortedDetailRows = useMemo(() => {
        const rows = [...(detail?.rows || [])];
        rows.sort((a, b) => {
            const aValue = a[sortColumn];
            const bValue = b[sortColumn];

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                const compare = aValue.localeCompare(bValue, 'es', { sensitivity: 'base' });
                return sortDirection === 'asc' ? compare : -compare;
            }

            const aNumber = Number(aValue || 0);
            const bNumber = Number(bValue || 0);
            if (aNumber === bNumber) return 0;
            return sortDirection === 'asc' ? aNumber - bNumber : bNumber - aNumber;
        });
        return rows;
    }, [detail?.rows, sortColumn, sortDirection]);

    const toggleSort = (column: DetailSortColumn) => {
        if (sortColumn === column) {
            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
            return;
        }
        setSortColumn(column);
        setSortDirection(column === 'label' ? 'asc' : 'desc');
    };

    const sortIcon = (column: DetailSortColumn) => {
        if (sortColumn !== column) return null;
        return sortDirection === 'asc'
            ? <ArrowUp className="h-3.5 w-3.5 ml-1" />
            : <ArrowDown className="h-3.5 w-3.5 ml-1" />;
    };

    const handleExport = async () => {
        try {
            setExporting(true);
            const blob = await mrpApi.exportProductionAnalyticsCsv(detailFilters);
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `analiticas_produccion_${groupBy}_${month}.csv`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
        } catch (error) {
            toast({
                title: 'Error',
                description: getErrorMessage(error, 'No se pudo exportar el reporte CSV'),
                variant: 'destructive',
            });
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            <Card className="p-6 border-slate-200">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                            <BarChart3 className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Analíticas de Producción</h1>
                            <p className="text-sm text-slate-500">Reporte mensual de producción por producto, variante y cliente.</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                            type="month"
                            value={month}
                            onChange={(event) => setMonth(event.target.value)}
                            className="w-full sm:w-40"
                        />
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger className="w-full sm:w-48">
                                <SelectValue placeholder="Estado OP" />
                            </SelectTrigger>
                            <SelectContent>
                                {statusFilterOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={groupBy} onValueChange={(value) => setGroupBy(value as ProductionAnalyticsDetailGroupBy)}>
                            <SelectTrigger className="w-full sm:w-44">
                                <SelectValue placeholder="Agrupación" />
                            </SelectTrigger>
                            <SelectContent>
                                {groupOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleExport} disabled={exporting} className="bg-indigo-600 hover:bg-indigo-700">
                            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                            Exportar CSV
                        </Button>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <Card className="p-5 border-slate-200">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">Producido</span>
                        <Factory className="h-4 w-4 text-emerald-600" />
                    </div>
                    <p className="text-2xl font-bold mt-2">
                        {loadingSummary ? '...' : formatNumber(summary?.kpis.producedQty || 0)}
                    </p>
                </Card>
                <Card className="p-5 border-slate-200">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">Planificado</span>
                        <Package className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold mt-2">
                        {loadingSummary ? '...' : formatNumber(summary?.kpis.plannedQty || 0)}
                    </p>
                </Card>
                <Card className="p-5 border-slate-200">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">En proceso</span>
                        <Loader2 className="h-4 w-4 text-amber-600" />
                    </div>
                    <p className="text-2xl font-bold mt-2">
                        {loadingSummary ? '...' : formatNumber(summary?.kpis.inProgressQty || 0)}
                    </p>
                </Card>
                <Card className="p-5 border-slate-200">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">Cumplimiento</span>
                        <Users className="h-4 w-4 text-violet-600" />
                    </div>
                    <p className="text-2xl font-bold mt-2">
                        {loadingSummary ? '...' : `${formatNumber(summary?.kpis.completionRatePercent || 0)}%`}
                    </p>
                </Card>
            </div>

            <Card className="p-5 border-slate-200">
                <h2 className="font-semibold text-slate-800 mb-4">Tendencia mensual</h2>
                {loadingTrend ? (
                    <div className="py-10 text-center text-slate-500">Cargando tendencia...</div>
                ) : (
                    <div className="space-y-3">
                        {(trend || []).map((row) => (
                            <div key={row.month} className="space-y-1">
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>{row.month}</span>
                                    <span>Producido: {formatNumber(row.producedQty)} / Plan: {formatNumber(row.plannedQty)}</span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-2 bg-emerald-500"
                                        style={{ width: `${Math.min((row.producedQty / trendMax) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Card className="p-5 border-slate-200">
                    <h2 className="font-semibold text-slate-800 mb-4">Top 5 productos / variantes</h2>
                    {loadingTopProducts ? (
                        <div className="py-8 text-sm text-slate-500">Cargando...</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Variante</TableHead>
                                    <TableHead className="text-right">Producido</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(topProducts || []).map((row) => (
                                    <TableRow key={row.variantId}>
                                        <TableCell>{row.productName}</TableCell>
                                        <TableCell>{row.variantName}</TableCell>
                                        <TableCell className="text-right font-semibold">{formatNumber(row.producedQty)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </Card>

                <Card className="p-5 border-slate-200">
                    <h2 className="font-semibold text-slate-800 mb-4">Top 5 clientes</h2>
                    {loadingTopCustomers ? (
                        <div className="py-8 text-sm text-slate-500">Cargando...</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead className="text-right">Producido</TableHead>
                                    <TableHead className="text-right">Órdenes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(topCustomers || []).map((row) => (
                                    <TableRow key={row.customerId || row.customerName}>
                                        <TableCell>{row.customerName}</TableCell>
                                        <TableCell className="text-right font-semibold">{formatNumber(row.producedQty)}</TableCell>
                                        <TableCell className="text-right">{row.orderCount}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </Card>
            </div>

            <Card className="p-5 border-slate-200">
                <h2 className="font-semibold text-slate-800 mb-4">Detalle {groupOptions.find((opt) => opt.value === groupBy)?.label.toLowerCase()}</h2>
                {loadingDetail ? (
                    <div className="py-10 text-sm text-slate-500">Cargando detalle...</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    <button type="button" className="inline-flex items-center" onClick={() => toggleSort('label')}>
                                        Grupo {sortIcon('label')}
                                    </button>
                                </TableHead>
                                <TableHead className="text-right">
                                    <button type="button" className="inline-flex items-center justify-end w-full" onClick={() => toggleSort('producedQty')}>
                                        Producido {sortIcon('producedQty')}
                                    </button>
                                </TableHead>
                                <TableHead className="text-right">
                                    <button type="button" className="inline-flex items-center justify-end w-full" onClick={() => toggleSort('plannedQty')}>
                                        Planificado {sortIcon('plannedQty')}
                                    </button>
                                </TableHead>
                                <TableHead className="text-right">
                                    <button type="button" className="inline-flex items-center justify-end w-full" onClick={() => toggleSort('inProgressQty')}>
                                        En proceso {sortIcon('inProgressQty')}
                                    </button>
                                </TableHead>
                                <TableHead className="text-right">
                                    <button type="button" className="inline-flex items-center justify-end w-full" onClick={() => toggleSort('completionRatePercent')}>
                                        % Cumplimiento {sortIcon('completionRatePercent')}
                                    </button>
                                </TableHead>
                                <TableHead className="text-right">
                                    <button type="button" className="inline-flex items-center justify-end w-full" onClick={() => toggleSort('orderCount')}>
                                        Órdenes {sortIcon('orderCount')}
                                    </button>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedDetailRows.map((row) => (
                                <TableRow key={row.key}>
                                    <TableCell>{row.label}</TableCell>
                                    <TableCell className="text-right">{formatNumber(row.producedQty)}</TableCell>
                                    <TableCell className="text-right">{formatNumber(row.plannedQty)}</TableCell>
                                    <TableCell className="text-right">{formatNumber(row.inProgressQty)}</TableCell>
                                    <TableCell className="text-right">{formatNumber(row.completionRatePercent)}%</TableCell>
                                    <TableCell className="text-right">{row.orderCount}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>
        </div>
    );
}
