import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mrpApi } from '@/services/mrpApi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Save } from 'lucide-react';
import { z } from 'zod';
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
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        unit: UnitType.UNIT,
        cost: 0,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            rawMaterialSchema.parse(formData);

            await mrpApi.createRawMaterial({
                ...formData,
                unit: formData.unit,
                cost: Number(formData.cost)
            });

            toast({
                title: 'Éxito',
                description: 'Material creado exitosamente',
            });
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
        <DashboardLayout>
            <div className="space-y-8 max-w-4xl mx-auto">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/mrp/raw-materials')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            Nuevo Material
                        </h1>
                        <p className="text-slate-500">
                            Registra nueva materia prima o insumo.
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
                                <Input
                                    id="sku"
                                    value={formData.sku}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, sku: e.target.value })}
                                    required
                                    placeholder="Ej. MAT-TEL-001"
                                />
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
                            <div className="space-y-2">
                                <Label htmlFor="cost">Costo Estándar</Label>
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
                                    Crear Material
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
