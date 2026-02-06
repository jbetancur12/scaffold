import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { mrpApi } from '@/services/mrpApi';
import { Product } from '@scaffold/types';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Save, Plus, Trash2, Edit2 } from 'lucide-react';
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
});

interface VariantFormData {
    id?: string;
    name: string;
    sku: string;
    price: number;
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

    // Variant management
    const [showVariantDialog, setShowVariantDialog] = useState(false);
    const [editingVariant, setEditingVariant] = useState<VariantFormData | null>(null);
    const [variantFormData, setVariantFormData] = useState<VariantFormData>({
        name: '',
        sku: '',
        price: 0,
    });

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
        setVariantFormData({ name: '', sku: '', price: 0 });
        setShowVariantDialog(true);
    };

    const handleEditVariant = (variant: VariantFormData) => {
        setEditingVariant(variant);
        setVariantFormData(variant);
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
                                <Input
                                    id="sku"
                                    value={formData.sku}
                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                    placeholder="Ej. CAM-BAS"
                                    required
                                />
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
                                            <TableHead>Nombre</TableHead>
                                            <TableHead>SKU</TableHead>
                                            <TableHead>Precio</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {product.variants.map((variant) => (
                                            <TableRow key={variant.id}>
                                                <TableCell className="font-medium">{variant.name}</TableCell>
                                                <TableCell>{variant.sku}</TableCell>
                                                <TableCell>${variant.price?.toFixed(2) || '0.00'}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleEditVariant(variant as VariantFormData)}
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeleteVariant(variant.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
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
                                <Input
                                    id="variant-sku"
                                    value={variantFormData.sku}
                                    onChange={(e) => setVariantFormData({ ...variantFormData, sku: e.target.value })}
                                    placeholder="Ej. CAM-BAS-R-M"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="variant-price">Precio</Label>
                                <Input
                                    id="variant-price"
                                    type="number"
                                    step="0.01"
                                    value={variantFormData.price}
                                    onChange={(e) => setVariantFormData({ ...variantFormData, price: parseFloat(e.target.value) || 0 })}
                                    placeholder="0.00"
                                />
                            </div>
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
