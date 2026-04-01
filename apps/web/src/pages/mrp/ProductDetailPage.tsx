import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { generateVariantDisplayName, generateVariantSku, generateVariantSkuFromAttributes } from '@/utils/skuGenerator';
import { ProductTaxStatus, ProductVariant } from '@scaffold/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Save, Plus, Trash2, Edit2, RefreshCw, Package, Layers, Clock, ShieldCheck, BoxSelect, AreaChart, DollarSign, Activity, Hash, ChevronDown, ChevronRight, ImagePlus, Image } from 'lucide-react';
import { CreateProductVariantSchema, UpdateProductVariantSchema } from '@scaffold/schemas';
import { getErrorMessage } from '@/lib/api-error';
import { sortProductVariantsBySize } from '@/lib/utils';
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
import { useOperationalConfigQuery } from '@/hooks/mrp/useOperationalConfig';
import { useDeleteProductMutation, useDeleteVariantMutation, useProductQuery, useSaveVariantMutation } from '@/hooks/mrp/useProducts';
import { useMrpQueryErrorRedirect } from '@/hooks/mrp/useMrpQueryErrorRedirect';
import { Badge } from '@/components/ui/badge';
import { mrpApi } from '@/services/mrpApi';

interface VariantFormData {
    id?: string;
    name: string;
    size: string;
    sizeCode: string;
    color: string;
    colorCode: string;
    sku: string;
    price: number;
    distributorPriceUpdatedAt?: string | Date;
    pvpMargin: number;
    pvpPrice?: number;
    targetMargin: number;
    productionMinutes?: number;
    cost?: number;
    taxStatus: ProductTaxStatus;
    taxRate: number;
}

interface PendingVariantPropagation {
    distributorPriceChanged: boolean;
    productionMinutesChanged: boolean;
    pvpMarginChanged: boolean;
    targetMarginChanged: boolean;
    taxTreatmentChanged: boolean;
}

