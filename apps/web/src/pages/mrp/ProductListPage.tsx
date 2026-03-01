import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Package, Plus, Layers, Trash2, Edit2, BoxSelect, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api-error';
import { useDeleteProductMutation, useProductsQuery } from '@/hooks/mrp/useProducts';
import { useMrpQueryErrorToast } from '@/hooks/mrp/useMrpQueryErrorToast';
import { Badge } from '@/components/ui/badge';

export default function ProductListPage() {
    const navigate = useNavigate();
    const { toast } = useToast();

    const { data: productsResponse, loading, error } = useProductsQuery();
    const products = productsResponse?.products ?? [];
    const { execute: deleteProduct } = useDeleteProductMutation();

    useMrpQueryErrorToast(error, 'No se pudieron cargar los productos');

    const handleDeleteProduct = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.')) return;
        try {
            await deleteProduct(id);
            toast({
                title: 'Éxito',
                description: 'Producto eliminado correctamente',
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: getErrorMessage(error, 'No se pudo eliminar el producto'),
                variant: 'destructive',
            });
        }
    };

    // Calculate KPIs
    const totalProducts = products.length;
    const productsWithVariants = products.filter(p => p.variants && p.variants.length > 0).length;

    // Simple heuristic for low margin products (less than 30%)
    const lowMarginProducts = products.filter(product => {
        const variants = product.variants || [];
        if (variants.length === 0) return false;

        const maxPriceVariant = [...variants].sort((a, b) => (b.price || 0) - (a.price || 0))[0];
        const generalPrice = maxPriceVariant ? maxPriceVariant.price : 0;

        const maxCostVariant = [...variants].sort((a, b) => (b.cost || 0) - (a.cost || 0))[0];
        const maxCost = maxCostVariant ? maxCostVariant.cost : 0;

        const safetyMargin = generalPrice > 0 ? (generalPrice - maxCost) / generalPrice : null;
        return safetyMargin !== null && safetyMargin < 0.3;
    }).length;

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
            {/* Hero Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-fuchsia-100 text-fuchsia-700 rounded-2xl shadow-sm hidden sm:block">
                        <Package className="h-8 w-8" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
                                Productos Terminados
                            </h1>
                            <Badge variant="outline" className="bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 uppercase tracking-wider text-[10px] font-bold">
                                Catálogo
                            </Badge>
                        </div>
                        <p className="text-slate-500 text-base max-w-2xl">
                            Gestiona tu catálogo de productos, variantes, fórmulas (BOM) y controla tus márgenes de rentabilidad.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <Button
                        onClick={() => navigate('/mrp/products/new')}
                        className="h-11 px-6 shadow-md shadow-fuchsia-600/20 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-medium w-full sm:w-auto transition-colors"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Producto
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
                        <Package className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-xs sm:text-sm font-medium text-slate-500">Total Productos</p>
                        <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                            {loading ? '-' : totalProducts}
                        </h3>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <BoxSelect className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-xs sm:text-sm font-medium text-slate-500">Con Variantes</p>
                        <div className="flex items-center gap-2">
                            <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                                {loading ? '-' : productsWithVariants}
                            </h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${lowMarginProducts > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                        <AlertCircle className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-xs sm:text-sm font-medium text-slate-500">Margen Crítico (&lt;30%)</p>
                        <h3 className={`text-xl sm:text-2xl font-bold ${lowMarginProducts > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                            {loading ? '-' : lowMarginProducts}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="text-sm text-slate-500 font-medium">
                        {totalProducts > 0 ? `Mostrando ${totalProducts} productos` : ''}
                    </div>
                </div>

                {/* Table Section */}
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 border-b border-slate-200 hover:bg-slate-50">
                                <TableHead className="py-4 font-semibold text-slate-700 whitespace-nowrap">Producto</TableHead>
                                <TableHead className="py-4 font-semibold text-slate-700 whitespace-nowrap">SKU</TableHead>
                                <TableHead className="py-4 font-semibold text-slate-700 whitespace-nowrap text-center">Variantes</TableHead>
                                <TableHead className="py-4 font-semibold text-slate-700 whitespace-nowrap">Precio Lista (Max)</TableHead>
                                <TableHead className="py-4 font-semibold text-slate-700 whitespace-nowrap">Margen Peor Escenario</TableHead>
                                <TableHead className="py-4 text-right font-semibold text-slate-700 whitespace-nowrap">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-48 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-500 space-y-3">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fuchsia-600"></div>
                                            <span className="text-sm font-medium">Generando catálogo...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : products.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-500 space-y-3">
                                            <div className="p-4 bg-slate-100 rounded-full">
                                                <Package className="h-8 w-8 text-slate-400" />
                                            </div>
                                            <p className="text-base font-medium text-slate-900">Catalogo vacío</p>
                                            <p className="text-sm text-slate-500 max-w-sm">
                                                Comienza agregando tu primer producto terminado y define sus variantes para empezar a vender.
                                            </p>
                                            <Button
                                                variant="outline"
                                                className="mt-2 text-fuchsia-700 border-fuchsia-200 hover:bg-fuchsia-50"
                                                onClick={() => navigate('/mrp/products/new')}
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Crear Producto
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                products.map((product) => {
                                    const variants = product.variants || [];
                                    const hasVariants = variants.length > 0;

                                    const maxPriceVariant = hasVariants
                                        ? [...variants].sort((a, b) => (b.price || 0) - (a.price || 0))[0]
                                        : null;
                                    const generalPrice = maxPriceVariant ? maxPriceVariant.price : 0;

                                    const maxCostVariant = hasVariants
                                        ? [...variants].sort((a, b) => (b.cost || 0) - (a.cost || 0))[0]
                                        : null;
                                    const maxCost = maxCostVariant ? maxCostVariant.cost : 0;

                                    const safetyMargin = generalPrice > 0 ? (generalPrice - maxCost) / generalPrice : null;

                                    const getMarginColor = (margin: number | null) => {
                                        if (margin === null) return 'text-slate-500 bg-slate-100 border-slate-200';
                                        if (margin < 0.3) return 'text-red-700 bg-red-50 border-red-200';
                                        if (margin < 0.4) return 'text-amber-700 bg-amber-50 border-amber-200';
                                        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
                                    };

                                    return (
                                        <TableRow
                                            key={product.id}
                                            className="group hover:bg-slate-50/80 transition-colors cursor-pointer"
                                            onClick={() => navigate(`/mrp/products/${product.id}`)}
                                        >
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-xl bg-fuchsia-50 flex items-center justify-center border border-fuchsia-100 group-hover:scale-105 transition-transform">
                                                        <Package className="h-5 w-5 text-fuchsia-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-900">{product.name}</p>
                                                        <p className="text-xs text-slate-500 line-clamp-1">{hasVariants ? `${variants.length} configuraciones` : 'Unidad simple'}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-slate-100 text-slate-700 font-mono border-slate-200">
                                                    {product.sku}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                                                    {variants.length}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-bold text-slate-900 tracking-tight">
                                                    {hasVariants ? formatCurrency(generalPrice) : <span className="text-slate-400 font-normal italic">Sin precio</span>}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {safetyMargin !== null ? (
                                                    <Badge variant="outline" className={`font-semibold ${getMarginColor(safetyMargin)}`}>
                                                        {(safetyMargin * 100).toFixed(1)}% Mínimo
                                                    </Badge>
                                                ) : (
                                                    <span className="text-slate-400 text-xs italic">Requiere costos y precios</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={(e) => { e.stopPropagation(); navigate(`/mrp/products/${product.id}/bom`); }}
                                                        title="Receta / BOM"
                                                        className="h-8 w-8 hover:bg-fuchsia-50 text-slate-400 hover:text-fuchsia-600"
                                                    >
                                                        <Layers className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={(e) => { e.stopPropagation(); navigate(`/mrp/products/${product.id}/edit`); }}
                                                        title="Editar"
                                                        className="h-8 w-8 hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id); }}
                                                        title="Eliminar"
                                                        className="h-8 w-8 hover:bg-red-50 text-slate-400 hover:text-red-600"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
