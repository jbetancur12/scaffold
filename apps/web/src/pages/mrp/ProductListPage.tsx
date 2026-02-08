import { useState, useEffect, useCallback } from 'react';
import { mrpApi } from '@/services/mrpApi';
import { Product } from '@scaffold/types';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Package, Plus, Layers, Trash2, Edit2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

export default function ProductListPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    const loadProducts = useCallback(async () => {
        try {
            setLoading(true);
            const response = await mrpApi.getProducts();
            setProducts(response.products);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'No se pudieron cargar los productos',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    const handleDeleteProduct = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.')) return;
        try {
            await mrpApi.deleteProduct(id);
            toast({
                title: 'Éxito',
                description: 'Producto eliminado correctamente',
            });
            loadProducts();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'No se pudo eliminar el producto',
                variant: 'destructive',
            });
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Productos</h1>
                    <p className="text-slate-500 mt-1">Gestiona el catálogo de productos y sus variantes.</p>
                </div>
                <Button onClick={() => navigate('/dashboard/mrp/products/new')} className="shadow-lg shadow-primary/20">
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Producto
                </Button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow>
                                <TableHead className="font-bold text-slate-900">Nombre</TableHead>
                                <TableHead className="font-bold text-slate-900">SKU</TableHead>
                                <TableHead className="font-bold text-slate-900">Variantes</TableHead>
                                <TableHead className="font-bold text-slate-900">Precio de Venta</TableHead>
                                <TableHead className="font-bold text-slate-900">Margen Crítico (Mín.)</TableHead>
                                <TableHead className="text-right font-bold text-slate-900">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.map((product) => {
                                // Logic:
                                // 1. General Price = Highest Selling Price among all variants.
                                // 2. Safety Margin = (General Price - Highest Cost) / General Price.

                                const variants = product.variants || [];
                                const hasVariants = variants.length > 0;

                                // Standard logic: Find variant with MAX PRICE
                                const maxPriceVariant = hasVariants
                                    ? [...variants].sort((a, b) => (b.price || 0) - (a.price || 0))[0]
                                    : null;
                                const generalPrice = maxPriceVariant ? maxPriceVariant.price : 0;

                                // Safety Logic: Find variant with MAX COST to calculate worst-case margin
                                const maxCostVariant = hasVariants
                                    ? [...variants].sort((a, b) => (b.cost || 0) - (a.cost || 0))[0]
                                    : null;
                                const maxCost = maxCostVariant ? maxCostVariant.cost : 0;

                                // Calculate safety margin
                                const safetyMargin = generalPrice > 0 ? (generalPrice - maxCost) / generalPrice : null;

                                const getMarginColor = (margin: number | null) => {
                                    if (margin === null) return 'text-slate-400';
                                    if (margin < 0.3) return 'text-red-600 bg-red-50 border-red-100';
                                    if (margin < 0.4) return 'text-amber-600 bg-amber-50 border-amber-100';
                                    return 'text-emerald-600 bg-emerald-50 border-emerald-100';
                                };

                                return (
                                    <TableRow key={product.id} className="group hover:bg-slate-50/50 transition-colors">
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                                    <Package className="h-4 w-4 text-slate-500" />
                                                </div>
                                                <span className="text-slate-900">{product.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{product.sku}</TableCell>
                                        <TableCell>{variants.length}</TableCell>
                                        <TableCell className="font-bold text-slate-900">
                                            {hasVariants ? `$${generalPrice.toFixed(2)}` : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {safetyMargin !== null ? (
                                                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getMarginColor(safetyMargin)}`}>
                                                    {(safetyMargin * 100).toFixed(1)}% (Mín.)
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-xs">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button size="sm" variant="ghost" onClick={() => navigate(`/dashboard/mrp/products/${product.id}/bom`)} title="BOM">
                                                    <Layers className="h-4 w-4 text-slate-400 hover:text-primary" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => navigate(`/dashboard/mrp/products/${product.id}`)} title="Ver Detalle">
                                                    <Eye className="h-4 w-4 text-slate-400 hover:text-primary" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => navigate(`/dashboard/mrp/products/${product.id}/edit`)} title="Editar">
                                                    <Edit2 className="h-4 w-4 text-slate-400 hover:text-primary" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => handleDeleteProduct(product.id)} title="Eliminar">
                                                    <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {products.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-10 text-slate-500">
                                        No hay productos registrados.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    );
}
