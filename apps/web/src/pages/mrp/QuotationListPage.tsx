import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Quotation, QuotationStatus } from '@scaffold/types';
import { Plus, FileText, Search, Eye, BarChart3, TrendingUp, Users, Package, Clock3, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import { mrpApi } from '@/services/mrpApi';
import { formatCurrency } from '@/lib/utils';
import {
    useQuotationAnalyticsSummaryQuery,
    useQuotationAnalyticsTopCustomersQuery,
    useQuotationAnalyticsTopProductsQuery,
    useQuotationAnalyticsTrendQuery,
} from '@/hooks/mrp/useQuotationAnalytics';
import { useMrpQueryErrorToast } from '@/hooks/mrp/useMrpQueryErrorToast';

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

// Per-status bar accent color for analytics panel
const statusAccentBar: Record<QuotationStatus, string> = {
    [QuotationStatus.DRAFT]: 'bg-slate-400',
    [QuotationStatus.SENT]: 'bg-sky-400',
    [QuotationStatus.APPROVED_PARTIAL]: 'bg-yellow-400',
    [QuotationStatus.APPROVED_FULL]: 'bg-emerald-400',
    [QuotationStatus.REJECTED]: 'bg-rose-400',
    [QuotationStatus.CONVERTED]: 'bg-violet-400',
};

const statusTextColor: Record<QuotationStatus, string> = {
    [QuotationStatus.DRAFT]: 'text-slate-600',
    [QuotationStatus.SENT]: 'text-sky-600',
    [QuotationStatus.APPROVED_PARTIAL]: 'text-yellow-600',
    [QuotationStatus.APPROVED_FULL]: 'text-emerald-600',
    [QuotationStatus.REJECTED]: 'text-rose-600',
    [QuotationStatus.CONVERTED]: 'text-violet-600',
};

export default function QuotationListPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [rows, setRows] = useState<Quotation[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [analyticsMonth, setAnalyticsMonth] = useState(new Date().toISOString().slice(0, 7));
    const [analyticsExpanded, setAnalyticsExpanded] = useState(false);
    const [topProductsView, setTopProductsView] = useState<'amount' | 'quantity'>('amount');
    const [page] = useState(1);
    const limit = 50;

    const analyticsFilters = useMemo(() => ({
        month: analyticsMonth,
        status: statusFilter !== 'ALL' ? (statusFilter as QuotationStatus) : undefined,
    }), [analyticsMonth, statusFilter]);

    const { data: analyticsSummary, error: analyticsSummaryError } = useQuotationAnalyticsSummaryQuery(analyticsFilters);
    const { data: analyticsTrend, error: analyticsTrendError } = useQuotationAnalyticsTrendQuery(analyticsFilters);
    const { data: analyticsTopCustomers, error: analyticsTopCustomersError } = useQuotationAnalyticsTopCustomersQuery(analyticsFilters, 5);
    const { data: analyticsTopProducts, error: analyticsTopProductsError } = useQuotationAnalyticsTopProductsQuery(analyticsFilters, 5);

    useMrpQueryErrorToast(analyticsSummaryError, 'No se pudo cargar resumen de cotizaciones');
    useMrpQueryErrorToast(analyticsTrendError, 'No se pudo cargar la tendencia de cotizaciones');
    useMrpQueryErrorToast(analyticsTopCustomersError, 'No se pudo cargar top clientes');
    useMrpQueryErrorToast(analyticsTopProductsError, 'No se pudo cargar top productos');

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

    const trendMax = Math.max(
        1,
        ...(analyticsTrend ?? []).map((point) => Math.max(point.totalQuotedAmount, point.convertedAmount))
    );

    const sortedTopProducts = useMemo(() => {
        const rows = [...(analyticsTopProducts ?? [])];
        rows.sort((a, b) => {
            if (topProductsView === 'quantity') return b.quantity - a.quantity;
            return b.totalQuotedAmount - a.totalQuotedAmount;
        });
        return rows;
    }, [analyticsTopProducts, topProductsView]);

    const topCustomerMax = Math.max(1, ...(analyticsTopCustomers ?? []).map((r) => r.totalQuotedAmount));
    const topProductMax = Math.max(
        1,
        ...sortedTopProducts.map((r) => topProductsView === 'quantity' ? r.quantity : r.totalQuotedAmount)
    );
    const statusBreakdownMax = Math.max(1, ...(analyticsSummary?.breakdown ?? []).map((r) => r.count));

    const kpiCards = [
        {
            label: 'Total cotizado',
            value: formatCurrency(analyticsSummary?.kpis.totalQuotedAmount || 0),
            sub: `${analyticsSummary?.kpis.quotationCount || 0} cotizaciones en período`,
            icon: <TrendingUp className="h-4 w-4" />,
            accent: 'from-emerald-500 to-emerald-400',
            iconColor: 'text-emerald-500',
            borderAccent: 'border-t-emerald-400',
            progress: null,
        },
        {
            label: 'Aprobado',
            value: formatCurrency(analyticsSummary?.kpis.approvedAmount || 0),
            sub: 'Incluye aprobadas parciales y totales',
            icon: <FileText className="h-4 w-4" />,
            accent: 'from-sky-500 to-sky-400',
            iconColor: 'text-sky-500',
            borderAccent: 'border-t-sky-400',
            progress: analyticsSummary?.kpis.totalQuotedAmount
                ? ((analyticsSummary.kpis.approvedAmount || 0) / analyticsSummary.kpis.totalQuotedAmount) * 100
                : 0,
        },
        {
            label: 'Convertido',
            value: formatCurrency(analyticsSummary?.kpis.convertedAmount || 0),
            sub: `Tasa ${(analyticsSummary?.kpis.conversionRatePercent || 0).toFixed(1)}%`,
            icon: <Users className="h-4 w-4" />,
            accent: 'from-violet-500 to-violet-400',
            iconColor: 'text-violet-500',
            borderAccent: 'border-t-violet-400',
            progress: analyticsSummary?.kpis.conversionRatePercent || 0,
        },
        {
            label: 'Ticket promedio',
            value: formatCurrency(analyticsSummary?.kpis.averageTicket || 0),
            sub: 'Valor neto promedio cotizado',
            icon: <Package className="h-4 w-4" />,
            accent: 'from-amber-500 to-amber-400',
            iconColor: 'text-amber-500',
            borderAccent: 'border-t-amber-400',
            progress: null,
        },
        {
            label: 'Vencidas pendientes',
            value: String(analyticsSummary?.kpis.expiredPendingCount || 0),
            sub: 'Oportunidades por revisar',
            icon: <Clock3 className="h-4 w-4" />,
            accent: 'from-rose-500 to-rose-400',
            iconColor: 'text-rose-500',
            borderAccent: 'border-t-rose-400',
            progress: null,
        },
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            {/* ── Page header ──────────────────────────────────────────────── */}
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

            {/* ── Analytics Panel ─────────────────────────────────────────── */}
            <div className="mb-6 overflow-hidden rounded-[28px] border border-indigo-100 bg-gradient-to-br from-indigo-50/60 via-white to-slate-50 shadow-sm">

                {/* Panel header */}
                <div className="p-5 sm:p-6 lg:p-7">
                    <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">
                                <BarChart3 className="h-3.5 w-3.5" />
                                Pulso comercial
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Panel ejecutivo de cotizaciones</h2>
                                <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
                                    Separa visión comercial y operación diaria: arriba ves valor, conversión y vencimientos; abajo gestionas el pipeline y las cotizaciones activas.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 xl:items-center">
                            <Input
                                type="month"
                                value={analyticsMonth}
                                onChange={(e) => setAnalyticsMonth(e.target.value)}
                                className="w-full sm:w-44 border-slate-200 bg-white text-slate-700 shadow-none"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setAnalyticsExpanded((prev) => !prev)}
                                className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                            >
                                {analyticsExpanded ? <ChevronDown className="mr-2 h-4 w-4" /> : <ChevronRight className="mr-2 h-4 w-4" />}
                                {analyticsExpanded ? 'Ocultar detalle' : 'Ver detalle'}
                            </Button>
                        </div>
                    </div>

                    {/* ── KPI Cards ── */}
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
                        {kpiCards.map((card) => (
                            <div
                                key={card.label}
                                className={`relative overflow-hidden rounded-xl border border-slate-200 bg-white pt-3 px-4 pb-4 shadow-sm transition-all hover:shadow-md hover:border-indigo-200 border-t-2 ${card.borderAccent}`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-medium text-slate-500 leading-snug">{card.label}</span>
                                    <span className={`${card.iconColor} opacity-80`}>{card.icon}</span>
                                </div>
                                <p className="text-[1.6rem] font-bold text-slate-900 leading-none tracking-tight">{card.value}</p>
                                <p className="mt-2 text-[11px] text-slate-400 leading-snug">{card.sub}</p>
                                {card.progress !== null && (
                                    <div className="mt-3 h-1 w-full rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full bg-gradient-to-r ${card.accent} transition-all duration-700`}
                                            style={{ width: `${Math.min(100, card.progress)}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Expanded Detail ── */}
                {analyticsExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-6 sm:px-6 lg:px-7 space-y-4">

                        {/* Row 1: Trend + Status breakdown */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

                            {/* Trend */}
                            <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
                                    <div>
                                        <h3 className="font-semibold text-slate-900">Tendencia</h3>
                                        <p className="text-xs text-slate-500 mt-0.5">Cotizado vs convertido por mes.</p>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <span className="flex items-center gap-1.5">
                                            <span className="h-2 w-5 rounded-full bg-indigo-400 inline-block" />
                                            Cotizado
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <span className="h-2 w-5 rounded-full bg-emerald-400 inline-block" />
                                            Convertido
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {(analyticsTrend ?? []).length === 0 ? (
                                        <p className="text-sm text-slate-400 py-8 text-center">Sin datos para el período seleccionado.</p>
                                    ) : (
                                        (analyticsTrend ?? []).map((point) => {
                                            const convPct = point.totalQuotedAmount > 0
                                                ? ((point.convertedAmount / point.totalQuotedAmount) * 100).toFixed(0)
                                                : '0';
                                            return (
                                                <div key={point.month}>
                                                    <div className="flex items-center justify-between text-xs mb-2">
                                                        <span className="font-medium text-slate-700">{point.month}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-slate-500">{formatCurrency(point.totalQuotedAmount)}</span>
                                                            <span className="rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 border border-emerald-200">
                                                                {convPct}% conv.
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-16 text-[10px] text-slate-400 text-right shrink-0">Cotizado</span>
                                                            <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                                                                <div
                                                                    className="h-full bg-indigo-400 rounded-full transition-all duration-500"
                                                                    style={{ width: `${(point.totalQuotedAmount / trendMax) * 100}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-16 text-[10px] text-slate-400 text-right shrink-0">Convertido</span>
                                                            <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                                                                <div
                                                                    className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                                                                    style={{ width: `${(point.convertedAmount / trendMax) * 100}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Status breakdown */}
                            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                                <h3 className="font-semibold text-slate-900 mb-1">Estados</h3>
                                <p className="text-xs text-slate-500 mb-5">Distribución del valor cotizado por estado.</p>
                                <div className="space-y-3.5">
                                    {(analyticsSummary?.breakdown || []).map((row) => (
                                        <div key={row.status}>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className={`text-xs font-semibold ${statusTextColor[row.status] || 'text-slate-600'}`}>
                                                    {statusLabels[row.status]}
                                                </span>
                                                <div className="text-right">
                                                    <span className="text-sm font-bold text-slate-900">{row.count}</span>
                                                    <span className="ml-1.5 text-[11px] text-slate-400">{formatCurrency(row.amount)}</span>
                                                </div>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${statusAccentBar[row.status] || 'bg-slate-400'}`}
                                                    style={{ width: `${(row.count / statusBreakdownMax) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Cost structure */}
                        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
                                <div>
                                    <h3 className="font-semibold text-slate-900">Estructura de costo cotizado</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Composición estimada de MP, MOD y CIF sobre las cotizaciones del período.</p>
                                </div>
                                <div className="sm:text-right shrink-0">
                                    <p className="text-xs uppercase tracking-wider text-slate-400">Margen estimado</p>
                                    <p className="text-xl font-bold text-emerald-600 leading-tight">
                                        {formatCurrency(analyticsSummary?.kpis.estimatedGrossMarginAmount || 0)}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {(analyticsSummary?.kpis.estimatedGrossMarginPercent || 0).toFixed(1)}%
                                    </p>
                                </div>
                            </div>

                            {/* Cost tiles */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                                {[
                                    { label: 'Materia prima', value: analyticsSummary?.kpis.materialCostAmount || 0, color: 'text-emerald-600' },
                                    { label: 'MOD', value: analyticsSummary?.kpis.laborCostAmount || 0, color: 'text-sky-600' },
                                    { label: 'CIF', value: analyticsSummary?.kpis.indirectCostAmount || 0, color: 'text-amber-600' },
                                    { label: 'Costo total', value: analyticsSummary?.kpis.totalCostAmount || 0, color: 'text-slate-900' },
                                ].map((tile) => (
                                    <div key={tile.label} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                                        <p className="text-[10px] uppercase tracking-wider text-slate-400">{tile.label}</p>
                                        <p className={`mt-1.5 text-lg font-bold ${tile.color}`}>{formatCurrency(tile.value)}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Stacked bar */}
                            {(() => {
                                const totalCost = analyticsSummary?.kpis.totalCostAmount || 0;
                                const materialShare = totalCost > 0 ? ((analyticsSummary?.kpis.materialCostAmount || 0) / totalCost) * 100 : 0;
                                const laborShare = totalCost > 0 ? ((analyticsSummary?.kpis.laborCostAmount || 0) / totalCost) * 100 : 0;
                                const indirectShare = totalCost > 0 ? ((analyticsSummary?.kpis.indirectCostAmount || 0) / totalCost) * 100 : 0;

                                return (
                                    <div className="space-y-2">
                                        <div className="h-4 rounded-full overflow-hidden bg-slate-100 flex gap-px">
                                            {materialShare > 0 && (
                                                <div
                                                    title={`MP ${materialShare.toFixed(1)}%`}
                                                    className="h-full bg-emerald-400 first:rounded-l-full transition-all duration-700"
                                                    style={{ width: `${materialShare}%` }}
                                                />
                                            )}
                                            {laborShare > 0 && (
                                                <div
                                                    title={`MOD ${laborShare.toFixed(1)}%`}
                                                    className="h-full bg-sky-400 transition-all duration-700"
                                                    style={{ width: `${laborShare}%` }}
                                                />
                                            )}
                                            {indirectShare > 0 && (
                                                <div
                                                    title={`CIF ${indirectShare.toFixed(1)}%`}
                                                    className="h-full bg-amber-400 last:rounded-r-full transition-all duration-700"
                                                    style={{ width: `${indirectShare}%` }}
                                                />
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-5 text-xs">
                                            <span className="flex items-center gap-1.5 text-slate-600">
                                                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400 inline-block shrink-0" />
                                                MP&nbsp;<span className="font-semibold text-slate-900">{materialShare.toFixed(1)}%</span>
                                            </span>
                                            <span className="flex items-center gap-1.5 text-slate-600">
                                                <span className="h-2.5 w-2.5 rounded-sm bg-sky-400 inline-block shrink-0" />
                                                MOD&nbsp;<span className="font-semibold text-slate-900">{laborShare.toFixed(1)}%</span>
                                            </span>
                                            <span className="flex items-center gap-1.5 text-slate-600">
                                                <span className="h-2.5 w-2.5 rounded-sm bg-amber-400 inline-block shrink-0" />
                                                CIF&nbsp;<span className="font-semibold text-slate-900">{indirectShare.toFixed(1)}%</span>
                                            </span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Row 3: Top clientes + Top productos */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

                            {/* Top clientes */}
                            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                                <h3 className="font-semibold text-slate-900 mb-1">Top clientes</h3>
                                <p className="text-xs text-slate-500 mb-5">Clientes con mayor valor cotizado.</p>
                                <div className="space-y-2">
                                    {(analyticsTopCustomers ?? []).length === 0 ? (
                                        <p className="text-sm text-slate-400">Sin datos.</p>
                                    ) : (
                                        analyticsTopCustomers?.map((row, idx) => {
                                            const barW = (row.totalQuotedAmount / topCustomerMax) * 100;
                                            const convRate = row.totalQuotedAmount > 0
                                                ? ((row.convertedAmount / row.totalQuotedAmount) * 100).toFixed(0)
                                                : '0';
                                            return (
                                                <div key={row.customerId} className="relative group rounded-lg">
                                                    <div
                                                        className="absolute inset-y-0 left-0 rounded-lg bg-indigo-50 transition-all duration-500 group-hover:bg-indigo-100/60"
                                                        style={{ width: `${barW}%` }}
                                                    />
                                                    <div className="relative flex items-center gap-3 px-3 py-2.5">
                                                        <span className="shrink-0 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-bold text-slate-500">
                                                            {idx + 1}
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-slate-900 text-sm truncate">{row.customerName}</p>
                                                            <p className="text-xs text-slate-500">{row.quotationCount} cotizaciones</p>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className="font-semibold text-slate-900 text-sm">{formatCurrency(row.totalQuotedAmount)}</p>
                                                            <span className="inline-block rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-1.5 py-0.5 font-semibold mt-0.5">
                                                                {convRate}% conv.
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Top productos */}
                            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                                <div className="flex items-start justify-between gap-3 mb-5">
                                    <div>
                                        <h3 className="font-semibold text-slate-900 mb-1">Top productos</h3>
                                        <p className="text-xs text-slate-500">
                                            Más cotizados por {topProductsView === 'amount' ? 'valor' : 'unidades'}.
                                        </p>
                                    </div>
                                    <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-1 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setTopProductsView('amount')}
                                            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${topProductsView === 'amount'
                                                ? 'bg-white text-slate-900 shadow-sm'
                                                : 'text-slate-500 hover:text-slate-900'
                                                }`}
                                        >
                                            Valor
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTopProductsView('quantity')}
                                            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${topProductsView === 'quantity'
                                                ? 'bg-white text-slate-900 shadow-sm'
                                                : 'text-slate-500 hover:text-slate-900'
                                                }`}
                                        >
                                            Unidades
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {sortedTopProducts.length === 0 ? (
                                        <p className="text-sm text-slate-400">Sin datos.</p>
                                    ) : (
                                        sortedTopProducts.map((row, index) => {
                                            const primaryValue = topProductsView === 'quantity' ? row.quantity : row.totalQuotedAmount;
                                            const barW = (primaryValue / topProductMax) * 100;
                                            return (
                                                <div key={`${row.label}-${index}`} className="relative group rounded-lg">
                                                    <div
                                                        className="absolute inset-y-0 left-0 rounded-lg bg-indigo-50 transition-all duration-500 group-hover:bg-indigo-100/60"
                                                        style={{ width: `${barW}%` }}
                                                    />
                                                    <div className="relative flex items-center gap-3 px-3 py-2.5">
                                                        <span className="shrink-0 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-bold text-slate-500">
                                                            {index + 1}
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-slate-900 text-sm truncate">{row.label}</p>
                                                            <p className="text-xs text-slate-500">
                                                                {row.quotationCount} cotizaciones ·&nbsp;
                                                                {topProductsView === 'quantity'
                                                                    ? formatCurrency(row.totalQuotedAmount)
                                                                    : `${row.quantity.toLocaleString('es-CO')} uds`}
                                                            </p>
                                                            {row.variantHighlights && row.variantHighlights.length > 0 && (
                                                                <p className="text-[11px] text-indigo-600 mt-0.5">
                                                                    Variantes: {row.variantHighlights.join(', ')}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <p className="font-semibold text-slate-900 text-sm shrink-0">
                                                            {topProductsView === 'quantity'
                                                                ? `${row.quantity.toLocaleString('es-CO')} uds`
                                                                : formatCurrency(row.totalQuotedAmount)}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Quotation List ─────────────────────────────────────────── */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6">
                    <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Bandeja de cotizaciones</h2>
                            <p className="mt-1 text-sm text-slate-500">Busca, filtra y abre rápidamente las propuestas activas o históricas.</p>
                        </div>
                        <div className="text-sm text-slate-500">
                            {filteredOrders.length} resultados visibles
                        </div>
                    </div>

                    <div className="mt-5 flex flex-col lg:flex-row justify-between gap-4">
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
                </div>

                <div className="p-4 sm:p-5 lg:p-6">
                    {loading ? (
                        <div className="p-6 flex justify-center items-center h-64">
                            <p className="text-sm text-slate-500">Cargando cotizaciones...</p>
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center min-h-[400px] bg-slate-50/40">
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
            </div>
        </div>
    );
}
