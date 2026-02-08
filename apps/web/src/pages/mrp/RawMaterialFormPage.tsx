import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { mrpApi } from '@/services/mrpApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Save, RefreshCw, Calculator } from 'lucide-react';
import { z } from 'zod';
import { generateRawMaterialSku } from '@/utils/skuGenerator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { UnitType } from '@scaffold/types';



const rawMaterialSchema = z.object({
    name: z.string().min(1, 'El nombre es requerido'),
    sku: z.string().min(1, 'El SKU es requerido'),
    unit: z.nativeEnum(UnitType),
    cost: z.coerce.number().min(0, 'El costo debe ser mayor o igual a 0'),
});

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
    });

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
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'No se pudo cargar el material',
                variant: 'destructive',
            });
            navigate('/dashboard/mrp/raw-materials');
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
                });
                if (state.initialData.sku) {
                    setSkuManuallyEdited(true); // Treat as manually edited if we passed a SKU (though list page clears it usually)
                }
            }
        }
    }, [isEditing, loadMaterial, location]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            rawMaterialSchema.parse(formData);

            if (isEditing) {
                await mrpApi.updateRawMaterial(id!, {
                    ...formData,
                    cost: Number(formData.cost)
                });
                toast({
                    title: 'Éxito',
                    description: 'Material actualizado exitosamente',
                });
            } else {
                await mrpApi.createRawMaterial({
                    ...formData,
                    cost: Number(formData.cost)
                });
                toast({
                    title: 'Éxito',
                    description: 'Material creado exitosamente',
                });
            }
            navigate('/dashboard/mrp/raw-materials');
        } catch (error: unknown) {
            let message = 'Error al guardar';
            if (error instanceof z.ZodError) {
                message = error.errors[0].message;
            }
            toast({
                title: 'Error',
                description: message,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/mrp/raw-materials')}>
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
                                <Input
                                    id="cost"
                                    type="number"
                                    step="0.01"
                                    value={formData.cost}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, cost: Number(e.target.value) })}
                                    required
                                />
                                <p className="text-xs text-slate-500">
                                    Costo promedio inicial. Se actualizará con las compras.
                                </p>
                            </div>

                            {/* Calculator Helper */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                    <Calculator className="h-4 w-4" />
                                    Calculadora de Costo Unitario
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label htmlFor="calc-price" className="text-xs text-slate-500">Precio Total Compra</Label>
                                        <Input
                                            id="calc-price"
                                            type="number"
                                            placeholder="ej. 40000"
                                            className="h-8 text-sm"
                                            onChange={(e) => {
                                                const price = Number(e.target.value);
                                                const qty = Number((document.getElementById('calc-qty') as HTMLInputElement)?.value || 0);
                                                if (price > 0 && qty > 0) {
                                                    setFormData(prev => ({ ...prev, cost: Number((price / qty).toFixed(2)) }));
                                                }
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="calc-qty" className="text-xs text-slate-500">Cantidad Total ({formData.unit})</Label>
                                        <Input
                                            id="calc-qty"
                                            type="number"
                                            placeholder="ej. 30"
                                            className="h-8 text-sm"
                                            onChange={(e) => {
                                                const qty = Number(e.target.value);
                                                const price = Number((document.getElementById('calc-price') as HTMLInputElement)?.value || 0);
                                                if (price > 0 && qty > 0) {
                                                    setFormData(prev => ({ ...prev, cost: Number((price / qty).toFixed(2)) }));
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400">
                                    Ingresa el precio total y la cantidad comprada para calcular automáticamente el costo unitario.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => navigate('/dashboard/mrp/raw-materials')}
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
