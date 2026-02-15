import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { mrpApi } from '@/services/mrpApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Save } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { WarehouseType } from '@scaffold/types';
import { WarehouseSchema } from '@scaffold/schemas';
import { ZodError } from 'zod';

export default function WarehouseFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const isEditing = !!id;

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        type: WarehouseType.RAW_MATERIALS,
    });

    const loadWarehouse = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            const warehouse = await mrpApi.getWarehouse(id);
            setFormData({
                name: warehouse.name,
                location: warehouse.location || '',
                type: warehouse.type as WarehouseType,
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'No se pudo cargar el almacén',
                variant: 'destructive',
            });
            navigate('/mrp/warehouses');
        } finally {
            setLoading(false);
        }
    }, [id, navigate, toast]);

    useEffect(() => {
        if (isEditing) {
            loadWarehouse();
        }
    }, [isEditing, loadWarehouse]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            WarehouseSchema.parse(formData);

            if (isEditing) {
                await mrpApi.updateWarehouse(id!, formData);
                toast({
                    title: 'Éxito',
                    description: 'Almacén actualizado correctamente',
                });
            } else {
                await mrpApi.createWarehouse(formData);
                toast({
                    title: 'Éxito',
                    description: 'Almacén creado correctamente',
                });
            }
            navigate('/mrp/warehouses');
        } catch (error: unknown) {
            let message = 'Error al guardar';
            if (error instanceof ZodError) {
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
        <div className="space-y-8 max-w-2xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/mrp/warehouses')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        {isEditing ? 'Editar Almacén' : 'Nuevo Almacén'}
                    </h1>
                    <p className="text-slate-500">
                        {isEditing ? 'Modifica los detalles del almacén.' : 'Registra un nuevo centro de almacenamiento.'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre del Almacén</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            placeholder="Ej. Almacén Central"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="location">Ubicación / Dirección</Label>
                        <Input
                            id="location"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            placeholder="Ej. Planta Norte, Calle 123"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="type">Tipo de Almacén</Label>
                        <Select
                            value={formData.type}
                            onValueChange={(value) => setFormData({ ...formData, type: value as WarehouseType })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={WarehouseType.RAW_MATERIALS}>Materias Primas</SelectItem>
                                <SelectItem value={WarehouseType.FINISHED_GOODS}>Productos Terminados</SelectItem>
                                <SelectItem value={WarehouseType.QUARANTINE}>Cuarentena</SelectItem>
                                <SelectItem value={WarehouseType.OTHER}>Otro</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => navigate('/mrp/warehouses')}
                    >
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={loading} className="min-w-[150px]">
                        {loading ? 'Guardando...' : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                {isEditing ? 'Actualizar Almacén' : 'Crear Almacén'}
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
