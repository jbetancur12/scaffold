import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Download, Trash2, Filter, Calendar, Package, BarChart3, List, TrendingUp, Trophy, Users, Crosshair, History } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import { mrpApi } from '@/services/mrpApi';
import type { ProductionEntry, Operator } from '@scaffold/types';

type KpiData = {
    summary: { grandTotal: number; totalEntries: number; operatorCount: number };
    byOperator: Array<{ id: string; operator: string; code?: string; totalQuantity: number; entryCount: number; topProduct: { product: string; sku: string; total: number } | null }>;
    globalTopProducts: Array<{ product: string; sku: string; total: number; operator: string }>;
    productSpecialization: Array<{ product: string; sku: string; total: number; specialists: Array<{ operator: string; quantity: number }> }>;
    operatorDailyHistory: Array<{ id: string; operator: string; code?: string; total: number; daily: Array<{ date: string; quantity: number }> }>;
    crossMatrix: Array<{ product: string; sku: string; byOperator: Array<{ operator: string; quantity: number }> }>;
};

export default function ProductionEntryListPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [entries, setEntries] = useState<ProductionEntry[]>([]);
    const [operators, setOperators] = useState<Operator[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const limit = 20;

    const [tab, setTab] = useState<'kpis' | 'records'>('records');

    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [operatorId, setOperatorId] = useState('');
    const [downloadingPdf, setDownloadingPdf] = useState(false);

    const [kpis, setKpis] = useState<KpiData | null>(null);
    const [kpiLoading, setKpiLoading] = useState(false);

    const [selectedOperator, setSelectedOperator] = useState('');
    const [selectedMatrixOperators, setSelectedMatrixOperators] = useState<Set<string>>(new Set());
    const [selectedProduct, setSelectedProduct] = useState('');
    const [sortColumn, setSortColumn] = useState<string | 'total'>('');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const handleSort = (col: string | 'total') => {
        if (sortColumn === col) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortColumn(col);
            setSortDir('desc');
        }
    };

    useEffect(() => {
        if (kpis && selectedMatrixOperators.size === 0) {
            const defaults = new Set(kpis.byOperator.slice(0, 5).map((op) => op.operator));
            setSelectedMatrixOperators(defaults);
        }
    }, [kpis]);

    const loadEntries = async () => {
        try {
            setLoading(true);
            const [entriesResult, opsResult] = await Promise.all([
                mrpApi.getProductionEntries(page, limit, from || undefined, to || undefined, operatorId || undefined),
                mrpApi.getOperators(1, 100, undefined, true),
            ]);
            setEntries(entriesResult.data);
            setTotal(entriesResult.total);
            setOperators(opsResult.data.filter((o) => o.active));
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'Failed to load data'), variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const loadKpis = async () => {
        try {
            setKpiLoading(true);
            const data = await mrpApi.getProductionEntryKpis(from || undefined, to || undefined, operatorId || undefined);
            setKpis(data);
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'Failed to load data'), variant: 'destructive' });
        } finally {
            setKpiLoading(false);
        }
    };

    useEffect(() => {
        if (tab === 'records') {
            loadEntries();
        }
    }, [page, from, to, operatorId, tab]);

    useEffect(() => {
        if (tab === 'kpis') {
            loadKpis();
        }
    }, [from, to, operatorId, tab]);

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar este registro?')) return;
        try {
            await mrpApi.deleteProductionEntry(id);
            toast({ title: 'Registro eliminado' });
            loadEntries();
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'Failed to load data'), variant: 'destructive' });
        }
    };

    const handleDownloadPdf = async () => {
        try {
            setDownloadingPdf(true);
            const blob = await mrpApi.getProductionEntryReportPdf(from || undefined, to || undefined, operatorId || undefined);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Reporte_Produccion${from || ''}_${to || ''}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'Failed to load data'), variant: 'destructive' });
        } finally {
            setDownloadingPdf(false);
        }
    };

    const totalPages = Math.ceil(total / limit);

    const uniqueProducts = kpis ? Array.from(new Map(kpis.crossMatrix.map((p) => [p.product, p.product])).values()) : [];

    const filteredCrossMatrix = kpis?.crossMatrix.filter((row) => {
        if (selectedProduct) {
            const prodLabel = row.product.toLowerCase();
            if (!prodLabel.includes(selectedProduct.toLowerCase())) return false;
        }
        return true;
    }) ?? [];

    const sortedMatrix = [...filteredCrossMatrix].sort((a, b) => {
        if (!sortColumn) return 0;
        let aVal = 0;
        let bVal = 0;
        if (sortColumn === 'total') {
            aVal = a.byOperator.filter((o) => selectedMatrixOperators.has(o.operator)).reduce((s, o) => s + o.quantity, 0);
            bVal = b.byOperator.filter((o) => selectedMatrixOperators.has(o.operator)).reduce((s, o) => s + o.quantity, 0);
        } else {
            aVal = a.byOperator.find((o) => o.operator === sortColumn)?.quantity ?? 0;
            bVal = b.byOperator.find((o) => o.operator === sortColumn)?.quantity ?? 0;
        }
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    const filteredHistory = kpis?.operatorDailyHistory.filter((op) => {
        if (selectedOperator && op.operator !== selectedOperator) return false;
        return true;
    }) ?? [];

    const FilterBar = () => (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-4">
            <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-600">Filtros</span>
                </div>
                <div className="flex flex-wrap gap-3">
                    <div>
                        <Label className="text-xs text-slate-500 mb-1 block">Desde</Label>
                        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40 h-8 text-sm" />
                    </div>
                    <div>
                        <Label className="text-xs text-slate-500 mb-1 block">Hasta</Label>
                        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40 h-8 text-sm" />
                    </div>
                    <div>
                        <Label className="text-xs text-slate-500 mb-1 block">Operador</Label>
                        <select
                            className="h-8 border border-slate-300 rounded-md px-2 text-sm"
                            value={operatorId}
                            onChange={(e) => setOperatorId(e.target.value)}
                        >
                            <option value="">Todos</option>
                            {operators.map((op) => (
                                <option key={op.id} value={op.id}>
                                    {op.code ? `${op.code} - ${op.name}` : op.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );

    const medalBadge = (idx: number) => {
        if (idx === 0) return 'bg-amber-100 text-amber-700';
        if (idx === 1) return 'bg-slate-100 text-slate-600';
        if (idx === 2) return 'bg-orange-100 text-orange-700';
        return 'text-slate-400';
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Package className="h-6 w-6 text-indigo-600" />
                        Seguimiento de Producción
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Registro diario de producción por operador</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleDownloadPdf} disabled={downloadingPdf}>
                        <Download className="h-4 w-4 mr-1.5" />
                        {downloadingPdf ? 'Generando...' : 'PDF'}
                    </Button>
                    <Button onClick={() => navigate('/mrp/production-entries/new')}>
                        <Plus className="h-4 w-4 mr-1.5" />
                        Nuevo Registro
                    </Button>
                </div>
            </div>

            <div className="flex gap-2 mb-4">
                <Button variant={tab === 'kpis' ? 'default' : 'outline'} size="sm" onClick={() => setTab('kpis')}>
                    <BarChart3 className="h-4 w-4 mr-1.5" />
                    KPIs
                </Button>
                <Button variant={tab === 'records' ? 'default' : 'outline'} size="sm" onClick={() => setTab('records')}>
                    <List className="h-4 w-4 mr-1.5" />
                    Registros
                </Button>
            </div>

            <FilterBar />

            {tab === 'kpis' && (
                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="overview">Resumen</TabsTrigger>
                        <TabsTrigger value="specialization">Especialización</TabsTrigger>
                        <TabsTrigger value="matrix">Matriz Operador × Producto</TabsTrigger>
                        <TabsTrigger value="history">Histórico</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        {kpiLoading ? (
                            <div className="p-12 text-center text-slate-500">Cargando KPIs...</div>
                        ) : kpis && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-indigo-100 rounded-lg"><TrendingUp className="h-5 w-5 text-indigo-600" /></div>
                                            <span className="text-sm font-medium text-slate-500">Total Producido</span>
                                        </div>
                                        <div className="text-3xl font-bold text-slate-900">{kpis.summary.grandTotal.toLocaleString('es-CO')}</div>
                                        <div className="text-xs text-slate-400 mt-1">{kpis.summary.totalEntries} registros</div>
                                    </div>
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-green-100 rounded-lg"><Users className="h-5 w-5 text-green-600" /></div>
                                            <span className="text-sm font-medium text-slate-500">Operadores Activos</span>
                                        </div>
                                        <div className="text-3xl font-bold text-slate-900">{kpis.summary.operatorCount}</div>
                                        <div className="text-xs text-slate-400 mt-1">en el período</div>
                                    </div>
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-amber-100 rounded-lg"><Trophy className="h-5 w-5 text-amber-600" /></div>
                                            <span className="text-sm font-medium text-slate-500">Top Producto</span>
                                        </div>
                                        {kpis.globalTopProducts.length > 0 ? (
                                            <>
                                                <div className="text-lg font-bold text-slate-900 truncate">{kpis.globalTopProducts[0].product}</div>
                                                <div className="text-sm text-slate-500">{kpis.globalTopProducts[0].total.toLocaleString('es-CO')} uds</div>
                                            </>
                                        ) : (
                                            <div className="text-slate-400">Sin datos</div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                                    <div className="p-4 border-b border-slate-100">
                                        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                            <Users className="h-4 w-4 text-slate-400" />
                                            Producción por Operador
                                        </h3>
                                    </div>
                                    {kpis.byOperator.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400">Sin datos en el período</div>
                                    ) : (
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-slate-100">
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">#</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Operador</th>
                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Cantidad Total</th>
                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Registros</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Producto Más Producido</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {kpis.byOperator.map((op, idx) => (
                                                    <tr key={op.id} className="hover:bg-slate-50/50">
                                                        <td className="px-4 py-3">
                                                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${medalBadge(idx)}`}>{idx + 1}</span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="font-medium text-slate-900 text-sm">{op.operator}</div>
                                                            {op.code && <div className="text-xs text-slate-500">{op.code}</div>}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-slate-900">{op.totalQuantity.toLocaleString('es-CO')}</td>
                                                        <td className="px-4 py-3 text-right text-sm text-slate-600">{op.entryCount}</td>
                                                        <td className="px-4 py-3">
                                                            {op.topProduct ? (
                                                                <div>
                                                                    <div className="text-sm text-slate-900">{op.topProduct.product}</div>
                                                                    <div className="text-xs text-slate-500">{op.topProduct.total.toLocaleString('es-CO')} uds</div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-slate-400">-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </>
                        )}
                    </TabsContent>

                    <TabsContent value="specialization" className="space-y-6">
                        {kpiLoading ? (
                            <div className="p-12 text-center text-slate-500">Cargando...</div>
                        ) : kpis && kpis.productSpecialization.length === 0 ? (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-400">Sin datos en el período</div>
                        ) : kpis && (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                                <div className="p-4 border-b border-slate-100">
                                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                        <Crosshair className="h-4 w-4 text-slate-400" />
                                        Especialización por Producto
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">Qué operador ha producido más de cada producto</p>
                                </div>
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Producto</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">SKU</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Total</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase" colSpan={3}>Especialistas (Top 3)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {kpis.productSpecialization.map((prod, idx) => (
                                            <tr key={`${prod.sku}-${idx}`} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-3">
                                                    <div className="text-sm font-medium text-slate-900">{prod.product}</div>
                                                </td>
                                                <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{prod.sku || '-'}</Badge></td>
                                                <td className="px-4 py-3 text-right font-bold text-slate-900">{prod.total.toLocaleString('es-CO')}</td>
                                                {prod.specialists.map((s, si) => (
                                                    <td key={si} className="px-4 py-3">
                                                        <div className="text-sm text-slate-900 flex items-center gap-1">
                                                            {si === 0 && <Trophy className="h-3 w-3 text-amber-500" />}
                                                            {s.operator}
                                                        </div>
                                                        <div className="text-xs text-slate-500">{s.quantity.toLocaleString('es-CO')} uds</div>
                                                    </td>
                                                ))}
                                                {prod.specialists.length < 3 && (
                                                    <>
                                                        {Array.from({ length: 3 - prod.specialists.length }).map((_, i) => (
                                                            <td key={`empty-${i}`} className="px-4 py-3 text-xs text-slate-300">-</td>
                                                        ))}
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="matrix" className="space-y-4">
                        {kpiLoading ? (
                            <div className="p-12 text-center text-slate-500">Cargando...</div>
                        ) : kpis && (
                            <>
                                <div className="space-y-3">
                                    <div>
                                        <Label className="text-xs text-slate-500 mb-1 block">Columnas: selecciona operadores a comparar</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {kpis.byOperator.map((op) => {
                                                const isActive = selectedMatrixOperators.has(op.operator);
                                                return (
                                                    <button
                                                        key={op.id}
                                                        type="button"
                                                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                                            isActive
                                                                ? 'bg-indigo-600 text-white border-indigo-600'
                                                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                                        }`}
                                                        onClick={() => {
                                                            setSelectedMatrixOperators((prev) => {
                                                                const next = new Set(prev);
                                                                if (next.has(op.operator)) next.delete(op.operator);
                                                                else next.add(op.operator);
                                                                return next;
                                                            });
                                                        }}
                                                    >
                                                        {op.operator}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-slate-500 mb-1 block">Filtrar por Producto</Label>
                                        <select
                                            className="h-8 border border-slate-300 rounded-md px-2 text-sm w-56"
                                            value={selectedProduct}
                                            onChange={(e) => setSelectedProduct(e.target.value)}
                                        >
                                            <option value="">Todos</option>
                                            {uniqueProducts.map((p) => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {sortedMatrix.length === 0 ? (
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-400">Sin resultados</div>
                                ) : selectedMatrixOperators.size === 0 ? (
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-400">Selecciona al menos un operador</div>
                                ) : (
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
                                        <table className="w-full min-w-[400px]">
                                            <thead>
                                                <tr className="border-b border-slate-100">
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase sticky left-0 bg-white">Producto</th>
                                                    {Array.from(selectedMatrixOperators).map((opName) => {
                                                        const isActive = sortColumn === opName;
                                                        return (
                                                            <th
                                                                key={opName}
                                                                className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase whitespace-nowrap cursor-pointer select-none hover:text-slate-700"
                                                                onClick={() => handleSort(opName)}
                                                            >
                                                                {opName}
                                                                {isActive && (
                                                                    <span className="ml-1 text-indigo-600">
                                                                        {sortDir === 'desc' ? '↓' : '↑'}
                                                                    </span>
                                                                )}
                                                            </th>
                                                        );
                                                    })}
                                                    <th
                                                        className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase cursor-pointer select-none hover:text-slate-700"
                                                        onClick={() => handleSort('total')}
                                                    >
                                                        Total
                                                        {sortColumn === 'total' && (
                                                            <span className="ml-1 text-indigo-600">
                                                                {sortDir === 'desc' ? '↓' : '↑'}
                                                            </span>
                                                        )}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {sortedMatrix.map((row, idx) => {
                                                    const rowTotal = Array.from(selectedMatrixOperators).reduce((sum, opName) => {
                                                        const match = row.byOperator.find((o) => o.operator === opName);
                                                        return sum + (match?.quantity || 0);
                                                    }, 0);
                                                    const maxQty = Math.max(...Array.from(selectedMatrixOperators).map((opName) =>
                                                        row.byOperator.find((o) => o.operator === opName)?.quantity ?? 0
                                                    ));
                                                    return (
                                                        <tr key={idx} className="hover:bg-slate-50/50">
                                                            <td className="px-4 py-3 text-sm font-medium text-slate-900 sticky left-0 bg-white">{row.product}</td>
                                                            {Array.from(selectedMatrixOperators).map((opName) => {
                                                                const match = row.byOperator.find((o) => o.operator === opName);
                                                                const isMax = maxQty > 0 && (match?.quantity ?? 0) === maxQty;
                                                                return (
                                                                    <td key={opName} className={`px-4 py-3 text-right text-sm ${isMax ? 'font-bold text-indigo-700 bg-indigo-50' : ''}`}>
                                                                        {match ? (
                                                                            <span className={isMax ? '' : 'text-slate-900'}>{match.quantity.toLocaleString('es-CO')}</span>
                                                                        ) : (
                                                                            <span className="text-slate-300">-</span>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                            <td className="px-4 py-3 text-right font-bold text-slate-900">{rowTotal.toLocaleString('es-CO')}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        )}
                    </TabsContent>

                    <TabsContent value="history" className="space-y-4">
                        {kpiLoading ? (
                            <div className="p-12 text-center text-slate-500">Cargando...</div>
                        ) : kpis && (
                            <>
                                <div className="flex gap-3 items-end">
                                    <div>
                                        <Label className="text-xs text-slate-500 mb-1 block">Filtrar por Operador</Label>
                                        <select
                                            className="h-8 border border-slate-300 rounded-md px-2 text-sm"
                                            value={selectedOperator}
                                            onChange={(e) => setSelectedOperator(e.target.value)}
                                        >
                                            <option value="">Todos</option>
                                            {kpis.byOperator.map((op) => (
                                                <option key={op.id} value={op.operator}>{op.operator}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {filteredHistory.length === 0 ? (
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-400">Sin datos</div>
                                ) : (
                                    <div className="space-y-4">
                                        {filteredHistory.map((op) => (
                                            <div key={op.id} className="bg-white rounded-xl shadow-sm border border-slate-200">
                                                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                                                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                                                        <History className="h-4 w-4 text-slate-400" />
                                                        {op.operator} {op.code && <span className="text-xs text-slate-400 font-normal">({op.code})</span>}
                                                    </h4>
                                                    <Badge>{op.total.toLocaleString('es-CO')} total</Badge>
                                                </div>
                                                <div className="p-4">
                                                    <div className="flex flex-wrap gap-2">
                                                        {op.daily.map((d) => (
                                                            <div key={d.date} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-center min-w-[70px]">
                                                                <div className="text-xs text-slate-500">{d.date}</div>
                                                                <div className="text-sm font-bold text-slate-900">{d.quantity.toLocaleString('es-CO')}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </TabsContent>
                </Tabs>
            )}

            {tab === 'records' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-4">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500">Cargando...</div>
                    ) : entries.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
                            <p>No hay registros de producción</p>
                        </div>
                    ) : (
                        <>
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Fecha</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Orden</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Operador</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Producto</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Cantidad</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {entries.map((entry) => (
                                        <tr key={entry.id} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 text-sm text-slate-600">
                                                {new Date(entry.entryDate).toLocaleDateString('es-CO')}
                                            </td>
                                            <td className="px-4 py-3">
                                                {(entry.productionOrderItem as any)?.productionOrder?.code ? (
                                                    <Badge variant="outline" className="text-xs">
                                                        {(entry.productionOrderItem as any).productionOrder.code}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-900 text-sm">{entry.operator.name}</div>
                                                {entry.operator.code && (
                                                    <div className="text-xs text-slate-500">{entry.operator.code}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm text-slate-900">
                                                    {(entry.variant as any).product?.name ? `${(entry.variant as any).product.name}` : ''}
                                                </div>
                                                <div className="text-xs text-slate-500">{(entry.variant as any).name || ''}</div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-slate-900">
                                                {Number(entry.quantity || 0).toLocaleString('es-CO')}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(entry.id)}
                                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {totalPages > 1 && (
                                <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                                    <span className="text-sm text-slate-500">
                                        Mostrando {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} de {total}
                                    </span>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                                            Anterior
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                                            Siguiente
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
