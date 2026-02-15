import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Product } from '@scaffold/types';
import BOMEditor from '@/components/mrp/BOMEditor';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getErrorMessage } from '@/lib/api-error';
import { useProductQuery } from '@/hooks/mrp/useProducts';
import { useRawMaterialsQuery } from '@/hooks/mrp/useRawMaterials';
import { useCopyBomFromVariantMutation } from '@/hooks/mrp/useBom';
import { useMrpQueryErrorRedirect } from '@/hooks/mrp/useMrpQueryErrorRedirect';
import { useMrpQueryErrorToast } from '@/hooks/mrp/useMrpQueryErrorToast';

export default function ProductBOMPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [refreshToken, setRefreshToken] = useState(0);
    const { data: productData, loading: loadingProduct, error: productError } = useProductQuery(id);
    const { materials, loading: loadingMaterials, error: materialsError } = useRawMaterialsQuery(1, 1000, '');
    const { execute: copyBomFromVariant, loading: copyingBom } = useCopyBomFromVariantMutation();
    const product = productData as Product | undefined;
    const loading = loadingProduct || loadingMaterials;
    const rawMaterials = materials ?? [];

    useMrpQueryErrorRedirect(productError, 'No se pudo cargar la información del producto', '/mrp/products');
    useMrpQueryErrorToast(materialsError, 'No se pudo cargar la información de materias primas');

    if (loading) return <div>Cargando...</div>;
    if (!product) return <div>Producto no encontrado</div>;

    const variants = product.variants || [];

    const handleCopyBOM = async (targetVariantId: string, sourceVariantId: string) => {
        if (!sourceVariantId) return;
        if (!confirm('¿Estás seguro de copiar la lista de materiales? Esto agregará los materiales de la variante origen a la actual.')) return;

        try {
            const sourceBOM = await copyBomFromVariant({ sourceVariantId, targetVariantId });

            if (sourceBOM.length === 0) {
                toast({ title: 'Aviso', description: 'La variante origen no tiene materiales.' });
                return;
            }
            toast({ title: 'Éxito', description: 'Materiales copiados correctamente' });
            setRefreshToken((prev) => prev + 1);
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudieron copiar los materiales'), variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/mrp/products')}>
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
                        <TabsList className="mb-4 flex flex-wrap h-auto items-center gap-2">
                            {variants.map(variant => (
                                <TabsTrigger key={variant.id} value={variant.id} className="min-w-[100px]">
                                    {variant.name}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                        {variants.map(variant => (
                            <TabsContent key={variant.id} value={variant.id} className="space-y-4">
                                <div className="flex justify-end mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-500">Copiar desde:</span>
                                        <select
                                            className="h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                            disabled={copyingBom}
                                            onChange={(e) => {
                                                if (e.target.value) handleCopyBOM(variant.id, e.target.value);
                                                e.target.value = ''; // Reset
                                            }}
                                        >
                                            <option value="">Seleccionar variante...</option>
                                            {variants.filter(v => v.id !== variant.id).map(v => (
                                                <option key={v.id} value={v.id}>{v.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <BOMEditor key={`${variant.id}-${refreshToken}`} variant={variant} materials={rawMaterials} />
                            </TabsContent>
                        ))}
                    </Tabs>
                )}
            </div>
        </div>
    );
}
