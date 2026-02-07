import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { mrpApi } from '@/services/mrpApi';
import { generateProductSku, generateVariantSku } from '@/utils/skuGenerator';
import { Product } from '@scaffold/types';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Save, Plus, Trash2, Edit2, RefreshCw } from 'lucide-react';
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

const productSchema = z.object({
    name: z.string().min(1, 'El nombre es requerido'),
    sku: z.string().min(1, 'El SKU es requerido'),
    description: z.string().optional(),
});

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
}

export default function ProductFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const isEditing = !!id;

    const [loading, setLoading] = useState(false);
    const [product, setProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        description: '',
    });

    const [skuManuallyEdited, setSkuManuallyEdited] = useState(false);

    // Initial SKU generation listener
    useEffect(() => {
        if (!isEditing && !skuManuallyEdited && formData.name) {
            const autoSku = generateProductSku(formData.name);
            setFormData(prev => ({ ...prev, sku: autoSku }));
        }
    }, [formData.name, isEditing, skuManuallyEdited]);


    // Variant management
    const [showVariantDialog, setShowVariantDialog] = useState(false);
    const [editingVariant, setEditingVariant] = useState<VariantFormData | null>(null);
    const [variantFormData, setVariantFormData] = useState<VariantFormData>({
        name: '',
        sku: '',
        price: 0,
        targetMargin: 0.4,
    });

    // Variant SKU generation listener
    useEffect(() => {
        if (showVariantDialog && formData.sku && variantFormData.name) {
            const autoVariantSku = generateVariantSku(formData.sku, variantFormData.name);
            setVariantFormData(prev => ({ ...prev, sku: autoVariantSku }));
        }
    }, [variantFormData.name, formData.sku, showVariantDialog]);

    const loadProduct = useCallback(async () => {
        try {
            setLoading(true);
            const productData = await mrpApi.getProduct(id!);
            setProduct(productData);
            setFormData({
                name: productData.name,
                sku: productData.sku,
                description: productData.description || '',
            });
            // Reset manual edit flag when loading new product
            setSkuManuallyEdited(true);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            productSchema.parse(formData);

            if (isEditing) {
                await mrpApi.updateProduct(id!, formData);
                toast({
                    title: 'Éxito',
                    description: 'Producto actualizado exitosamente',
                });
            } else {
                await mrpApi.createProduct(formData);
                toast({
                    title: 'Éxito',
                    description: 'Producto creado exitosamente',
                });
                navigate('/dashboard/mrp/products');
            }
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
                    description: 'No se pudo guardar el producto',
                    variant: 'destructive',
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAddVariant = () => {
        setEditingVariant(null);
        setVariantFormData({ name: '', sku: '', price: 0, targetMargin: 0.4 });
        setShowVariantDialog(true);
    };

    const handleEditVariant = (variant: any) => {
        setEditingVariant(variant);
        setVariantFormData({
            ...variant,
            targetMargin: variant.targetMargin ?? 0.4
        });
        setShowVariantDialog(true);
    };

    const handleSaveVariant = async () => {
        try {
            variantSchema.parse(variantFormData);

            if (editingVariant?.id) {
                // Update existing variant
                await mrpApi.updateVariant(editingVariant.id, variantFormData);
                toast({
                    title: 'Éxito',
                    description: 'Variante actualizada exitosamente',
                });
            } else {
                // Create new variant
                await mrpApi.createVariant(id!, variantFormData);
                toast({
                    title: 'Éxito',
                    description: 'Variante creada exitosamente',
                });
            }

            setShowVariantDialog(false);
            loadProduct(); // Reload to get updated variants
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
            toast({
                title: 'Éxito',
                description: 'Variante eliminada exitosamente',
            });
            loadProduct(); // Reload to get updated variants
        } catch (error) {
            toast({
                title: 'Error',
                description: 'No se pudo eliminar la variante',
                variant: 'destructive',
            });
        }
    };

    if (loading && !product) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-lg text-slate-500">Cargando...</div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/mrp/products')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
                        </h1>
                        <p className="text-slate-500">
                            {isEditing ? 'Modifica los detalles del producto y sus variantes.' : 'Ingresa la información básica del producto.'}
                        </p>
                    </div>
                </div>

                {/* Global Product Summary */}
                {isEditing && product && product.variants && product.variants.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white border border-slate-200 p-6 rounded-3xl">
                            <Label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Precio de Venta (Ref.)</Label>
                            <div className="text-2xl font-bold text-slate-900 mt-1">
                                ${Math.max(...product.variants.map(v => v.price || 0)).toFixed(2)}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Precio de la variante más costosa</p>
                        </div>
                        {(() => {
                            const variants = product.variants || [];

                            // Find the variant with the highest production cost
                            const variantWithMaxCost = variants.length > 0
                                ? [...variants].sort((a, b) => (b.cost || 0) - (a.cost || 0))[0]
                                : null;

                            const maxCost = variantWithMaxCost ? variantWithMaxCost.cost : 0;
                            const priceRef = variantWithMaxCost ? variantWithMaxCost.price : 0;

                            const criticalMargin = (priceRef > 0) ? (priceRef - maxCost) / priceRef : 0;
                            const avgTarget = variants.length > 0
                                ? variants.reduce((acc, v) => acc + (v.targetMargin || 0.4), 0) / variants.length
                                : 0.4;

                            const getGlobalColor = (margin: number, target: number) => {
                                const deviation = margin - target;
                                if (deviation < -0.1) return 'text-red-600 bg-red-50 border-red-200';
                                if (deviation < 0) return 'text-amber-600 bg-amber-50 border-amber-200';
                                return 'text-emerald-600 bg-emerald-50 border-emerald-200';
                            };

                            return (
                                <div className={`${getGlobalColor(criticalMargin, avgTarget)} border p-6 rounded-3xl`}>
                                    <Label className="text-[10px] uppercase tracking-wider font-bold opacity-70">Margen de Seguridad (Mín.)</Label>
                                    <div className="text-2xl font-bold mt-1">
                                        {(criticalMargin * 100).toFixed(1)}%
                                    </div>
                                    <p className="text-[10px] opacity-70 mt-1">Garantizado en todas las variantes</p>
                                </div>
                            );
                        })()}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Product Basic Info */}
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                        <h2 className="text-lg font-semibold text-slate-900">Información Básica</h2>
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nombre del Producto</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej. Camiseta Básica"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sku">SKU Base</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="sku"
                                        value={formData.sku}
                                        onChange={(e) => {
                                            setFormData({ ...formData, sku: e.target.value });
                                            setSkuManuallyEdited(true);
                                        }}
                                        placeholder="Ej. CAM-BAS"
                                        required
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        title="Generar SKU automáticamente"
                                        onClick={() => {
                                            if (formData.name) {
                                                const autoSku = generateProductSku(formData.name);
                                                setFormData({ ...formData, sku: autoSku });
                                                setSkuManuallyEdited(false); // Reset so it continues to track if user keeps typing? Actually set to false means "auto mode". 
                                                // But if we click this, maybe we want it to be "auto".
                                            }
                                        }}
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Descripción</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Descripción detallada del producto..."
                                className="min-h-[100px]"
                            />
                        </div>
                    </div>

                    {/* Variants Section (only in edit mode) */}
                    {isEditing && product && (
                        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">Variantes del Producto</h2>
                                    <p className="text-sm text-slate-500">Gestiona las diferentes variantes de este producto</p>
                                </div>
                                <Button type="button" onClick={handleAddVariant} size="sm">
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
                                            <TableHead>Costo Planeado (Ref.)</TableHead>
                                            <TableHead>Margen Planeado</TableHead>
                                            <TableHead>Costo Real (Prom.)</TableHead>
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
                                                        <div className="text-[10px] text-slate-400 mt-0.5">Meta: {((variant.targetMargin || 0.4) * 100).toFixed(0)}%</div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleEditVariant(variant as any)}
                                                                className="h-8 w-8 p-0"
                                                            >
                                                                <Edit2 className="h-4 w-4 text-slate-400 group-hover:text-primary" />
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDeleteVariant(variant.id)}
                                                                className="h-8 w-8 p-0"
                                                            >
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
                                    No hay variantes configuradas. Haz clic en "Agregar Variante" para crear una.
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => navigate('/dashboard/mrp/products')}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading} className="min-w-[150px]">
                            {loading ? 'Guardando...' : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    {isEditing ? 'Actualizar Producto' : 'Crear Producto'}
                                </>
                            )}
                        </Button>
                    </div>
                </form>

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
                                        onFocus={() => {
                                            if (!variantFormData.sku && formData.sku && variantFormData.name) {
                                                setVariantFormData(prev => ({
                                                    ...prev,
                                                    sku: generateVariantSku(formData.sku, variantFormData.name)
                                                }));
                                            }
                                        }}
                                        placeholder="Ej. CAM-BAS-R-M"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        title="Generar SKU automáticamente"
                                        onClick={() => {
                                            if (formData.sku && variantFormData.name) {
                                                const autoSku = generateVariantSku(formData.sku, variantFormData.name);
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
                            {editingVariant && (editingVariant as any).cost > 0 && (
                                <div className="mt-4 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                    <div className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                                        <Save className="h-4 w-4" />
                                        Asistente de Precios
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-slate-600">
                                            <span>Costo Actual:</span>
                                            <span className="font-medium">${(editingVariant as any).cost.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-600">
                                            <span>Precio Recomendado:</span>
                                            <span className="font-bold text-primary">
                                                ${(variantFormData.targetMargin < 1 ? ((editingVariant as any).cost / (1 - (variantFormData.targetMargin || 0.4))).toFixed(2) : '0.00')}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-2 italic">
                                            * Basado en el costo real promedio y tu margen objetivo del {((variantFormData.targetMargin || 0.4) * 100).toFixed(0)}%.
                                        </p>
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
        </DashboardLayout>
    );
}
