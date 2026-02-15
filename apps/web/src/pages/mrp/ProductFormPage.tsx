import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { mrpApi } from '@/services/mrpApi';
import { generateProductSku } from '@/utils/skuGenerator';
import { Product } from '@scaffold/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Save, RefreshCw } from 'lucide-react';
import { ProductSchema } from '@scaffold/schemas';
import { ZodError } from 'zod';

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
            navigate('/mrp/products');
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
            ProductSchema.parse(formData);

            if (isEditing) {
                await mrpApi.updateProduct(id!, formData);
                toast({
                    title: 'Éxito',
                    description: 'Producto actualizado exitosamente',
                });
                navigate(`/mrp/products/${id}`);
            } else {
                const newProduct = await mrpApi.createProduct(formData);
                toast({
                    title: 'Éxito',
                    description: 'Producto creado exitosamente',
                });
                navigate(`/mrp/products/${newProduct.id}`);
            }
        } catch (error) {
            if (error instanceof ZodError) {
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

    if (loading && !product && isEditing) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-lg text-slate-500">Cargando...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => isEditing ? navigate(`/mrp/products/${id}`) : navigate('/mrp/products')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
                    </h1>
                    <p className="text-slate-500">
                        {isEditing ? 'Modifica la información básica del producto.' : 'Ingresa la información básica del producto.'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Product Basic Info */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <h2 className="text-lg font-semibold text-slate-900">Información Básica</h2>
                    <div className="space-y-4">
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
                                            setSkuManuallyEdited(false);
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

                <div className="flex justify-end gap-4">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => isEditing ? navigate(`/mrp/products/${id}`) : navigate('/mrp/products')}
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
        </div>
    );
}