export default function ProductDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();

    // Variant management state
    const [showVariantDialog, setShowVariantDialog] = useState(false);
    const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
    const [variantFormData, setVariantFormData] = useState<VariantFormData>({
        name: '',
        size: '',
        sizeCode: '',
        color: '',
        colorCode: '',
        sku: '',
        price: 0,
        pvpMargin: 0.25,
        targetMargin: 0.4,
        taxStatus: ProductTaxStatus.EXCLUIDO,
        taxRate: 0,
    });
    const [variantNameManuallyEdited, setVariantNameManuallyEdited] = useState(false);
    const [variantSkuManuallyEdited, setVariantSkuManuallyEdited] = useState(false);
    const [variantIdentityOpen, setVariantIdentityOpen] = useState(true);
    const [showVariantPropagationDialog, setShowVariantPropagationDialog] = useState(false);
    const [pendingVariantPropagation, setPendingVariantPropagation] = useState<PendingVariantPropagation | null>(null);
    const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
    const [uploadingImage, setUploadingImage] = useState(false);
    const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
    const imageUrlRef = useRef<Record<string, string>>({});

    const { data: operationalConfig } = useOperationalConfigQuery();
    const { data: product, loading, error, execute: reloadProduct } = useProductQuery(id);
    const { execute: deleteProduct } = useDeleteProductMutation();
    const { execute: saveVariant } = useSaveVariantMutation();
    const { execute: deleteVariant } = useDeleteVariantMutation();
    const sortedVariants = useMemo(() => sortProductVariantsBySize(product?.variants || []), [product?.variants]);

    useMrpQueryErrorRedirect(error, 'No se pudo cargar el producto', '/mrp/products');

    useEffect(() => {
        const previousUrls = Object.values(imageUrlRef.current);
        previousUrls.forEach((url) => URL.revokeObjectURL(url));
        imageUrlRef.current = {};
        setImageUrls({});

        if (!id || !product?.images || product.images.length === 0) {
            return;
        }

        let cancelled = false;
        const loadImages = async () => {
            for (const image of product.images || []) {
                try {
                    const blob = await mrpApi.downloadProductImage(id, image.id);
                    if (cancelled) return;
                    const url = URL.createObjectURL(blob);
                    imageUrlRef.current = { ...imageUrlRef.current, [image.id]: url };
                    setImageUrls((prev) => ({ ...prev, [image.id]: url }));
                } catch {
                    if (cancelled) return;
                }
            }
        };
        loadImages();

        return () => {
            cancelled = true;
        };
    }, [id, product?.images]);

    // Variant SKU generation listener
    useEffect(() => {
        if (!showVariantDialog || editingVariant) return;

        const autoName = generateVariantDisplayName(variantFormData.size, variantFormData.color, variantFormData.name);
        const autoSku = generateVariantSkuFromAttributes(
            product?.sku || '',
            variantFormData.size,
            variantFormData.color,
            variantFormData.sizeCode,
            variantFormData.colorCode,
        ) || (variantFormData.name ? generateVariantSku(product?.sku || '', variantFormData.name) : product?.sku || '');

        setVariantFormData((prev) => ({
            ...prev,
            name: variantNameManuallyEdited ? prev.name : autoName,
            sku: variantSkuManuallyEdited ? prev.sku : autoSku,
        }));
    }, [
        showVariantDialog,
        editingVariant,
        product?.sku,
        variantFormData.size,
        variantFormData.color,
        variantFormData.sizeCode,
        variantFormData.colorCode,
        variantNameManuallyEdited,
        variantSkuManuallyEdited,
    ]);

    const handleAddVariant = () => {
        setEditingVariant(null);
        setVariantFormData({
            name: '',
            size: '',
            sizeCode: '',
            color: '',
            colorCode: '',
            sku: '',
            price: 0,
            pvpMargin: 0.25,
            targetMargin: 0.4,
            productionMinutes: 0,
            taxStatus: ProductTaxStatus.EXCLUIDO,
            taxRate: 0,
        });
        setVariantNameManuallyEdited(false);
        setVariantSkuManuallyEdited(false);
        setVariantIdentityOpen(true);
        setShowVariantDialog(true);
    };

    const handleEditVariant = (variant: ProductVariant) => {
        setEditingVariant(variant);
        setVariantFormData({
            name: variant.name,
            size: variant.size || '',
            sizeCode: variant.sizeCode || '',
            color: variant.color || '',
            colorCode: variant.colorCode || '',
            sku: variant.sku,
            price: variant.price,
            distributorPriceUpdatedAt: variant.distributorPriceUpdatedAt,
            pvpMargin: variant.pvpMargin ?? 0.25,
            pvpPrice: variant.pvpPrice ?? 0,
            targetMargin: variant.targetMargin ?? 0.4,
            productionMinutes: variant.productionMinutes ?? 0,
            taxStatus: variant.taxStatus ?? ProductTaxStatus.EXCLUIDO,
            taxRate: Number(variant.taxRate || 0),
        });
        setVariantNameManuallyEdited(true);
        setVariantSkuManuallyEdited(true);
        setVariantIdentityOpen(true);
        setShowVariantDialog(true);
    };

    const toBase64 = (file: File) =>
        new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
            reader.readAsDataURL(file);
        });

    const handleUploadImage = () => {
        if (!id) return;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            try {
                setUploadingImage(true);
                const base64Data = await toBase64(file);
                await mrpApi.uploadProductImage(id, {
                    fileName: file.name,
                    mimeType: file.type || 'application/octet-stream',
                    base64Data,
                    actor: 'sistema-web',
                });
                toast({
                    title: 'Imagen cargada',
                    description: 'La imagen del producto se guardó correctamente.',
                });
                await reloadProduct();
            } catch (error) {
                toast({
                    title: 'Error',
                    description: getErrorMessage(error, 'No se pudo cargar la imagen'),
                    variant: 'destructive',
                });
            } finally {
                setUploadingImage(false);
            }
        };
        input.click();
    };

    const handleDeleteImage = async (imageId: string) => {
        if (!id) return;
        try {
            setDeletingImageId(imageId);
            await mrpApi.deleteProductImage(id, imageId);
            toast({
                title: 'Imagen eliminada',
                description: 'La imagen fue eliminada del producto.',
            });
            await reloadProduct();
        } catch (error) {
            toast({
                title: 'Error',
                description: getErrorMessage(error, 'No se pudo eliminar la imagen'),
                variant: 'destructive',
            });
        } finally {
            setDeletingImageId(null);
        }
    };

    const getTaxStatusLabel = (status?: ProductTaxStatus) => {
        switch (status) {
            case ProductTaxStatus.GRAVADO:
                return 'Gravado';
            case ProductTaxStatus.EXENTO:
                return 'Exento';
            case ProductTaxStatus.EXCLUIDO:
            default:
                return 'Excluido';
        }
    };

    const calculatePvpPrice = (distributorPrice: number, margin: number) => {
        const safeMargin = Math.min(0.99, Math.max(0, margin || 0));
        if (!distributorPrice || distributorPrice <= 0) return 0;
        return distributorPrice / (1 - safeMargin);
    };

    const formatDateOnly = (value?: string | Date) => {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const toComparableNumber = (value?: number | null) => Number(value || 0);

    const clearPendingVariantPropagation = () => {
        setPendingVariantPropagation(null);
        setShowVariantPropagationDialog(false);
    };

    const getVariantPropagationLabels = (pending: PendingVariantPropagation | null) => {
        if (!pending) return '';
        return [
            pending.distributorPriceChanged ? 'precio a distribuidor' : null,
            pending.productionMinutesChanged ? 'tiempo de producción' : null,
            pending.pvpMarginChanged ? 'margen PVP' : null,
            pending.targetMarginChanged ? 'margen esperado' : null,
            pending.taxTreatmentChanged ? 'tratamiento de IVA' : null,
        ].filter(Boolean).join(' y ');
    };

    const persistVariant = async (options?: {
        applyDistributorPriceToAllVariants?: boolean;
        applyProductionMinutesToAllVariants?: boolean;
        applyPvpMarginToAllVariants?: boolean;
        applyTargetMarginToAllVariants?: boolean;
        applyTaxTreatmentToAllVariants?: boolean;
    }) => {
        if (!id) return;

        if (editingVariant?.id) {
            const validatedData = UpdateProductVariantSchema.parse({
                ...variantFormData,
                applyDistributorPriceToAllVariants: options?.applyDistributorPriceToAllVariants ?? false,
                applyProductionMinutesToAllVariants: options?.applyProductionMinutesToAllVariants ?? false,
                applyPvpMarginToAllVariants: options?.applyPvpMarginToAllVariants ?? false,
                applyTargetMarginToAllVariants: options?.applyTargetMarginToAllVariants ?? false,
                applyTaxTreatmentToAllVariants: options?.applyTaxTreatmentToAllVariants ?? false,
            });
            await saveVariant({ productId: id, variantId: editingVariant.id, payload: validatedData });
            const appliedFields = [
                options?.applyDistributorPriceToAllVariants ? 'precio a distribuidor' : null,
                options?.applyProductionMinutesToAllVariants ? 'tiempo de producción' : null,
                options?.applyPvpMarginToAllVariants ? 'margen PVP' : null,
                options?.applyTargetMarginToAllVariants ? 'margen esperado' : null,
                options?.applyTaxTreatmentToAllVariants ? 'tratamiento de IVA' : null,
            ].filter(Boolean).join(' y ');
            toast({
                title: 'Éxito',
                description: appliedFields
                    ? `Variante actualizada y ${appliedFields} aplicado(s) a todas las variantes`
                    : 'Variante actualizada exitosamente',
            });
        } else {
            const validatedData = CreateProductVariantSchema.parse(variantFormData);
            await saveVariant({ productId: id, payload: validatedData });
            toast({ title: 'Éxito', description: 'Variante creada exitosamente' });
        }

        clearPendingVariantPropagation();
        setShowVariantDialog(false);
        await reloadProduct({ force: true });
    };

    const handleDeleteProduct = async () => {
        if (!confirm('¿Estás seguro de eliminar este producto y todas sus variantes? Esta acción no se puede deshacer.')) return;
        try {
            if (!id) return;
            await deleteProduct(id);
            toast({ title: 'Éxito', description: 'Producto eliminado permanentemente' });
            navigate('/mrp/products');
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo eliminar el producto'), variant: 'destructive' });
        }
    };

    const handleSaveVariant = async () => {
        try {
            if (editingVariant?.id) {
                const distributorPriceChanged = toComparableNumber(variantFormData.price) !== toComparableNumber(editingVariant.price);
                const productionMinutesChanged = toComparableNumber(variantFormData.productionMinutes) !== toComparableNumber(editingVariant.productionMinutes);
                const pvpMarginChanged = toComparableNumber(variantFormData.pvpMargin) !== toComparableNumber(editingVariant.pvpMargin);
                const targetMarginChanged = toComparableNumber(variantFormData.targetMargin) !== toComparableNumber(editingVariant.targetMargin);
                const taxTreatmentChanged =
                    variantFormData.taxStatus !== (editingVariant.taxStatus ?? ProductTaxStatus.EXCLUIDO)
                    || toComparableNumber(variantFormData.taxRate) !== toComparableNumber(editingVariant.taxRate);

                if ((product?.variants?.length || 0) > 1 && (
                    distributorPriceChanged
                    || productionMinutesChanged
                    || pvpMarginChanged
                    || targetMarginChanged
                    || taxTreatmentChanged
                )) {
                    setPendingVariantPropagation({
                        distributorPriceChanged,
                        productionMinutesChanged,
                        pvpMarginChanged,
                        targetMarginChanged,
                        taxTreatmentChanged,
                    });
                    setShowVariantPropagationDialog(true);
                    return;
                }
            }
            await persistVariant();
        } catch (error) {
            toast({
                title: 'Error',
                description: getErrorMessage(error, 'No se pudo guardar la variante'),
                variant: 'destructive',
            });
        }
    };

    const handleDeleteVariant = async (variantId: string) => {
        if (!confirm('¿Estás seguro de eliminar esta variante?')) return;
        try {
            await deleteVariant(variantId);
            toast({ title: 'Éxito', description: 'Variante eliminada exitosamente' });
            await reloadProduct({ force: true });
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo eliminar la variante'), variant: 'destructive' });
        }
    };

    if (loading || !product) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fuchsia-600"></div>
                <div className="text-slate-500 font-medium">Cargando detalles del producto...</div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none opacity-60"></div>

                <div className="flex items-start gap-5 relative z-10 w-full sm:w-auto">
                    <div className="h-14 w-14 rounded-2xl bg-fuchsia-100 flex items-center justify-center border border-fuchsia-200 shrink-0 shadow-sm mt-1">
                        <Package className="h-7 w-7 text-fuchsia-700" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{product.name}</h1>
                            <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 uppercase tracking-widest text-[10px] font-bold">
                                {product.sku}
                            </Badge>
                            {product.category && (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 uppercase tracking-widest text-[10px] font-bold">
                                    {product.category.name}
                                </Badge>
                            )}
                            {product.requiresInvima && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1 uppercase tracking-widest text-[10px] font-bold">
                                    <ShieldCheck className="h-3 w-3" /> INVIMA
                                </Badge>
                            )}
                        </div>
                        <p className="text-slate-500 text-sm max-w-2xl mt-2 line-clamp-2">
                            {product.description || 'Sin descripción detallada configurada.'}
                        </p>
                        {(product.lengthCm != null || product.widthCm != null || product.heightCm != null || product.weightKg != null) && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {(product.lengthCm != null || product.widthCm != null || product.heightCm != null) && (
                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                        Dimensiones: {(product.lengthCm != null ? Number(product.lengthCm).toFixed(2) : '-')} x {(product.widthCm != null ? Number(product.widthCm).toFixed(2) : '-')} x {(product.heightCm != null ? Number(product.heightCm).toFixed(2) : '-')} cm
                                    </Badge>
                                )}
                                {product.weightKg != null && (
                                    <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                                        Peso: {Math.round(Number(product.weightKg) * 1000)} g
                                    </Badge>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto relative z-10">
                    <Button variant="ghost" onClick={() => navigate('/mrp/products')} className="hidden sm:flex hover:bg-slate-100">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Catálogo
                    </Button>
                    <Button variant="outline" className="hidden sm:flex text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50" onClick={() => navigate(`/mrp/products/${id}/edit`)}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Editar Info
                    </Button>
                    <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100 flex-1 sm:flex-none" onClick={handleDeleteProduct}>
                        <Trash2 className="sm:mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Eliminar</span>
                    </Button>
                </div>
            </div>

            {/* Global Pricing Reference */}
            {product && product.variants && product.variants.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Card 1: Max Selling Price */}
                    {(() => {
                        const maxPriceVariant = [...product.variants].sort((a, b) => (b.price || 0) - (a.price || 0))[0];
                        const maxPrice = maxPriceVariant ? maxPriceVariant.price : 0;

                        return (
                            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm relative overflow-hidden group">
                                <div className="absolute right-0 top-0 w-20 h-20 bg-slate-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                                <div className="flex items-center gap-3 relative z-10 mb-2">
                                    <div className="p-2 bg-slate-100 rounded-xl">
                                        <DollarSign className="h-4 w-4 text-slate-600" />
                                    </div>
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Precio de Referencia</h3>
                                </div>

                                <div className="text-2xl font-bold text-slate-900 relative z-10 tracking-tight">
                                    ${maxPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <p className="text-xs text-slate-500 mt-1 relative z-10">
                                    Determinado por <span className="font-semibold text-slate-700">{maxPriceVariant?.name}</span>.
                                </p>
                            </div>
                        );
                    })()}

                    {/* Card 2: Minimal Safety Margin */}
                    {(() => {
                        const maxCostVariant = [...product.variants].sort((a, b) => (b.cost || 0) - (a.cost || 0))[0];
                        const maxPriceVariant = [...product.variants].sort((a, b) => (b.price || 0) - (a.price || 0))[0];

                        const maxCost = maxCostVariant ? maxCostVariant.cost : 0;
                        const generalPrice = maxPriceVariant ? maxPriceVariant.price : 0;
                        const safetyMargin = generalPrice > 0 ? (generalPrice - maxCost) / generalPrice : 0;

                        const getMarginConfig = (margin: number) => {
                            if (margin < 0.3) return { bg: 'bg-red-50/50', border: 'border-red-200', text: 'text-red-700', icon: 'bg-red-100 text-red-600', dot: 'bg-red-500' };
                            if (margin < 0.4) return { bg: 'bg-amber-50/50', border: 'border-amber-200', text: 'text-amber-700', icon: 'bg-amber-100 text-amber-600', dot: 'bg-amber-500' };
                            return { bg: 'bg-emerald-50/50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'bg-emerald-100 text-emerald-600', dot: 'bg-emerald-500' };
                        };

                        const config = getMarginConfig(safetyMargin);

                        return (
                            <div className={`${config.bg} ${config.border} border p-4 rounded-2xl shadow-sm relative overflow-hidden`}>
                                <div className="flex items-center gap-3 relative z-10 mb-2">
                                    <div className={`p-2 rounded-xl ${config.icon}`}>
                                        <Activity className="h-4 w-4" />
                                    </div>
                                    <h3 className={`text-xs font-bold uppercase tracking-wider ${config.text}`}>Margen de Seguridad</h3>
                                </div>

                                <div className="flex items-baseline gap-2 relative z-10">
                                    <div className={`text-2xl font-bold tracking-tight ${config.text}`}>
                                        {(safetyMargin * 100).toFixed(1)}%
                                    </div>
                                    <div className={`h-2 w-2 rounded-full ${config.dot} animate-pulse`}></div>
                                </div>
                                <p className={`text-xs mt-1 relative z-10 opacity-80 ${config.text} leading-tight`}>
                                    Peor escenario (${generalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })} vs costo ${maxCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}).
                                </p>
                            </div>
                        );
                    })()}
                </div>
            )}

            <Tabs defaultValue="variants" className="w-full">
                <TabsList className="mb-6 bg-slate-100/50 p-1 rounded-xl inline-flex">
                    <TabsTrigger value="variants" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-fuchsia-700 font-medium transition-all">
                        <BoxSelect className="h-4 w-4 mr-2" />
                        Variantes y Precios
                    </TabsTrigger>
                    <TabsTrigger value="info" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-fuchsia-700 font-medium transition-all">
                        <Package className="h-4 w-4 mr-2" />
                        Ficha Técnica
                    </TabsTrigger>
                </TabsList>

                {/* Technical Info Tab */}
                <TabsContent value="info" className="focus-visible:outline-none focus-visible:ring-0">
                    <div className="space-y-6">
                        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                    <Package className="h-5 w-5 text-slate-400" />
                                    Información General
                                </h3>
                                <Button variant="outline" size="sm" onClick={() => navigate(`/mrp/products/${id}/edit`)} className="h-8">
                                    <Edit2 className="h-3.5 w-3.5 mr-2" />
                                    Editar
                                </Button>
                            </div>

                            <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
                                <div className="space-y-1">
                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nombre del Producto</span>
                                    <div className="text-slate-900 font-medium">{product.name}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">SKU Multi-Variante</span>
                                    <div className="text-slate-900 font-medium font-mono bg-slate-50 px-2 py-1 rounded border border-slate-100 w-fit">{product.sku}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Referencia (EAN/UPC)</span>
                                    <div className="text-slate-900 font-medium">{product.productReference || <span className="text-slate-400 italic">No especificada</span>}</div>
                                </div>

                                <div className="md:col-span-2 mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dimensiones</span>
                                        <Badge variant="outline" className="bg-white text-slate-600 border-slate-200">
                                            Unidad: cm / g
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                                            <p className="text-[11px] text-slate-500 uppercase tracking-wide">Largo</p>
                                            <p className="text-base font-semibold text-slate-900">{product.lengthCm != null ? `${Number(product.lengthCm).toFixed(2)} cm` : '-'}</p>
                                        </div>
                                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                                            <p className="text-[11px] text-slate-500 uppercase tracking-wide">Ancho</p>
                                            <p className="text-base font-semibold text-slate-900">{product.widthCm != null ? `${Number(product.widthCm).toFixed(2)} cm` : '-'}</p>
                                        </div>
                                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                                            <p className="text-[11px] text-slate-500 uppercase tracking-wide">Alto</p>
                                            <p className="text-base font-semibold text-slate-900">{product.heightCm != null ? `${Number(product.heightCm).toFixed(2)} cm` : '-'}</p>
                                        </div>
                                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                                            <p className="text-[11px] text-slate-500 uppercase tracking-wide">Peso</p>
                                            <p className="text-base font-semibold text-slate-900">{product.weightKg != null ? `${Math.round(Number(product.weightKg) * 1000)} g` : '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Invima Info Box */}
                                <div className="md:col-span-2 mt-2 bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-start gap-4">
                                    <ShieldCheck className={`h-6 w-6 shrink-0 mt-0.5 ${product.requiresInvima ? 'text-blue-500' : 'text-slate-300'}`} />
                                    <div>
                                        <div className="font-semibold text-sm text-slate-800 mb-1">Control Regulatorio (INVIMA)</div>
                                        {product.requiresInvima ? (
                                            <div className="text-sm text-slate-600">
                                                Producto sujeto a control sanitario. Registro actual: <span className="font-bold text-blue-700">{product.invimaRegistration?.code || 'No vinculado'}</span>
                                                {product.invimaRegistration?.holderName ? ` a nombre de ${product.invimaRegistration.holderName}.` : '.'}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-slate-500 italic">Este producto no requiere registro sanitario INVIMA.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                    <Image className="h-5 w-5 text-slate-400" />
                                    Imágenes del Producto
                                </h3>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8"
                                    disabled={uploadingImage}
                                    onClick={handleUploadImage}
                                >
                                    <ImagePlus className="h-3.5 w-3.5 mr-2" />
                                    {uploadingImage ? 'Subiendo...' : 'Agregar'}
                                </Button>
                            </div>

                            {product.images && product.images.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {product.images
                                        .slice()
                                        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                                        .map((image) => (
                                            <div key={image.id} className="group relative rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                                                {imageUrls[image.id] ? (
                                                    <img
                                                        src={imageUrls[image.id]}
                                                        alt={image.fileName}
                                                        className="h-40 w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="h-40 w-full flex items-center justify-center text-slate-400 text-sm">
                                                        Cargando...
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                                                    <span className="text-xs text-white truncate">{image.fileName}</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-white hover:bg-white/20"
                                                        disabled={deletingImageId === image.id}
                                                        onClick={() => handleDeleteImage(image.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            ) : (
                                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
                                    No hay imágenes cargadas. Sube la primera para mostrarla en el catálogo.
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>

                {/* Variants Tab */}
                <TabsContent value="variants" className="focus-visible:outline-none focus-visible:ring-0">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                    <Layers className="h-5 w-5 text-fuchsia-600" />
                                    Detalle de Variantes
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Administra los precios de venta, objetivos de margen y costos para cada presentación del producto.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                {/* Special BOM action when variants exist */}
                                {sortedVariants.length > 0 && (
                                    <Button
                                        variant="outline"
                                        className="border-fuchsia-200 text-fuchsia-700 hover:bg-fuchsia-50 bg-white"
                                        onClick={() => navigate(`/mrp/products/${id}/bom`)}
                                    >
                                        <Layers className="h-4 w-4 mr-2" />
                                        Modificar Recetas (BOM)
                                    </Button>
                                )}
                                <Button onClick={handleAddVariant} className="bg-slate-900 hover:bg-slate-800 text-white shadow-md">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Nueva Variante
                                </Button>
                            </div>
                        </div>

                        {sortedVariants.length > 0 ? (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200">
                                            <TableHead className="py-4 font-semibold text-slate-700 whitespace-nowrap min-w-[200px]">Identificador</TableHead>
                                            <TableHead className="py-4 font-semibold text-slate-700 whitespace-nowrap">Precio Distribuidor</TableHead>
                                            <TableHead className="py-4 font-semibold text-slate-700 whitespace-nowrap">PVP Sugerido</TableHead>
                                            <TableHead className="py-4 font-semibold text-slate-700 whitespace-nowrap">Margen Objetivo</TableHead>
                                            <TableHead className="py-4 font-semibold text-slate-700 whitespace-nowrap bg-fuchsia-50/30">Costo Actual (BOM)</TableHead>
                                            <TableHead className="py-4 font-semibold text-slate-700 whitespace-nowrap bg-fuchsia-50/30">Margen Actual</TableHead>
                                            <TableHead className="py-4 text-right font-semibold text-slate-700 whitespace-nowrap">Herramientas</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedVariants.map((variant) => {
                                            const realMargin = variant.price > 0 ? (variant.price - (variant.cost || 0)) / variant.price : 0;

                                            const getMarginStyle = (margin: number, target: number) => {
                                                const deviation = margin - target;
                                                // If deviation is highly negative
                                                if (deviation < -0.1) return 'text-red-700 bg-red-50 border-red-200 shadow-sm';
                                                // If deviation is slightly negative
                                                if (deviation < 0) return 'text-amber-700 bg-amber-50 border-amber-200';
                                                // If meeting or beating target
                                                return 'text-emerald-700 bg-emerald-50 border-emerald-200';
                                            };

                                            return (
                                                <TableRow key={variant.id} className="hover:bg-slate-50/80 transition-colors group">
                                                    <TableCell className="py-3">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-900">{variant.name}</span>
                                                            {(variant.size || variant.color) && (
                                                                <div className="mt-1 flex flex-wrap gap-1">
                                                                    {variant.size && (
                                                                        <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                                                                            Talla {variant.size}
                                                                        </Badge>
                                                                    )}
                                                                    {variant.color && (
                                                                        <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">
                                                                            {variant.color}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-1 mt-0.5">
                                                                <Hash className="h-3 w-3 text-slate-400" />
                                                                <span className="text-xs text-slate-500 font-mono tracking-wide">{variant.sku}</span>
                                                            </div>
                                                            <div className="mt-2">
                                                                <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                                                                    {getTaxStatusLabel(variant.taxStatus)}{variant.taxStatus === ProductTaxStatus.GRAVADO ? ` ${Number(variant.taxRate || 0)}%` : ''}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-semibold text-slate-900">
                                                        ${variant.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell className="font-semibold text-fuchsia-700">
                                                        ${(variant.pvpPrice || calculatePvpPrice(variant.price || 0, variant.pvpMargin || 0.25)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell className="text-slate-500 text-sm font-medium">
                                                        {((variant.targetMargin || 0.4) * 100).toFixed(0)}%
                                                    </TableCell>

                                                    {/* Actual metrics highlight */}
                                                    <TableCell className="font-bold text-slate-700 bg-slate-50/30">
                                                        ${(variant.cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell className="bg-slate-50/30">
                                                        <Badge variant="outline" className={`font-bold px-2 py-0.5 ${getMarginStyle(realMargin, variant.targetMargin || 0.4)}`}>
                                                            {(realMargin * 100).toFixed(1)}%
                                                        </Badge>
                                                    </TableCell>

                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button variant="ghost" size="icon" onClick={() => handleEditVariant(variant)} className="h-8 w-8 hover:bg-slate-100 hover:text-fuchsia-600 rounded-lg">
                                                                <Edit2 className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteVariant(variant.id)} className="h-8 w-8 hover:bg-red-50 hover:text-red-600 rounded-lg">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-12 text-center border-t border-slate-100">
                                <div className="p-4 bg-slate-100 rounded-full mb-4">
                                    <BoxSelect className="h-8 w-8 text-slate-400" />
                                </div>
                                <h4 className="text-lg font-semibold text-slate-900 mb-1">El catálogo está vacío</h4>
                                <p className="text-slate-500 max-w-sm mb-6 text-sm">
                                    Este producto aún no tiene variantes (tallas, sabores, presentaciones). Crea la primera variante para definir precios y costos.
                                </p>
                                <Button onClick={handleAddVariant} className="bg-slate-900 text-white shadow-md">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Crear Primera Variante
                                </Button>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Variant Dialog */}
            <Dialog open={showVariantDialog} onOpenChange={(open) => {
                setShowVariantDialog(open);
                if (!open) {
                    clearPendingVariantPropagation();
                }
            }}>
                <DialogContent className="sm:max-w-[550px] w-[95vw] max-h-[90vh] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl flex flex-col">
                    <DialogHeader className="p-6 pb-0 border-b-0 space-y-1 bg-slate-50/50 rounded-t-2xl shrink-0">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-fuchsia-100 text-fuchsia-600 rounded-lg">
                                <Layers className="h-5 w-5" />
                            </div>
                            <DialogTitle className="text-xl font-bold text-slate-900">
                                {editingVariant ? 'Modificar Variante' : 'Registrar Nueva Variante'}
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-slate-500 pb-4">
                            Define el nombre, identificador y la estrategia de precios comercial.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-6 space-y-5 bg-white overflow-y-auto flex-1 min-h-0">
                        <div className="rounded-2xl border border-slate-200 overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setVariantIdentityOpen((prev) => !prev)}
                                className="w-full px-4 py-3 bg-slate-50/70 flex items-center justify-between text-left hover:bg-slate-100/70 transition-colors"
                            >
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">Identidad de la variante</p>
                                    <p className="text-xs text-slate-500">Talla, color, nombre visible y SKU comercial.</p>
                                </div>
                                {variantIdentityOpen ? (
                                    <ChevronDown className="h-4 w-4 text-slate-500" />
                                ) : (
                                    <ChevronRight className="h-4 w-4 text-slate-500" />
                                )}
                            </button>

                            {variantIdentityOpen && (
                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-5 bg-white border-t border-slate-100">
                                    <div className="space-y-2">
                                        <Label htmlFor="variant-size" className="text-slate-700">Talla</Label>
                                        <Input
                                            id="variant-size"
                                            value={variantFormData.size}
                                            onChange={(e) => setVariantFormData({ ...variantFormData, size: e.target.value })}
                                            placeholder="Ej. L, M, Única"
                                            className="h-10 border-slate-200 focus:bg-slate-50/50"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="variant-color" className="text-slate-700">Color</Label>
                                        <Input
                                            id="variant-color"
                                            value={variantFormData.color}
                                            onChange={(e) => setVariantFormData({ ...variantFormData, color: e.target.value })}
                                            placeholder="Ej. Negro, Azul"
                                            className="h-10 border-slate-200 focus:bg-slate-50/50"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="variant-size-code" className="text-slate-700">Código talla</Label>
                                        <Input
                                            id="variant-size-code"
                                            value={variantFormData.sizeCode}
                                            onChange={(e) => setVariantFormData({ ...variantFormData, sizeCode: e.target.value.toUpperCase() })}
                                            placeholder="Ej. L, U"
                                            className="h-10 border-slate-200 focus:bg-slate-50/50 font-mono uppercase"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="variant-color-code" className="text-slate-700">Código color</Label>
                                        <Input
                                            id="variant-color-code"
                                            value={variantFormData.colorCode}
                                            onChange={(e) => setVariantFormData({ ...variantFormData, colorCode: e.target.value.toUpperCase() })}
                                            placeholder="Ej. N, AZ"
                                            className="h-10 border-slate-200 focus:bg-slate-50/50 font-mono uppercase"
                                        />
                                    </div>

                                    <div className="md:col-span-2 space-y-2">
                                        <Label htmlFor="variant-name" className="text-slate-700">Nombre visible de la variante</Label>
                                        <Input
                                            id="variant-name"
                                            value={variantFormData.name}
                                            onChange={(e) => {
                                                setVariantFormData({ ...variantFormData, name: e.target.value });
                                                setVariantNameManuallyEdited(true);
                                            }}
                                            placeholder="Ej. L Negro"
                                            className="h-10 border-slate-200 focus:bg-slate-50/50"
                                        />
                                        <p className="text-[11px] text-slate-500">
                                            Si no lo editas manualmente, se arma con talla + color.
                                        </p>
                                    </div>

                                    <div className="md:col-span-2 space-y-2">
                                        <Label htmlFor="variant-sku" className="text-slate-700">SKU Específico</Label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <Input
                                                    id="variant-sku"
                                                    value={variantFormData.sku}
                                                    onChange={(e) => {
                                                        setVariantFormData({ ...variantFormData, sku: e.target.value.toUpperCase() });
                                                        setVariantSkuManuallyEdited(true);
                                                    }}
                                                    placeholder="Ej. CLM051LN"
                                                    className="h-10 pl-9 font-mono text-sm uppercase"
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="h-10 w-10 shrink-0 text-slate-500"
                                                title="Sugerir SKU basado en talla y color"
                                                onClick={() => {
                                                    if (product?.sku) {
                                                        const autoSku = generateVariantSkuFromAttributes(
                                                            product.sku,
                                                            variantFormData.size,
                                                            variantFormData.color,
                                                            variantFormData.sizeCode,
                                                            variantFormData.colorCode,
                                                        ) || generateVariantSku(product.sku, variantFormData.name);
                                                        setVariantFormData({ ...variantFormData, sku: autoSku });
                                                        setVariantSkuManuallyEdited(false);
                                                    } else {
                                                        toast({ title: 'Aviso', description: 'El producto base no tiene SKU.' });
                                                    }
                                                }}
                                            >
                                                <RefreshCw className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            Formato sugerido: SKU padre + código talla + código color. Ej: <span className="font-mono">CLM051LN</span>.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                            <div className="space-y-2">
                                <Label htmlFor="variant-price" className="text-slate-700">Precio Distribuidor</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="variant-price"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={variantFormData.price || ''}
                                        onChange={(e) => setVariantFormData({ ...variantFormData, price: parseFloat(e.target.value) || 0 })}
                                        placeholder="0.00"
                                        className="h-10 pl-9 font-semibold text-slate-900"
                                    />
                                </div>
                                {editingVariant && (editingVariant.cost || 0) > 0 && (
                                    <p className="text-[11px] text-slate-500">
                                        Sugerido por costo + margen objetivo:{" "}
                                        <span className="font-semibold text-slate-700">
                                            ${(() => {
                                                const currentMinutes = variantFormData.productionMinutes || 0;
                                                const oldMinutes = editingVariant.productionMinutes || 0;
                                                let estimatedCost = editingVariant.cost || 0;

                                                if (operationalConfig) {
                                                    const costPerMinute = operationalConfig.costPerMinute || 0;
                                                    const oldOpCost = oldMinutes * costPerMinute;
                                                    const baseCost = Math.max(0, (editingVariant.cost || 0) - oldOpCost);
                                                    const newOpCost = currentMinutes * costPerMinute;
                                                    estimatedCost = baseCost + newOpCost;
                                                }

                                                const margin = variantFormData.targetMargin || 0.4;
                                                if (margin >= 1) return 'N/A';
                                                return (estimatedCost / (1 - margin)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                            })()}
                                        </span>
                                    </p>
                                )}
                                {editingVariant && variantFormData.distributorPriceUpdatedAt && (
                                    <p className="text-[11px] text-slate-500">
                                        Última actualización precio distribuidor:{" "}
                                        <span className="font-semibold text-slate-700">
                                            {formatDateOnly(variantFormData.distributorPriceUpdatedAt)}
                                        </span>
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="variant-pvp-margin" className="text-slate-700">Margen PVP (%)</Label>
                                <div className="relative">
                                    <AreaChart className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="variant-pvp-margin"
                                        type="number"
                                        step="1"
                                        min="0"
                                        max="99"
                                        value={variantFormData.pvpMargin ? (variantFormData.pvpMargin * 100) : ''}
                                        onChange={(e) => setVariantFormData({ ...variantFormData, pvpMargin: Math.min(0.99, Math.max(0, (parseFloat(e.target.value) || 0) / 100)) })}
                                        placeholder="25"
                                        className="h-10 pl-9"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">%</span>
                                </div>
                            </div>

                            <div className="md:col-span-2 space-y-2">
                                <Label htmlFor="variant-pvp" className="text-slate-700">PVP Sugerido (automático)</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fuchsia-500" />
                                    <Input
                                        id="variant-pvp"
                                        readOnly
                                        value={calculatePvpPrice(variantFormData.price || 0, variantFormData.pvpMargin || 0.25).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        className="h-10 pl-9 font-bold text-fuchsia-700 bg-fuchsia-50/40 border-fuchsia-100"
                                    />
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    Fórmula: <span className="font-mono">precio_distribuidor / (1 - margen)</span>
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="variant-target" className="text-slate-700">Margen Esperado (%)</Label>
                                <div className="relative">
                                    <AreaChart className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="variant-target"
                                        type="number"
                                        step="1"
                                        min="0"
                                        max="100"
                                        value={variantFormData.targetMargin ? (variantFormData.targetMargin * 100) : ''}
                                        onChange={(e) => setVariantFormData({ ...variantFormData, targetMargin: (parseFloat(e.target.value) || 0) / 100 })}
                                        placeholder="40"
                                        className="h-10 pl-9"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">%</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="variant-tax-status" className="text-slate-700">Tratamiento IVA</Label>
                                <select
                                    id="variant-tax-status"
                                    value={variantFormData.taxStatus}
                                    onChange={(e) => {
                                        const nextStatus = e.target.value as ProductTaxStatus;
                                        setVariantFormData((prev) => ({
                                            ...prev,
                                            taxStatus: nextStatus,
                                            taxRate: nextStatus === ProductTaxStatus.GRAVADO
                                                ? (prev.taxRate > 0 ? prev.taxRate : 19)
                                                : 0,
                                        }));
                                    }}
                                    className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm focus:ring-1 focus:ring-fuchsia-500 focus:border-fuchsia-500"
                                >
                                    <option value={ProductTaxStatus.EXCLUIDO}>Excluido</option>
                                    <option value={ProductTaxStatus.EXENTO}>Exento</option>
                                    <option value={ProductTaxStatus.GRAVADO}>Gravado</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="variant-tax-rate" className="text-slate-700">IVA %</Label>
                                <Input
                                    id="variant-tax-rate"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={variantFormData.taxRate || ''}
                                    disabled={variantFormData.taxStatus !== ProductTaxStatus.GRAVADO}
                                    onChange={(e) => setVariantFormData({
                                        ...variantFormData,
                                        taxRate: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                                    })}
                                    placeholder="0"
                                    className="h-10 border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                                />
                            </div>

                            <div className="md:col-span-2 space-y-2 mt-2">
                                <Label htmlFor="variant-minutes" className="text-slate-700 flex items-center justify-between">
                                    <span>Tiempos de Producción</span>
                                    <Badge variant="outline" className="font-normal text-[10px] bg-slate-50">Para cálculo MOD/CIF</Badge>
                                </Label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="variant-minutes"
                                        type="number"
                                        min="0"
                                        className="h-10 pl-9"
                                        value={variantFormData.productionMinutes || ''}
                                        onChange={(e) => setVariantFormData({ ...variantFormData, productionMinutes: parseFloat(e.target.value) || 0 })}
                                        placeholder="Minutos estimados por unidad..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Cost & Price Assistant */}
                        {editingVariant && (editingVariant.cost || 0) > 0 && (
                            <div className="mt-6 p-4 bg-fuchsia-50/50 rounded-xl border border-fuchsia-100">
                                <div className="text-sm font-bold text-fuchsia-800 mb-3 flex items-center gap-2">
                                    <Activity className="h-4 w-4" />
                                    Simulador de Costeo y Rentabilidad
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-slate-600">
                                        <span>Materiales Directos (BOM):</span>
                                        <span className="font-medium text-slate-800">
                                            ${(() => {
                                                const oldMinutes = editingVariant.productionMinutes || 0;
                                                const costPerMinute = operationalConfig?.costPerMinute || 0;
                                                let baseCost = editingVariant.cost || 0;

                                                if (operationalConfig) {
                                                    const oldOpCost = oldMinutes * costPerMinute;
                                                    baseCost = Math.max(0, (editingVariant.cost || 0) - oldOpCost);
                                                }
                                                return baseCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                            })()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-600">
                                        <span>Operación Directa (MOD):</span>
                                        <span className="font-medium text-slate-800">
                                            ${(() => {
                                                const activeMinutes = variantFormData.productionMinutes || 0;
                                                return (activeMinutes * (operationalConfig?.modCostPerMinute || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                            })()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-600">
                                        <span>Costos Indirectos (CIF):</span>
                                        <span className="font-medium text-slate-800">
                                            ${(() => {
                                                const activeMinutes = variantFormData.productionMinutes || 0;
                                                return (activeMinutes * (operationalConfig?.cifCostPerMinute || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                            })()}
                                        </span>
                                    </div>

                                    <div className="border-t border-fuchsia-200/50 my-2 pt-2">
                                        <div className="flex justify-between text-sm font-semibold text-slate-900 mb-1">
                                            <span>Costo Total Base:</span>
                                            <span>
                                                ${(() => {
                                                    const currentMinutes = variantFormData.productionMinutes || 0;
                                                    const oldMinutes = editingVariant.productionMinutes || 0;

                                                    if (operationalConfig) {
                                                        const costPerMinute = operationalConfig.costPerMinute || 0;
                                                        const oldOpCost = oldMinutes * costPerMinute;
                                                        const baseCost = Math.max(0, (editingVariant.cost || 0) - oldOpCost);
                                                        const newOpCost = currentMinutes * costPerMinute;
                                                        return (baseCost + newOpCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                                    }
                                                    return (editingVariant.cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                                })()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm font-bold text-fuchsia-700 bg-white p-2 rounded-lg border border-fuchsia-100 mt-2 shadow-sm">
                                            <span>Precio Distribuidor Sugerido:</span>
                                            <span>
                                                ${(() => {
                                                    const currentMinutes = variantFormData.productionMinutes || 0;
                                                    const oldMinutes = editingVariant.productionMinutes || 0;
                                                    let estimatedCost = editingVariant.cost || 0;

                                                    if (operationalConfig) {
                                                        const costPerMinute = operationalConfig.costPerMinute || 0;
                                                        const oldOpCost = oldMinutes * costPerMinute;
                                                        const baseCost = Math.max(0, (editingVariant.cost || 0) - oldOpCost);
                                                        const newOpCost = currentMinutes * costPerMinute;
                                                        estimatedCost = baseCost + newOpCost;
                                                    }

                                                    const margin = variantFormData.targetMargin || 0.4;
                                                    if (margin >= 1) return 'N/A';
                                                    return (estimatedCost / (1 - margin)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                                })()}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-fuchsia-600 uppercase tracking-wider font-bold text-right mt-1">
                                            Manteniendo el {((variantFormData.targetMargin || 0) * 100).toFixed(0)}% de margen
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-4 sm:p-6 bg-slate-50/50 border-t border-slate-100 rounded-b-2xl shrink-0">
                        <Button type="button" variant="outline" onClick={() => setShowVariantDialog(false)} className="bg-white border-slate-200 hover:bg-slate-100">
                            Cancelar
                        </Button>
                        <Button type="button" onClick={handleSaveVariant} className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white min-w-[120px] shadow-md shadow-fuchsia-600/20">
                            <Save className="h-4 w-4 mr-2" />
                            {editingVariant ? 'Guardar Cambios' : 'Generar Variante'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showVariantPropagationDialog} onOpenChange={(open) => {
                setShowVariantPropagationDialog(open);
                if (!open) {
                    setPendingVariantPropagation(null);
                }
            }}>
                <DialogContent className="sm:max-w-md border-0 shadow-2xl rounded-2xl">
                    <DialogHeader className="space-y-2">
                        <DialogTitle className="text-xl font-bold text-slate-900">
                            Aplicar cambio a variantes
                        </DialogTitle>
                        <DialogDescription className="text-slate-500">
                            Cambiaste {getVariantPropagationLabels(pendingVariantPropagation)}. Elige si quieres aplicar ese cambio a todas las variantes del producto o solo a la que estás editando.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            className="bg-white border-slate-200 hover:bg-slate-100"
                            onClick={async () => {
                                await persistVariant();
                            }}
                        >
                            Solo esta variante
                        </Button>
                        <Button
                            type="button"
                            className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
                            onClick={async () => {
                                await persistVariant({
                                    applyDistributorPriceToAllVariants: pendingVariantPropagation?.distributorPriceChanged ?? false,
                                    applyProductionMinutesToAllVariants: pendingVariantPropagation?.productionMinutesChanged ?? false,
                                    applyPvpMarginToAllVariants: pendingVariantPropagation?.pvpMarginChanged ?? false,
                                    applyTargetMarginToAllVariants: pendingVariantPropagation?.targetMarginChanged ?? false,
                                    applyTaxTreatmentToAllVariants: pendingVariantPropagation?.taxTreatmentChanged ?? false,
                                });
                            }}
                        >
                            Aplicar a todas
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
