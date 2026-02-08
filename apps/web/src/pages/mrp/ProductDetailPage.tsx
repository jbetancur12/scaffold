import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { mrpApi } from '@/services/mrpApi';
import { generateVariantSku } from '@/utils/skuGenerator';
import { Product } from '@scaffold/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Save, Plus, Trash2, Edit2, RefreshCw, Package, Layers } from 'lucide-react';
import { z } from 'zod';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const variantSchema = z.object({
    name: z.string().min(1, 'El nombre es requerido'),
    sku: z.string().min(1, 'El SKU es requerido'),
    price: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
    targetMargin: z.number().min(0).max(1, 'El margen debe estar entre 0 y 100%'),
});

interface VariantFormData {
    id?: string;
    name: string;
    sku: string;
    price: number;
    targetMargin: number;
    cost?: number;
}

export default function ProductDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [product, setProduct] = useState<Product | null>(null);

    // Variant management state
    const [showVariantDialog, setShowVariantDialog] = useState(false);
    const [editingVariant, setEditingVariant] = useState<VariantFormData | null>(null);
    const [variantFormData, setVariantFormData] = useState<VariantFormData>({
        name: '',
        sku: '',
        price: 0,
        targetMargin: 0.4,
    });

    const loadProduct = useCallback(async () => {
        try {
            setLoading(true);
            const productData = await mrpApi.getProduct(id!);
            setProduct(productData);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'No se pudo cargar el producto',
                variant: 'destructive',
            });
            navigate('/dashboard/mrp/products');
        } finally {
            setLoading(false);
        }
    }, [id, navigate, toast]);

    useEffect(() => {
        if (id) {
            loadProduct();
        }
    }, [id, loadProduct]);

    // Variant SKU generation listener
    useEffect(() => {
        if (showVariantDialog && product?.sku && variantFormData.name && !editingVariant) {
            // Only auto-generate for new variants if we haven't manually edited
            const autoVariantSku = generateVariantSku(product.sku, variantFormData.name);
            setVariantFormData(prev => ({ ...prev, sku: autoVariantSku }));
        }
    }, [variantFormData.name, product?.sku, showVariantDialog, editingVariant]);

    const handleAddVariant = () => {
        setEditingVariant(null);
        setVariantFormData({ name: '', sku: '', price: 0, targetMargin: 0.4 });
        setShowVariantDialog(true);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleEditVariant = (variant: any) => {
        setEditingVariant(variant);
        setVariantFormData({
            ...variant,
            targetMargin: variant.targetMargin ?? 0.4
        });
        setShowVariantDialog(true);
    };

    const handleDeleteProduct = async () => {
        if (!confirm('¿Estás seguro de eliminar este producto y todas sus variantes? Esta acción no se puede deshacer.')) return;
        try {
            await mrpApi.deleteProduct(id!);
            toast({ title: 'Éxito', description: 'Producto eliminado' });
            navigate('/dashboard/mrp/products');
        } catch (error) {
            toast({ title: 'Error', description: 'No se pudo eliminar el producto', variant: 'destructive' });
        }
    };

    const handleSaveVariant = async () => {
        try {
            variantSchema.parse(variantFormData);

            if (editingVariant?.id) {
                await mrpApi.updateVariant(editingVariant.id, variantFormData);
                toast({ title: 'Éxito', description: 'Variante actualizada exitosamente' });
            } else {
                await mrpApi.createVariant(id!, variantFormData);
                toast({ title: 'Éxito', description: 'Variante creada exitosamente' });
            }

            setShowVariantDialog(false);
            loadProduct();
        } catch (error) {
            if (error instanceof z.ZodError) {
                toast({
                    title: 'Error de validación',
                    description: error.errors[0].message,
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: 'Error',
                    description: 'No se pudo guardar la variante',
                    variant: 'destructive',
                });
            }
        }
    };

    const handleDeleteVariant = async (variantId: string) => {
        if (!confirm('¿Estás seguro de eliminar esta variante?')) return;
        try {
            await mrpApi.deleteVariant(variantId);
            toast({ title: 'Éxito', description: 'Variante eliminada exitosamente' });
            loadProduct();
        } catch (error) {
            toast({ title: 'Error', description: 'No se pudo eliminar la variante', variant: 'destructive' });
        }
    };

    if (loading || !product) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/mrp/products')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                            <Package className="h-5 w-5 text-slate-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{product.name}</h1>
                            <p className="text-slate-500 text-sm font-mono">{product.sku}</p>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleDeleteProduct}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                    </Button>
                    <Button onClick={() => navigate(`/dashboard/mrp/products/${id}/edit`)}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Editar Producto
                    </Button>
                </div>
            </div>

            {/* Global Pricing Reference - Visual Only */}
            {product && product.variants && product.variants.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Card 1: Max Selling Price (Reference) */}
                    {(() => {
                        const maxPriceVariant = [...product.variants].sort((a, b) => (b.price || 0) - (a.price || 0))[0];
                        const maxPrice = maxPriceVariant ? maxPriceVariant.price : 0;

                        return (
                            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                                <Label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Precio General (Ref.)</Label>
                                <div className="text-3xl font-bold text-slate-900 mt-1">
                                    ${maxPrice.toFixed(2)}
                                </div>
                                <p className="text-xs text-slate-400 mt-2">
                                    Basado en tu variante más cara ({maxPriceVariant?.name}).
                                </p>
                            </div>
                        );
                    })()}

                    {/* Card 2: Minimal Safety Margin */}
                    {(() => {
                        const maxCostVariant = [...product.variants].sort((a, b) => (b.cost || 0) - (a.cost || 0))[0];
                        const maxPriceVariant = [...product.variants].sort((a, b) => (b.price || 0) - (a.price || 0))[0];

                        // Safety Margin: (General Price - Max Cost) / General Price

                        const maxCost = maxCostVariant ? maxCostVariant.cost : 0;
                        const generalPrice = maxPriceVariant ? maxPriceVariant.price : 0;

                        const safetyMargin = generalPrice > 0 ? (generalPrice - maxCost) / generalPrice : 0;

                        const getMarginColor = (margin: number) => {
                            if (margin < 0.3) return 'bg-red-50 border-red-100 text-red-600';
                            if (margin < 0.4) return 'bg-amber-50 border-amber-100 text-amber-600';
                            return 'bg-emerald-50 border-emerald-100 text-emerald-600';
                        };

                        return (
                            <div className={`border p-6 rounded-2xl shadow-sm ${getMarginColor(safetyMargin)}`}>
                                <Label className="text-[10px] uppercase tracking-wider font-bold opacity-70">Margen de Seguridad (Mín.)</Label>
                                <div className="text-3xl font-bold mt-1">
                                    {(safetyMargin * 100).toFixed(1)}%
                                </div>
                                <p className="text-xs opacity-70 mt-2">
                                    Si vendes todo a ${generalPrice.toFixed(2)}, este es el margen que obtienes en el peor caso ({maxCostVariant?.name}).
                                </p>
                            </div>
                        );
                    })()}
                </div>
            )}

            <Tabs defaultValue="variants" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="variants">Variantes</TabsTrigger>
                    <TabsTrigger value="bom">Lista de Materiales (BOM)</TabsTrigger>
                    <TabsTrigger value="info">Información General</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="font-semibold text-lg border-b pb-2 mb-4">Información Básica</h3>
                        <div className="grid gap-6 md:grid-cols-2">
                            <div>
                                <span className="text-sm text-slate-500 block">Nombre</span>
                                <span className="font-medium">{product.name}</span>
                            </div>
                            <div>
                                <span className="text-sm text-slate-500 block">SKU Base</span>
                                <span className="font-medium font-mono">{product.sku}</span>
                            </div>
                            <div className="col-span-2">
                                <span className="text-sm text-slate-500 block">Descripción</span>
                                <p className="font-medium whitespace-pre-wrap text-sm mt-1 bg-slate-50 p-3 rounded-md border border-slate-100">
                                    {product.description || 'Sin descripción'}
                                </p>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="variants" className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-lg">Variantes del Producto</h3>
                            <Button onClick={handleAddVariant} size="sm">
                                <Plus className="h-4 w-4 mr-2" />
                                Agregar Variante
                            </Button>
                        </div>

                        {product.variants && product.variants.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nombre / SKU</TableHead>
                                        <TableHead>Precio de Venta</TableHead>
                                        <TableHead>Costo Planeado</TableHead>
                                        <TableHead>Margen Planeado</TableHead>
                                        <TableHead>Costo Real</TableHead>
                                        <TableHead>Margen Real</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {product.variants.map((variant) => {
                                        const plannedMargin = (variant.price - variant.referenceCost) / variant.price;
                                        const realMargin = (variant.price - variant.cost) / variant.price;

                                        const getMarginColor = (margin: number, target: number) => {
                                            const deviation = margin - target;
                                            if (deviation < -0.1) return 'text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-100';
                                            if (deviation < 0) return 'text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-100';
                                            return 'text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100';
                                        };

                                        return (
                                            <TableRow key={variant.id} className="hover:bg-slate-50/50">
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900">{variant.name}</span>
                                                        <span className="text-xs text-slate-500 font-mono">{variant.sku}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-medium text-slate-900">${variant.price?.toFixed(2)}</TableCell>
                                                <TableCell className="text-slate-600">${variant.referenceCost?.toFixed(2) || '0.00'}</TableCell>
                                                <TableCell className="text-slate-500 text-xs">{(plannedMargin * 100).toFixed(1)}%</TableCell>
                                                <TableCell className="font-semibold text-primary">${variant.cost?.toFixed(2) || '0.00'}</TableCell>
                                                <TableCell>
                                                    <span className={getMarginColor(realMargin, variant.targetMargin || 0.4)}>
                                                        {(realMargin * 100).toFixed(1)}%
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button variant="ghost" size="sm" onClick={() => handleEditVariant(variant)}>
                                                            <Edit2 className="h-4 w-4 text-slate-400 hover:text-primary" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handleDeleteVariant(variant.id)}>
                                                            <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="text-center py-8 text-slate-500">
                                No hay variantes configuradas.
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="bom" className="space-y-6">
                    <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center">
                        <Layers className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-900">Gestión de Lista de Materiales (BOM)</h3>
                        <p className="text-slate-500 max-w-md mx-auto mt-2 mb-6">
                            Para configurar la receta y los materiales de cada variante, accede al editor avanzado de BOM.
                        </p>
                        <Button onClick={() => navigate(`/dashboard/mrp/products/${id}/bom`)}>
                            Ir al Editor BOM
                        </Button>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Variant Dialog */}
            <Dialog open={showVariantDialog} onOpenChange={setShowVariantDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingVariant ? 'Editar Variante' : 'Nueva Variante'}
                        </DialogTitle>
                        <DialogDescription>
                            Ingresa los detalles de la variante del producto.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="variant-name">Nombre</Label>
                            <Input
                                id="variant-name"
                                value={variantFormData.name}
                                onChange={(e) => setVariantFormData({ ...variantFormData, name: e.target.value })}
                                placeholder="Ej. Camiseta Roja Talla M"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="variant-sku">SKU</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="variant-sku"
                                    value={variantFormData.sku}
                                    onChange={(e) => setVariantFormData({ ...variantFormData, sku: e.target.value })}
                                    placeholder="Ej. CAM-BAS-R-M"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    title="Generar SKU automáticamente"
                                    onClick={() => {
                                        if (product?.sku && variantFormData.name) {
                                            const autoSku = generateVariantSku(product.sku, variantFormData.name);
                                            setVariantFormData({ ...variantFormData, sku: autoSku });
                                        }
                                    }}
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="variant-price">Precio Actual</Label>
                                <Input
                                    id="variant-price"
                                    type="number"
                                    step="0.01"
                                    value={variantFormData.price}
                                    onChange={(e) => setVariantFormData({ ...variantFormData, price: parseFloat(e.target.value) || 0 })}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="variant-target">Margen Objetivo (%)</Label>
                                <Input
                                    id="variant-target"
                                    type="number"
                                    step="1"
                                    value={(variantFormData.targetMargin * 100)}
                                    onChange={(e) => setVariantFormData({ ...variantFormData, targetMargin: (parseFloat(e.target.value) || 0) / 100 })}
                                    placeholder="40"
                                />
                            </div>
                        </div>

                        {/* Assistant Logic */}
                        {editingVariant && (editingVariant.cost || 0) > 0 && (
                            <div className="mt-4 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                <div className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                                    <Save className="h-4 w-4" />
                                    Asistente de Precios
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-slate-600">
                                        <span>Costo Actual:</span>
                                        <span className="font-medium">${(editingVariant.cost || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-600">
                                        <span>Precio Recomendado:</span>
                                        <span className="font-bold text-primary">
                                            ${(variantFormData.targetMargin < 1 ? ((editingVariant.cost || 0) / (1 - (variantFormData.targetMargin || 0.4))).toFixed(2) : '0.00')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setShowVariantDialog(false)}>
                            Cancelar
                        </Button>
                        <Button type="button" onClick={handleSaveVariant}>
                            {editingVariant ? 'Actualizar' : 'Crear'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
