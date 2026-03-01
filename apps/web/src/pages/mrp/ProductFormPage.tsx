import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { generateProductSku } from '@/utils/skuGenerator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Save, RefreshCw, Package, ShieldCheck, FileText, Hash, Layers } from 'lucide-react';
import { ProductSchema } from '@scaffold/schemas';
import { getErrorMessage } from '@/lib/api-error';
import { useInvimaRegistrationsQuery, useProductQuery, useSaveProductMutation } from '@/hooks/mrp/useProducts';
import { useMrpQueryErrorRedirect } from '@/hooks/mrp/useMrpQueryErrorRedirect';
import { Badge } from '@/components/ui/badge';

export default function ProductFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const isEditing = !!id;

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        description: '',
        requiresInvima: false,
        productReference: '',
        invimaRegistrationId: '',
    });

    const [skuManuallyEdited, setSkuManuallyEdited] = useState(false);

    // Initial SKU generation listener
    useEffect(() => {
        if (!isEditing && !skuManuallyEdited && formData.name) {
            const autoSku = generateProductSku(formData.name);
            setFormData(prev => ({ ...prev, sku: autoSku }));
        }
    }, [formData.name, isEditing, skuManuallyEdited]);


    const { data: product, loading: loadingProduct, error: productError } = useProductQuery(isEditing ? id : undefined);
    const { data: invimaRegistrations, loading: loadingInvimaRegistrations } = useInvimaRegistrationsQuery();
    const { execute: saveProduct } = useSaveProductMutation();

    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name,
                sku: product.sku,
                description: product.description || '',
                requiresInvima: product.requiresInvima || false,
                productReference: product.productReference || '',
                invimaRegistrationId: product.invimaRegistrationId || '',
            });
            setSkuManuallyEdited(true);
        }
    }, [product]);

    useMrpQueryErrorRedirect(productError, 'No se pudo cargar el producto', '/mrp/products');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const payload = {
                ...formData,
                productReference: formData.productReference || undefined,
                invimaRegistrationId: formData.invimaRegistrationId || undefined,
            };
            ProductSchema.parse(payload);

            if (isEditing && id) {
                await saveProduct({ id, payload });
                toast({
                    title: 'Éxito',
                    description: 'Producto actualizado exitosamente',
                });
                navigate(`/mrp/products/${id}`);
            } else {
                const newProduct = await saveProduct({ payload });
                toast({
                    title: 'Éxito',
                    description: 'Producto creado exitosamente',
                });
                navigate(`/mrp/products/${newProduct.id}`);
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: getErrorMessage(error, 'No se pudo guardar el producto'),
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => isEditing ? navigate(`/mrp/products/${id}`) : navigate('/mrp/products')}
                        className="h-10 w-10 rounded-xl border-slate-200 hover:bg-slate-100 shrink-0"
                    >
                        <ArrowLeft className="h-4 w-4 text-slate-600" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                                {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
                            </h1>
                            {loadingProduct && isEditing && (
                                <span className="flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-fuchsia-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-fuchsia-500"></span>
                                </span>
                            )}
                        </div>
                        <p className="text-slate-500 text-sm mt-1">
                            {isEditing ? 'Modifica la información general de este producto en el catálogo.' : 'Registra un nuevo producto terminado para venta o distribución.'}
                        </p>
                    </div>
                </div>
                {isEditing && (
                    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 uppercase tracking-wider text-[10px] font-bold w-fit">
                        ID: {id?.slice(-6) || 'N/A'}
                    </Badge>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left Column: Basic Info & Description */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Basic Information Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                                <div className="p-2 bg-fuchsia-100 text-fuchsia-600 rounded-lg">
                                    <Package className="h-5 w-5" />
                                </div>
                                <h2 className="text-lg font-semibold text-slate-800">Información General</h2>
                            </div>

                            <div className="p-5 sm:p-6 grid gap-6 md:grid-cols-2">
                                {/* Name Input */}
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="name" className="text-slate-700 font-medium">Nombre del Producto <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors text-lg"
                                        placeholder="Ej. Kit Limpieza Facial Premium"
                                        required
                                    />
                                </div>

                                {/* SKU Area */}
                                <div className="space-y-2">
                                    <Label htmlFor="sku" className="text-slate-700 font-medium">SKU Base <span className="text-red-500">*</span></Label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <Input
                                                id="sku"
                                                value={formData.sku}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, sku: e.target.value });
                                                    setSkuManuallyEdited(true);
                                                }}
                                                className="h-11 pl-10 font-mono text-sm uppercase bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                                placeholder="Ej. KIT-LIMP-01"
                                                required
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                if (formData.name) {
                                                    const autoSku = generateProductSku(formData.name);
                                                    setFormData({ ...formData, sku: autoSku });
                                                    setSkuManuallyEdited(false);
                                                } else {
                                                    toast({
                                                        title: 'Atención',
                                                        description: 'Ingresa primero el nombre para generar el SKU.',
                                                    });
                                                }
                                            }}
                                            className="h-11 w-11 p-0 shrink-0 border-slate-200 hover:bg-slate-100 text-slate-600"
                                            title="Generar Automáticamente"
                                        >
                                            <RefreshCw className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Reference */}
                                <div className="space-y-2">
                                    <Label htmlFor="productReference" className="text-slate-700 font-medium">Referencia Comercial / EAN</Label>
                                    <Input
                                        id="productReference"
                                        value={formData.productReference}
                                        onChange={(e) => setFormData({ ...formData, productReference: e.target.value })}
                                        className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors uppercase"
                                        placeholder="Ej. 7701234567890"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Description Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <h2 className="text-lg font-semibold text-slate-800">Descripción Pública</h2>
                            </div>
                            <div className="p-5 sm:p-6">
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Describe las características y beneficios del producto. Esta descripción podría usarse en catálogos y tiendas online..."
                                    className="min-h-[140px] bg-slate-50 border-slate-200 focus:bg-white transition-colors resize-y leading-relaxed"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Regulatory & Settings */}
                    <div className="space-y-6">
                        {/* Invima Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                    <ShieldCheck className="h-5 w-5" />
                                </div>
                                <h2 className="text-lg font-semibold text-slate-800">Regulación y Registro</h2>
                            </div>

                            <div className="p-5 sm:p-6 space-y-6">
                                {/* Invima Toggle */}
                                <div className={`p-4 rounded-xl border transition-colors ${formData.requiresInvima ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                                    <Label htmlFor="requiresInvima" className="flex flex-col gap-3 cursor-pointer group">
                                        <div className="flex items-center justify-between">
                                            <span className={`font-semibold ${formData.requiresInvima ? 'text-blue-900' : 'text-slate-700'}`}>Control INVIMA</span>
                                            <div className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    id="requiresInvima"
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={formData.requiresInvima}
                                                    onChange={(e) => setFormData((prev) => ({
                                                        ...prev,
                                                        requiresInvima: e.target.checked,
                                                        invimaRegistrationId: e.target.checked ? prev.invimaRegistrationId : '',
                                                    }))}
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                            </div>
                                        </div>
                                        <span className="text-sm text-slate-500 font-normal leading-relaxed">
                                            Activa esta opción si el producto requiere estar asociado a un Registro Sanitario INVIMA para su comercialización y etiquetado (Lote/Vencimiento).
                                        </span>
                                    </Label>
                                </div>

                                {/* Invima Selector */}
                                {formData.requiresInvima && (
                                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                                        <Label htmlFor="invimaRegistrationId" className="text-slate-700 font-medium">Seleccionar Registro Vigente</Label>
                                        <div className="relative">
                                            <select
                                                id="invimaRegistrationId"
                                                className="h-11 w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-50 disabled:border-slate-200 disabled:text-slate-400"
                                                disabled={loadingInvimaRegistrations}
                                                value={formData.invimaRegistrationId}
                                                onChange={(e) => setFormData({ ...formData, invimaRegistrationId: e.target.value })}
                                            >
                                                <option value="" disabled>
                                                    {loadingInvimaRegistrations ? 'Cargando registros disponibles...' : 'Selecciona un registro (Obligatorio)...'}
                                                </option>
                                                {(invimaRegistrations ?? []).map((reg) => (
                                                    <option key={reg.id} value={reg.id}>
                                                        {reg.code} - {reg.holderName}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                        {invimaRegistrations?.length === 0 && !loadingInvimaRegistrations && (
                                            <p className="text-xs text-amber-600 mt-2 font-medium">
                                                No hay registros INVIMA disponibles. Debes crear uno en el módulo de Ajustes Operativos.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Future settings hint */}
                        {!isEditing && (
                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 border-dashed text-center">
                                <Layers className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-sm text-slate-500 font-medium">Siguientes Pasos</p>
                                <p className="text-xs text-slate-400 mt-1">Una vez guardes la información general, podrás crear Variantes (Tallas, Colores, Sabores) y definir la Receta (BOM) para cada una.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sticky Action Footer */}
                <div className="flex items-center justify-end gap-3 pt-6 pb-2 border-t border-slate-200 mt-8 sticky bottom-4 bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm border">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/mrp/products')}
                        className="h-11 px-6 border-slate-200 hover:bg-slate-100"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={loading}
                        className="h-11 px-8 bg-fuchsia-600 hover:bg-fuchsia-700 text-white min-w-[150px] shadow-md shadow-fuchsia-600/20 transition-all font-semibold"
                    >
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                Guardando...
                            </div>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                {isEditing ? 'Guardar Cambios' : 'Registrar y Continuar'}
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
