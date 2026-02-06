import { useState, useEffect, useCallback } from 'react';
import { mrpApi } from '@/services/mrpApi';
import { Product } from '@scaffold/types';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Package, Plus, Layers } from 'lucide-react';
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
            setProducts(response.products); // Adjusted to match API response structure
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

    return (
        <DashboardLayout>
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
                                    <TableHead className="text-right font-bold text-slate-900">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {products.map((product) => (
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
                                        <TableCell>{product.variants?.length || 0}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/mrp/products/${product.id}/bom`)}>
                                                    <Layers className="h-4 w-4 mr-2" />
                                                    BOM
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/mrp/products/${product.id}`)}>
                                                    Editar
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
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
        </DashboardLayout>
    );
}
