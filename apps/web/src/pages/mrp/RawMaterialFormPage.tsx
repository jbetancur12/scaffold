import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Save, RefreshCw, Calculator, Package, DollarSign, Fingerprint, Building2, Anchor } from 'lucide-react';
import { generateRawMaterialSku } from '@/utils/skuGenerator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { RawMaterial, UnitType } from '@scaffold/types';
import { CurrencyInput } from '@/components/ui/currency-input';
import { formatCurrency } from '@/lib/utils';
import { RawMaterialSchema } from '@scaffold/schemas';
import { getErrorMessage } from '@/lib/api-error';
import { useRawMaterialQuery, useSaveRawMaterialMutation } from '@/hooks/mrp/useRawMaterials';
import { useMrpQueryErrorRedirect } from '@/hooks/mrp/useMrpQueryErrorRedirect';
import { useSuppliersQuery } from '@/hooks/mrp/useSuppliers';

export default function RawMaterialFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();
    const isEditing = !!id;

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        unit: UnitType.UNIT,
        cost: 0,
        minStockLevel: 0,
        supplierId: '',
    });

    // IVA Calculator State
    const [calcPrice, setCalcPrice] = useState<number>(0);
    const [calcQty, setCalcQty] = useState<string>('');
    const [calcMode, setCalcMode] = useState<'BASE' | 'TOTAL'>('TOTAL');
    const [calcTaxRate, setCalcTaxRate] = useState(19);
    const [showCalculator, setShowCalculator] = useState(false);

    // Manual Cost IVA helper state
    const [manualIncludesIva, setManualIncludesIva] = useState(false);
    const [manualIvaPercentage, setManualIvaPercentage] = useState(19);
    const [manualBasePrice, setManualBasePrice] = useState<number>(0);

    const [skuManuallyEdited, setSkuManuallyEdited] = useState(false);

    type RawMaterialFormLocationState = {
        initialData?: Partial<RawMaterial>;
    };

    // Auto-generate SKU
    useEffect(() => {
        if (!isEditing && !skuManuallyEdited && formData.name) {
            const autoSku = generateRawMaterialSku(formData.name);
            setFormData(prev => ({ ...prev, sku: autoSku }));
        }
    }, [formData.name, isEditing, skuManuallyEdited]);

    const { data: materialData, loading: loadingMaterial, error: materialError } = useRawMaterialQuery(isEditing ? id : undefined);
    const { data: suppliersResponse } = useSuppliersQuery(1, 200);
    const { execute: saveRawMaterial } = useSaveRawMaterialMutation();
    const suppliers = suppliersResponse?.suppliers ?? [];

    useEffect(() => {
        if (isEditing) {
            if (materialData) {
                setFormData({
                    name: materialData.name,
                    sku: materialData.sku,
                    unit: materialData.unit as UnitType,
                    cost: materialData.cost,
                    minStockLevel: materialData.minStockLevel || 0,
                    supplierId: materialData.supplierId || '',
                });
            }
        } else {
            const state = location.state as RawMaterialFormLocationState | null;
            if (state?.initialData) {
                setFormData({
                    name: state.initialData.name || '',
                    sku: state.initialData.sku || '',
                    unit: state.initialData.unit as UnitType,
                    cost: state.initialData.cost || 0,
                    minStockLevel: state.initialData.minStockLevel || 0,
                    supplierId: state.initialData.supplierId || '',
                });
                if (state.initialData.sku) {
                    setSkuManuallyEdited(true);
                }
            }
        }
    }, [isEditing, materialData, location]);

    useMrpQueryErrorRedirect(materialError, 'No se pudo cargar el material', '/mrp/raw-materials');

    // Recalculate cost when calculator inputs change
    useEffect(() => {
        const qty = Number(calcQty);
        if (calcPrice > 0 && qty > 0) {
            const total = calcMode === 'BASE'
                ? calcPrice * (1 + (calcTaxRate / 100))
                : calcPrice;
            if (!manualIncludesIva) {
                setFormData(prev => ({ ...prev, cost: Number((total / qty).toFixed(2)) }));
            }
        }
    }, [calcPrice, calcQty, calcMode, calcTaxRate, manualIncludesIva]);

    // Recalculate cost when manual IVA helper changes
    useEffect(() => {
        if (manualIncludesIva && manualBasePrice > 0) {
            const totalWithIva = manualBasePrice * (1 + (manualIvaPercentage / 100));
            setFormData(prev => ({ ...prev, cost: Number(totalWithIva.toFixed(2)) }));
        }
    }, [manualBasePrice, manualIncludesIva, manualIvaPercentage]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const payload = {
                ...formData,
                cost: Number(formData.cost),
                minStockLevel: Number(formData.minStockLevel || 0),
                supplierId: formData.supplierId || undefined,
            };
            RawMaterialSchema.parse(payload);

            if (isEditing && id) {
                await saveRawMaterial({ id, payload });
                toast({
                    title: 'Material actualizado',
                    description: 'Los cambios se han guardado exitosamente.',
                });
            } else {
                await saveRawMaterial({ payload });
                toast({
                    title: 'Material creado',
                    description: 'El nuevo material se ha registrado exitosamente.',
                });
            }
            navigate('/mrp/raw-materials');
        } catch (error: unknown) {
            toast({
                title: 'Verifica los datos',
                description: getErrorMessage(error, 'Ocurrió un error al guardar o hay campos inválidos.'),
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
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => navigate('/mrp/raw-materials')}
                        className="rounded-full shadow-sm hover:bg-slate-100"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                                {isEditing ? 'Editar Material / Insumo' : 'Nuevo Material / Insumo'}
                            </h1>
                            {loadingMaterial && isEditing && (
                                <span className="flex h-3 w-3 relative ml-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            {isEditing ? 'Actualiza la información, costos y configuración de este insumo.' : 'Registra un nuevo material para tus fabricaciones y compras.'}
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: General Details */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                                <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                                    <Package className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-800">Detalles Generales</h2>
                                    <p className="text-sm text-slate-500">Identificación e información básica</p>
                                </div>
                            </div>

                            <div className="p-6 md:p-8 grid gap-8 md:grid-cols-2">
                                {/* Name Input */}
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="name" className="text-slate-700 font-medium flex items-center gap-2">
                                        Nombre del Material <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        placeholder="Ej. Bobina de cartón corrugado"
                                        className="h-11 shadow-sm focus-visible:ring-indigo-500 text-base"
                                        autoFocus
                                    />
                                </div>

                                {/* SKU Input */}
                                <div className="space-y-2">
                                    <Label htmlFor="sku" className="text-slate-700 font-medium flex items-center gap-2">
                                        <Fingerprint className="h-4 w-4 text-slate-400" />
                                        Código SKU <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="sku"
                                            value={formData.sku}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                setFormData({ ...formData, sku: e.target.value });
                                                setSkuManuallyEdited(true);
                                            }}
                                            required
                                            placeholder="Ej. MAT-001"
                                            className="h-11 shadow-sm focus-visible:ring-indigo-500 font-mono"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-11 px-3 border-dashed hover:border-indigo-300 hover:bg-indigo-50"
                                            title="Generar SKU automáticamente"
                                            onClick={() => {
                                                if (formData.name) {
                                                    const autoSku = generateRawMaterialSku(formData.name);
                                                    setFormData({ ...formData, sku: autoSku });
                                                    setSkuManuallyEdited(false);
                                                }
                                            }}
                                        >
                                            <RefreshCw className="h-4 w-4 text-slate-500" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Unit Selection */}
                                <div className="space-y-2">
                                    <Label htmlFor="unit" className="text-slate-700 font-medium flex items-center gap-2">
                                        <Anchor className="h-4 w-4 text-slate-400" />
                                        Unidad de Medida <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        value={formData.unit}
                                        onValueChange={(value: string) => setFormData({ ...formData, unit: value as UnitType })}
                                    >
                                        <SelectTrigger className="h-11 shadow-sm focus:ring-indigo-500 font-medium">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.values(UnitType).map((unit) => (
                                                <SelectItem key={unit} value={unit}>
                                                    {unit.toUpperCase()}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Supplier Selection */}
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="supplierId" className="text-slate-700 font-medium flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-slate-400" />
                                        Proveedor Preferido
                                    </Label>
                                    <Select
                                        value={formData.supplierId || '__none__'}
                                        onValueChange={(value: string) => setFormData({ ...formData, supplierId: value === '__none__' ? '' : value })}
                                    >
                                        <SelectTrigger id="supplierId" className="h-11 shadow-sm focus:ring-indigo-500">
                                            <SelectValue placeholder="Selecciona el proveedor habitual" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__" className="text-slate-500 italic">Ningún proveedor preferido</SelectItem>
                                            {suppliers.map((supplier) => (
                                                <SelectItem key={supplier.id} value={supplier.id} className="font-medium">
                                                    {supplier.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-slate-500">
                                        Se usará como valor por defecto al generar órdenes de compra para este material.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Pricing and Inventory Setting */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                                <div className="p-2 bg-green-100 text-green-700 rounded-lg">
                                    <DollarSign className="h-4 w-4" />
                                </div>
                                <h2 className="text-base font-semibold text-slate-800">Costo y Compra</h2>
                            </div>

                            <div className="p-5 space-y-6">
                                {/* Base Cost */}
                                <div className="space-y-3">
                                    <Label htmlFor="cost" className="text-slate-700 font-medium text-sm">
                                        Costo Estándar ({formData.unit.toUpperCase()})
                                    </Label>
                                    <CurrencyInput
                                        id="cost"
                                        value={formData.cost}
                                        onValueChange={(val) => {
                                            if (!manualIncludesIva) {
                                                setFormData({ ...formData, cost: val || 0 });
                                            }
                                        }}
                                        readOnly={manualIncludesIva}
                                        className={`h-12 text-lg font-semibold ${manualIncludesIva ? "bg-slate-50 text-slate-500 cursor-not-allowed border-dashed" : "shadow-inner focus-visible:ring-indigo-500"}`}
                                        required
                                    />

                                    {/* IVA Helper Toggle */}
                                    <div className="flex items-start gap-3 mt-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                        <input
                                            type="checkbox"
                                            id="manual-iva"
                                            className="mt-1 h-4 w-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-600"
                                            checked={manualIncludesIva}
                                            onChange={(e) => {
                                                setManualIncludesIva(e.target.checked);
                                                if (e.target.checked) setManualBasePrice(formData.cost);
                                            }}
                                        />
                                        <div className="flex flex-col gap-1 w-full">
                                            <Label htmlFor="manual-iva" className="text-sm font-medium text-indigo-900 cursor-pointer">
                                                Añadir IVA al precio base
                                            </Label>

                                            {manualIncludesIva && (
                                                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-indigo-100">
                                                    <div className="flex-1">
                                                        <Label className="text-[10px] text-indigo-500 uppercase font-bold tracking-wider mb-1 block">Precio Neto</Label>
                                                        <CurrencyInput
                                                            id="manual-base"
                                                            className="h-9 text-sm bg-white shadow-sm border-indigo-200"
                                                            value={manualBasePrice}
                                                            onValueChange={(val) => setManualBasePrice(val || 0)}
                                                            autoFocus
                                                        />
                                                    </div>
                                                    <div className="w-20">
                                                        <Label className="text-[10px] text-indigo-500 uppercase font-bold tracking-wider mb-1 block">% IVA</Label>
                                                        <div className="flex items-center gap-1">
                                                            <Input
                                                                type="number"
                                                                className="h-9 text-sm px-2 bg-white shadow-sm border-indigo-200"
                                                                value={manualIvaPercentage}
                                                                onChange={(e) => setManualIvaPercentage(Number(e.target.value))}
                                                            />
                                                            <span className="text-xs text-indigo-400 font-medium">%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-tight">
                                        Este es el costo promedio inicial. El sistema lo actualizará automáticamente al recibir nuevas compras.
                                    </p>
                                </div>

                                {/* Calculator Toggle */}
                                <div className="pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowCalculator(!showCalculator)}
                                        className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 transition-colors"
                                    >
                                        <Calculator className="h-4 w-4" />
                                        {showCalculator ? "Ocultar calculador de bultos" : "Calcular costo por bulto/factura"}
                                    </button>

                                    {showCalculator && (
                                        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4 shadow-inner">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <Label htmlFor="calc-price" className="text-[11px] font-semibold text-slate-500 uppercase">Monto Total</Label>
                                                    <CurrencyInput
                                                        id="calc-price"
                                                        placeholder="40.000"
                                                        className="h-8 text-sm"
                                                        onValueChange={(val) => setCalcPrice(val || 0)}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label htmlFor="calc-qty" className="text-[11px] font-semibold text-slate-500 uppercase">{formData.unit} Totales</Label>
                                                    <Input
                                                        id="calc-qty"
                                                        type="number"
                                                        placeholder="30"
                                                        className="h-8 text-sm"
                                                        value={calcQty}
                                                        onChange={(e) => setCalcQty(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <Label className="text-[11px] font-semibold text-slate-500 uppercase">¿El Monto es?</Label>
                                                    <Select value={calcMode} onValueChange={(val: 'BASE' | 'TOTAL') => setCalcMode(val)}>
                                                        <SelectTrigger className="h-8 text-xs font-medium">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="BASE">Neto (sin IVA)</SelectItem>
                                                            <SelectItem value="TOTAL">Bruto (con IVA)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label htmlFor="calc-iva-rate" className="text-[11px] font-semibold text-slate-500 uppercase">% IVA Aplicable</Label>
                                                    <div className="relative">
                                                        <Input
                                                            id="calc-iva-rate"
                                                            type="number"
                                                            className="h-8 text-sm pl-2 pr-6"
                                                            value={calcTaxRate}
                                                            onChange={(e) => setCalcTaxRate(Number(e.target.value))}
                                                        />
                                                        <span className="absolute right-2 top-2 text-xs text-slate-400">%</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {calcPrice > 0 && Number(calcQty) > 0 && (
                                                <div className="pt-3 border-t border-slate-200 mt-2 text-center bg-white p-2 rounded-lg border">
                                                    <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">Costo Resultante / {formData.unit}</span>
                                                    <span className="font-bold text-lg text-emerald-600 block">
                                                        {formatCurrency(
                                                            calcMode === 'BASE'
                                                                ? (calcPrice * (1 + (calcTaxRate / 100))) / Number(calcQty)
                                                                : calcPrice / Number(calcQty)
                                                        )}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Minimum Stock Settings */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                                <h2 className="text-base font-semibold text-slate-800">Alertas de Inventario</h2>
                            </div>
                            <div className="p-5">
                                <div className="space-y-3">
                                    <Label htmlFor="minStockLevel" className="text-slate-700 font-medium text-sm">
                                        Stock Mínimo
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="minStockLevel"
                                            type="number"
                                            min="0"
                                            className="h-11 shadow-sm font-medium pl-4 pr-12 focus-visible:ring-indigo-500"
                                            value={formData.minStockLevel}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, minStockLevel: Number(e.target.value) })}
                                            placeholder="0"
                                        />
                                        <span className="absolute right-4 top-3 text-sm text-slate-400 font-medium select-none">
                                            {formData.unit.toUpperCase()}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500">
                                        Se mostrará una alerta de reabastecimiento cuando las existencias totales en todos los almacenes caigan por debajo de esta cantidad.
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Sticky Action Footer */}
                <div className="flex items-center justify-end gap-3 pt-6 pb-2 border-t border-slate-200 sticky bottom-4 bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm border">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => navigate('/mrp/raw-materials')}
                        className="h-11 px-6 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    >
                        Descartar
                    </Button>
                    <Button
                        type="submit"
                        disabled={loading || !formData.name || !formData.sku}
                        className="h-11 px-8 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all font-medium"
                    >
                        {loading ? (
                            <>
                                <span className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></span>
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                {isEditing ? 'Guardar Cambios' : 'Crear Material'}
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
