import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mrpApi } from '@/services/mrpApi';
import { Product, RawMaterial } from '@scaffold/types';
import BOMEditor from '@/components/mrp/BOMEditor';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ProductBOMPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [product, setProduct] = useState<Product | null>(null);
    const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [productData, materialsData] = await Promise.all([
                mrpApi.getProduct(id!),
                mrpApi.getRawMaterials(1, 1000) // Load all for now
            ]);
            setProduct(productData);
            setRawMaterials(materialsData.materials || []);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'No se pudo cargar la información del producto',
                variant: 'destructive',
            });
            navigate('/dashboard/mrp/products');
        } finally {
            setLoading(false);
        }
    }, [id, navigate, toast]);

    useEffect(() => {
        if (id) {
            loadData();
        }
    }, [id, loadData]);

    if (loading) return <div>Cargando...</div>;
    if (!product) return <div>Producto no encontrado</div>;

    const variants = product.variants || [];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/mrp/products')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Configuración BOM: {product.name}
                    </h1>
                    <p className="text-slate-500">
                        Gestiona la lista de materiales para cada variante.
                    </p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                {variants.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">
                        Este producto no tiene variantes configuradas. Agrega variantes primero.
                    </div>
                ) : (
                    <Tabs defaultValue={variants[0].id} className="w-full">
                        <TabsList className="mb-4 flex flex-wrap h-auto">
                            {variants.map(variant => (
                                <TabsTrigger key={variant.id} value={variant.id} className="min-w-[100px]">
                                    {variant.name}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                        {variants.map(variant => (
                            <TabsContent key={variant.id} value={variant.id} className="space-y-4">
                                <BOMEditor variant={variant} materials={rawMaterials} />
                            </TabsContent>
                        ))}
                    </Tabs>
                )}
            </div>
        </div>
    );
}
