import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Database, Plus, Edit2, Search, ChevronLeft, ChevronRight, Copy, Package, Leaf, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils';
import { useRawMaterialsQuery } from '@/hooks/mrp/useRawMaterials';
import { useMrpQueryErrorToast } from '@/hooks/mrp/useMrpQueryErrorToast';
import { Badge } from '@/components/ui/badge';

export default function RawMaterialListPage() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const limit = 10;

    const { materials, total, loading, error } = useRawMaterialsQuery(page, limit, debouncedSearch);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [search]);

    useMrpQueryErrorToast(error, 'No se pudo cargar la materia prima');

    // Calculate some basic stats if we have data on the current page
    // In a real app, these might come from a separate summary endpoint
    const stats = useMemo(() => {
        const lowStockCount = materials.filter(m => (m.minStockLevel && m.minStockLevel > 0) /* Ideally we compare with actual stock */).length;

        return {
            totalMaterials: total,
            lowStock: lowStockCount, // Just a placeholder logic for UI demonstration
        };
    }, [materials, total]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
            {/* Hero Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl shadow-sm hidden sm:block">
                        <Leaf className="h-8 w-8" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
                                Materia Prima
                            </h1>
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 uppercase tracking-wider text-[10px] font-bold">
                                MRP
                            </Badge>
                        </div>
                        <p className="text-slate-500 text-base max-w-2xl">
                            Gestiona tu catálogo de materiales e insumos, controla costos estándar y alertas de reabastecimiento.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <Button
                        onClick={() => navigate('/mrp/raw-materials/new')}
                        className="h-11 px-6 shadow-md shadow-indigo-600/20 bg-indigo-600 hover:bg-indigo-700 text-white font-medium w-full sm:w-auto"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Material
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
                        <Package className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total Materiales</p>
                        <h3 className="text-2xl font-bold text-slate-900">
                            {loading && page === 1 ? '-' : stats.totalMaterials}
                        </h3>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl">
                        <Database className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Catálogo Activo</p>
                        <div className="flex items-center gap-2">
                            <h3 className="text-2xl font-bold text-slate-900">100%</h3>
                            <span className="text-xs text-emerald-600 font-medium flex items-center bg-emerald-100 px-1.5 py-0.5 rounded-md">
                                <ArrowUpRight className="h-3 w-3 mr-0.5" /> Activo
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-amber-50 text-amber-600 rounded-xl">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Alertas de Stock</p>
                        <h3 className="text-2xl font-bold text-slate-900">
                            {loading && page === 1 ? '-' : '0'} {/* Placeholder */}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                {/* Search Header */}
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
                    <div className="relative w-full sm:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar por nombre, SKU o proveedor..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="pl-9 h-11 bg-white border-slate-200 shadow-sm focus-visible:ring-indigo-500 w-full"
                        />
                    </div>

                    <div className="text-sm text-slate-500 font-medium">
                        {total > 0 ? `Mostrando ${materials.length} de ${total} registros` : ''}
                    </div>
                </div>

                {/* Table Section */}
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 border-b border-slate-200 hover:bg-slate-50">
                                <TableHead className="py-4 font-semibold text-slate-700 whitespace-nowrap">Material</TableHead>
                                <TableHead className="py-4 font-semibold text-slate-700 whitespace-nowrap">SKU</TableHead>
                                <TableHead className="py-4 font-semibold text-slate-700 whitespace-nowrap">Unidad</TableHead>
                                <TableHead className="py-4 font-semibold text-slate-700 whitespace-nowrap">Costos</TableHead>
                                <TableHead className="py-4 font-semibold text-slate-700 whitespace-nowrap">Última Compra</TableHead>
                                <TableHead className="py-4 text-right font-semibold text-slate-700 whitespace-nowrap">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-500 space-y-3">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                            <span className="text-sm font-medium">Cargando catálogo...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : materials.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-500 space-y-3">
                                            <div className="p-4 bg-slate-100 rounded-full">
                                                <Package className="h-8 w-8 text-slate-400" />
                                            </div>
                                            <p className="text-base font-medium text-slate-900">No se encontraron materiales</p>
                                            <p className="text-sm text-slate-500 max-w-sm">
                                                {search ? 'Intenta ajustando tu búsqueda.' : 'Comienza agregando tu primera materia prima o insumo.'}
                                            </p>
                                            {!search && (
                                                <Button
                                                    variant="outline"
                                                    className="mt-2 border-indigo-200 text-indigo-700 hover:bg-emerald-50"
                                                    onClick={() => navigate('/mrp/raw-materials/new')}
                                                >
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Agregar Material
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                materials.map((material) => (
                                    <TableRow
                                        key={material.id}
                                        className="group hover:bg-slate-50/80 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/mrp/raw-materials/${material.id}`)}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100/50 group-hover:scale-105 transition-transform">
                                                    <Database className="h-5 w-5 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900">{material.name}</p>
                                                    <p className="text-xs text-slate-500 line-clamp-1">{material.supplierName || 'Proveedor no definido'}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="bg-slate-100 text-slate-700 font-mono border-slate-200">
                                                {material.sku}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm font-medium text-slate-700 uppercase">{material.unit}</span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-900">{formatCurrency(material.averageCost)} <span className="text-[10px] text-slate-400 font-normal uppercase">Promedio</span></span>
                                                <span className="text-xs text-slate-500">{formatCurrency(material.cost)} <span className="text-[10px] uppercase">Ref.</span></span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-700">{material.lastPurchasePrice ? formatCurrency(material.lastPurchasePrice) : '-'}</span>
                                                <span className="text-xs text-slate-500">
                                                    {material.lastPurchaseDate ? new Date(material.lastPurchaseDate).toLocaleDateString() : 'Sin compras'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate('/mrp/raw-materials/new', {
                                                            state: {
                                                                initialData: {
                                                                    ...material,
                                                                    name: `${material.name} (Copia)`,
                                                                    sku: '',
                                                                    id: undefined,
                                                                    createdAt: undefined,
                                                                    updatedAt: undefined
                                                                }
                                                            }
                                                        });
                                                    }}
                                                    title="Duplicar Material"
                                                    className="h-8 w-8 hover:bg-slate-100 text-slate-400 hover:text-indigo-600"
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/mrp/raw-materials/${material.id}/edit`);
                                                    }}
                                                    title="Editar Material"
                                                    className="h-8 w-8 hover:bg-slate-100 text-slate-400 hover:text-indigo-600"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Footer */}
                {total > 0 && !loading && (
                    <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/50">
                        <div className="text-sm text-slate-500 font-medium hidden sm:block">
                            Página {page} de {Math.max(1, Math.ceil(total / limit))}
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="border-slate-200 text-slate-600 hover:bg-slate-100"
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Anterior
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => p + 1)}
                                disabled={page >= Math.ceil(total / limit)}
                                className="border-slate-200 text-slate-600 hover:bg-slate-100"
                            >
                                Siguiente
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
