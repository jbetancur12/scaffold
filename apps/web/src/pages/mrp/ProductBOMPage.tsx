import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Product } from '@scaffold/types';
import BOMEditor from '@/components/mrp/BOMEditor';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Layers, Copy, CheckCircle2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getErrorMessage } from '@/lib/api-error';
import { useProductQuery } from '@/hooks/mrp/useProducts';
import { useRawMaterialsQuery } from '@/hooks/mrp/useRawMaterials';
import { useCopyBomFromVariantMutation } from '@/hooks/mrp/useBom';
import { useMrpQueryErrorRedirect } from '@/hooks/mrp/useMrpQueryErrorRedirect';
import { useMrpQueryErrorToast } from '@/hooks/mrp/useMrpQueryErrorToast';
import { Badge } from '@/components/ui/badge';

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

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fuchsia-600"></div>
                <div className="text-slate-500 font-medium">Cargando receta y materiales...</div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="text-slate-500 font-medium text-lg">Producto no encontrado</div>
                <Button variant="outline" onClick={() => navigate('/mrp/products')}>Volver al Catálogo</Button>
            </div>
        );
    }

    const variants = product.variants || [];

    const handleCopyBOM = async (targetVariantId: string, sourceVariantId: string) => {
        if (!sourceVariantId) return;
        if (!confirm('¿Estás seguro de copiar la lista de materiales? Esto agregará los materiales de la variante origen a la actual.')) return;

        try {
            const sourceBOM = await copyBomFromVariant({ sourceVariantId, targetVariantId });

            if (sourceBOM.length === 0) {
                toast({ title: 'Aviso', description: 'La variante origen no tiene materiales en su receta.' });
                return;
            }
            toast({ title: 'Éxito', description: 'Receta copiada correctamente' });
            setRefreshToken((prev) => prev + 1);
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo copiar la receta'), variant: 'destructive' });
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigate('/mrp/products')}
                        className="h-10 w-10 mt-1 rounded-xl border-slate-200 hover:bg-slate-100 shrink-0"
                    >
                        <ArrowLeft className="h-4 w-4 text-slate-600" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                                Receta y Materiales (BOM)
                            </h1>
                            <Badge variant="outline" className="bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 uppercase tracking-wider text-[10px] font-bold">
                                {product.sku}
                            </Badge>
                        </div>
                        <p className="text-slate-500 text-base">
                            Configura la lista de materiales para las variantes del producto <span className="font-semibold text-slate-700">{product.name}</span>.
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {variants.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                            <Layers className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Sin Variantes</h3>
                        <p className="text-slate-500 max-w-md mx-auto mb-6">
                            Este producto no tiene variantes configuradas. Para crear una receta de materiales, primero debes crear al menos una variante (ej. Talla Única, Sabor Original).
                        </p>
                        <Button
                            onClick={() => navigate(`/mrp/products/${id}/edit`)}
                            className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
                        >
                            Ir a configurar variantes
                        </Button>
                    </div>
                ) : (
                    <Tabs defaultValue={variants[0].id} className="w-full flex flex-col md:flex-row min-h-[600px]">
                        {/* Vertical Tabs List on Desktop, Horizontal on Mobile */}
                        <div className="md:w-64 border-r border-slate-100 bg-slate-50/50 p-4 shrink-0">
                            <div className="flex items-center gap-2 mb-4 px-2">
                                <Layers className="h-5 w-5 text-slate-400" />
                                <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wider">Variantes</h3>
                            </div>
                            <TabsList className="flex md:flex-col h-auto bg-transparent border-0 p-0 items-stretch gap-1 w-full overflow-x-auto md:overflow-visible">
                                {variants.map(variant => (
                                    <TabsTrigger
                                        key={variant.id}
                                        value={variant.id}
                                        className="justify-start px-4 py-3 h-auto text-left rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-slate-200 border border-transparent hover:bg-slate-100/50 transition-all font-medium text-slate-600 data-[state=active]:text-fuchsia-700 whitespace-nowrap min-w-[120px]"
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <span className="truncate">{variant.name}</span>
                                            {/* Optionally show a check icon if they have BOM items (if available in future data structure) */}
                                            {(variant as any).bom && (variant as any).bom.length > 0 && (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 ml-2" />
                                            )}
                                        </div>
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>

                        {/* Tab Content Area */}
                        <div className="flex-1 p-0 bg-white">
                            {variants.map((variant, index) => (
                                <TabsContent key={variant.id} value={variant.id} className="m-0 h-full focus-visible:outline-none focus-visible:ring-0">
                                    <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white sticky top-0 z-10">
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-900 inline-flex items-center gap-2">
                                                {variant.name}
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-xs font-normal">Variante {index + 1}</Badge>
                                            </h2>
                                            <p className="text-sm text-slate-500 mt-1">Define los insumos necesarios para producir una unidad de esta variante.</p>
                                        </div>

                                        {/* Copy Action */}
                                        {variants.length > 1 && (
                                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1 pr-2 shadow-sm">
                                                <div className="pl-3 py-1 flex items-center text-slate-500">
                                                    <Copy className="h-4 w-4 mr-2" />
                                                    <span className="text-sm font-medium whitespace-nowrap hidden sm:inline-block">Copiar de:</span>
                                                </div>
                                                <select
                                                    className="h-9 w-full sm:w-auto min-w-[140px] rounded-md border-0 bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-fuchsia-600 cursor-pointer disabled:cursor-not-allowed"
                                                    disabled={copyingBom}
                                                    onChange={(e) => {
                                                        if (e.target.value) handleCopyBOM(variant.id, e.target.value);
                                                        e.target.value = ''; // Reset
                                                    }}
                                                >
                                                    <option value="" disabled selected>Seleccionar...</option>
                                                    {variants.filter(v => v.id !== variant.id).map(v => (
                                                        <option key={v.id} value={v.id}>{v.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-0 sm:p-2">
                                        <BOMEditor key={`${variant.id}-${refreshToken}`} variant={variant} materials={rawMaterials} />
                                    </div>
                                </TabsContent>
                            ))}
                        </div>
                    </Tabs>
                )}
            </div>
        </div>
    );
}
