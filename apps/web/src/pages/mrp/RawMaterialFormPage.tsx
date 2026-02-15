import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { mrpApi } from '@/services/mrpApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Save, RefreshCw, Calculator } from 'lucide-react';
import { generateRawMaterialSku } from '@/utils/skuGenerator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { UnitType } from '@scaffold/types';
import { CurrencyInput } from '@/components/ui/currency-input';
import { formatCurrency } from '@/lib/utils';
import { RawMaterialSchema } from '@scaffold/schemas';
import { getErrorMessage } from '@/lib/api-error';

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
    });

    // IVA Calculator State
    const [calcPrice, setCalcPrice] = useState<number>(0);
    const [calcQty, setCalcQty] = useState<string>('');
    const [calcMode, setCalcMode] = useState<'BASE' | 'TOTAL'>('TOTAL');
    const [calcTaxRate, setCalcTaxRate] = useState(19);

    // Manual Cost IVA helper state
    const [manualIncludesIva, setManualIncludesIva] = useState(false);
    const [manualIvaPercentage, setManualIvaPercentage] = useState(19);
    const [manualBasePrice, setManualBasePrice] = useState<number>(0);

    const [skuManuallyEdited, setSkuManuallyEdited] = useState(false);

    // Auto-generate SKU
    useEffect(() => {
        if (!isEditing && !skuManuallyEdited && formData.name) {
            const autoSku = generateRawMaterialSku(formData.name);
            setFormData(prev => ({ ...prev, sku: autoSku }));
        }
    }, [formData.name, isEditing, skuManuallyEdited]);

    const loadMaterial = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            const material = await mrpApi.getRawMaterial(id);
            setFormData({
                name: material.name,
                sku: material.sku,
                unit: material.unit as UnitType,
                cost: material.cost,
                minStockLevel: material.minStockLevel || 0,
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: getErrorMessage(error, 'No se pudo cargar el material'),
                variant: 'destructive',
            });
            navigate('/mrp/raw-materials');
        } finally {
            setLoading(false);
        }
    }, [id, navigate, toast]);

    useEffect(() => {
        if (isEditing) {
            loadMaterial();
        } else {
            // Check for initial data from navigation state (Duplicate)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const state = (location as any).state as { initialData?: any };
            if (state?.initialData) {
                setFormData({
                    name: state.initialData.name,
                    sku: state.initialData.sku || '',
                    unit: state.initialData.unit as UnitType,
                    cost: state.initialData.cost,
                    minStockLevel: state.initialData.minStockLevel || 0,
                });
                if (state.initialData.sku) {
                    setSkuManuallyEdited(true); // Treat as manually edited if we passed a SKU (though list page clears it usually)
                }
            }
        }
    }, [isEditing, loadMaterial, location]);

    // Recalculate cost when calculator inputs change
    useEffect(() => {
        const qty = Number(calcQty);
        if (calcPrice > 0 && qty > 0) {
            const total = calcMode === 'BASE'
                ? calcPrice * (1 + (calcTaxRate / 100))
                : calcPrice;
            setFormData(prev => ({ ...prev, cost: Number((total / qty).toFixed(2)) }));
        }
    }, [calcPrice, calcQty, calcMode, calcTaxRate]);

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
            };
            RawMaterialSchema.parse(payload);

            if (isEditing) {
                await mrpApi.updateRawMaterial(id!, payload);
                toast({
                    title: 'Éxito',
                    description: 'Material actualizado exitosamente',
                });
            } else {
                await mrpApi.createRawMaterial(payload);
                toast({
                    title: 'Éxito',
                    description: 'Material creado exitosamente',
                });
            }
            navigate('/mrp/raw-materials');
        } catch (error: unknown) {
            toast({
                title: 'Error',
                description: getErrorMessage(error, 'Error al guardar'),
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/mrp/raw-materials')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        {isEditing ? 'Editar Material' : 'Nuevo Material'}
                    </h1>
                    <p className="text-slate-500">
                        {isEditing ? 'Modifica los detalles del material.' : 'Registra nueva materia prima o insumo.'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre del Material</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="Ej. Tela Algodón"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sku">SKU / Código</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="sku"
                                    value={formData.sku}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        setFormData({ ...formData, sku: e.target.value });
                                        setSkuManuallyEdited(true);
                                    }}
                                    required
                                    placeholder="Ej. MAT-TEL-001"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    title="Generar SKU automáticamente"
                                    onClick={() => {
                                        if (formData.name) {
                                            const autoSku = generateRawMaterialSku(formData.name);
                                            setFormData({ ...formData, sku: autoSku });
                                            setSkuManuallyEdited(false);
                                        }
                                    }}
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="unit">Unidad de Medida</Label>
                            <Select
                                value={formData.unit}
                                onValueChange={(value: string) => setFormData({ ...formData, unit: value as UnitType })}
                            >
                                <SelectTrigger>
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

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="cost">Costo Estándar (Por Unidad)</Label>
                                <CurrencyInput
                                    id="cost"
                                    value={formData.cost}
                                    onValueChange={(val) => {
                                        if (!manualIncludesIva) {
                                            setFormData({ ...formData, cost: val || 0 });
                                        }
                                    }}
                                    readOnly={manualIncludesIva}
                                    className={manualIncludesIva ? "bg-slate-50 cursor-not-allowed" : ""}
                                    required
                                />
                                <div className="flex flex-col gap-2 mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="manual-iva"
                                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                                            checked={manualIncludesIva}
                                            onChange={(e) => {
                                                setManualIncludesIva(e.target.checked);
                                                if (e.target.checked) {
                                                    setManualBasePrice(formData.cost);
                                                }
                                            }}
                                        />
                                        <Label htmlFor="manual-iva" className="text-xs font-semibold text-slate-700 cursor-pointer">Sumar IVA (%) al precio</Label>
                                    </div>

                                    {manualIncludesIva && (
                                        <div className="flex items-center gap-3 pt-2 border-t border-slate-200/60">
                                            <div className="flex-1 space-y-1">
                                                <Label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Precio Neto</Label>
                                                <CurrencyInput
                                                    id="manual-base"
                                                    className="h-8 text-xs bg-white"
                                                    value={manualBasePrice}
                                                    onValueChange={(val) => setManualBasePrice(val || 0)}
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="w-20 space-y-1">
                                                <Label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">% IVA</Label>
                                                <div className="flex items-center gap-1">
                                                    <Input
                                                        type="number"
                                                        className="h-8 text-xs px-1 bg-white"
                                                        value={manualIvaPercentage}
                                                        onChange={(e) => setManualIvaPercentage(Number(e.target.value))}
                                                    />
                                                    <span className="text-xs text-slate-400">%</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    Costo promedio inicial. Se actualizará con las compras.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="minStockLevel">Stock Mínimo</Label>
                                <Input
                                    id="minStockLevel"
                                    type="number"
                                    min="0"
                                    value={formData.minStockLevel}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, minStockLevel: Number(e.target.value) })}
                                    placeholder="0"
                                />
                                <p className="text-xs text-slate-500">
                                    Nivel de alerta para reabastecimiento.
                                </p>
                            </div>

                            {/* Calculator Helper */}
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                                    <Calculator className="h-4 w-4 text-indigo-600" />
                                    Calculadora de Costo Unitario
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="calc-price" className="text-xs text-slate-500">Precio de Referencia</Label>
                                        <CurrencyInput
                                            id="calc-price"
                                            placeholder="ej. 40.000"
                                            className="h-9 text-sm"
                                            onValueChange={(val) => setCalcPrice(val || 0)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="calc-qty" className="text-xs text-slate-500">Cantidad Total ({formData.unit})</Label>
                                        <Input
                                            id="calc-qty"
                                            type="number"
                                            placeholder="ej. 30"
                                            className="h-9 text-sm"
                                            value={calcQty}
                                            onChange={(e) => setCalcQty(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-xs text-slate-500">¿El precio ingresado es?</Label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setCalcMode('BASE')}
                                            className={`flex-1 py-2 px-3 text-xs rounded-lg border transition-all ${calcMode === 'BASE'
                                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                }`}
                                        >
                                            Antes de IVA (Neto)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCalcMode('TOTAL')}
                                            className={`flex-1 py-2 px-3 text-xs rounded-lg border transition-all ${calcMode === 'TOTAL'
                                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                }`}
                                        >
                                            Con IVA Incluido (Bruto)
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100">
                                    <Label htmlFor="calc-iva-rate" className="text-xs text-slate-600">% IVA</Label>
                                    <div className="flex items-center gap-1">
                                        <Input
                                            id="calc-iva-rate"
                                            type="number"
                                            className="h-7 w-16 text-xs px-2"
                                            value={calcTaxRate}
                                            onChange={(e) => setCalcTaxRate(Number(e.target.value))}
                                        />
                                        <span className="text-xs text-slate-400">%</span>
                                    </div>
                                </div>

                                {calcPrice > 0 && (
                                    <div className="pt-3 border-t border-slate-200 space-y-2">
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>Subtotal (Base):</span>
                                            <span className="font-medium text-slate-700">
                                                {formatCurrency(calcMode === 'TOTAL' ? calcPrice / (1 + (calcTaxRate / 100)) : calcPrice)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>IVA ({calcTaxRate}%):</span>
                                            <span className="font-medium text-slate-700">
                                                {formatCurrency(calcMode === 'TOTAL'
                                                    ? calcPrice - (calcPrice / (1 + (calcTaxRate / 100)))
                                                    : calcPrice * (calcTaxRate / 100)
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs font-semibold text-slate-900 pt-1 border-t border-dashed border-slate-200">
                                            <span>Total (IVA Incluido):</span>
                                            <span>
                                                {formatCurrency(calcMode === 'TOTAL' ? calcPrice : calcPrice * (1 + (calcTaxRate / 100)))}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <p className="text-[10px] text-slate-400 leading-tight">
                                    Nota: El sistema guardará el **Total** dividido por la **Cantidad** como costo estándar, para incluir los impuestos en el costo del material.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => navigate('/mrp/raw-materials')}
                    >
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={loading} className="min-w-[150px]">
                        {loading ? 'Guardando...' : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                {isEditing ? 'Actualizar Material' : 'Crear Material'}
                            </>
                        )}
                    </Button>
                </div>
            </form >
        </div >
    );
}
