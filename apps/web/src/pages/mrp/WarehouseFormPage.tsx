import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Save, Warehouse as WarehouseIcon, MapPin, Tag } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { WarehouseType } from '@scaffold/types';
import { WarehouseSchema } from '@scaffold/schemas';
import { getErrorMessage } from '@/lib/api-error';
import { useSaveWarehouseMutation, useWarehouseQuery } from '@/hooks/mrp/useWarehouses';
import { useMrpQueryErrorRedirect } from '@/hooks/mrp/useMrpQueryErrorRedirect';

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

    const { data: warehouse, loading: loadingWarehouse, error: warehouseError } = useWarehouseQuery(isEditing ? id : undefined);
    const { execute: saveWarehouse } = useSaveWarehouseMutation();

    useEffect(() => {
        if (warehouse) {
            setFormData({
                name: warehouse.name,
                location: warehouse.location || '',
                type: warehouse.type as WarehouseType,
            });
        }
    }, [warehouse]);

    useMrpQueryErrorRedirect(warehouseError, 'No se pudo cargar el almacén', '/mrp/warehouses');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            WarehouseSchema.parse(formData);

            if (isEditing && id) {
                await saveWarehouse({ id, payload: formData });
                toast({
                    title: 'Almacén actualizado',
                    description: 'Los cambios se han guardado correctamente.',
                });
            } else {
                await saveWarehouse({ payload: formData });
                toast({
                    title: 'Almacén creado',
                    description: 'El nuevo almacén se ha registrado exitosamente.',
                });
            }
            navigate('/mrp/warehouses');
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
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigate('/mrp/warehouses')}
                        className="rounded-full shadow-sm hover:bg-slate-100"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                                {isEditing ? 'Editar Almacén' : 'Nuevo Almacén'}
                            </h1>
                            {loadingWarehouse && isEditing && (
                                <span className="flex h-3 w-3 relative ml-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            {isEditing ? 'Actualiza la información y configuración de este almacén.' : 'Registra un nuevo centro de distribución físico o virtual.'}
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Main Content Area */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Section Header */}
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                            <WarehouseIcon className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-800">Detalles Generales</h2>
                            <p className="text-sm text-slate-500">Información básica y ubicación del almacén</p>
                        </div>
                    </div>

                    {/* Form Fields Grid */}
                    <div className="p-6 md:p-8 grid gap-8 md:grid-cols-2">
                        {/* Name Field */}
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="name" className="text-slate-700 font-medium flex items-center gap-2">
                                Nombre del Almacén <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="Ej. Centro de Distribución Norte"
                                className="h-11 shadow-sm focus-visible:ring-indigo-500"
                                autoFocus
                            />
                            <p className="text-[0.8rem] text-slate-500">Un nombre descriptivo que identifique claramente este lugar.</p>
                        </div>

                        {/* Location Field */}
                        <div className="space-y-2">
                            <Label htmlFor="location" className="text-slate-700 font-medium flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-slate-400" />
                                Ubicación o Dirección
                            </Label>
                            <Input
                                id="location"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                placeholder="Ej. Parque Industrial, Bodega 4"
                                className="h-11 shadow-sm focus-visible:ring-indigo-500"
                            />
                        </div>

                        {/* Type Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="type" className="text-slate-700 font-medium flex items-center gap-2">
                                <Tag className="h-4 w-4 text-slate-400" />
                                Uso Principal <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={formData.type}
                                onValueChange={(value) => setFormData({ ...formData, type: value as WarehouseType })}
                            >
                                <SelectTrigger className="h-11 shadow-sm focus:ring-indigo-500">
                                    <SelectValue placeholder="Seleccionar propóstio" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={WarehouseType.RAW_MATERIALS}>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-amber-700">Materias Primas</span>
                                            <span className="text-xs text-slate-500">Componentes e insumos base</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value={WarehouseType.FINISHED_GOODS}>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-emerald-700">Productos Terminados</span>
                                            <span className="text-xs text-slate-500">Bienes listos para la venta</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value={WarehouseType.QUARANTINE}>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-red-700">Cuarentena & Retenciones</span>
                                            <span className="text-xs text-slate-500">Artículos en inspección de calidad</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value={WarehouseType.OTHER}>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-700">Otro / General</span>
                                            <span className="text-xs text-slate-500">Uso mixto temporal</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Sticky Action Footer */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => navigate('/mrp/warehouses')}
                        className="h-11 px-6 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    >
                        Descartar
                    </Button>
                    <Button
                        type="submit"
                        disabled={loading || !formData.name}
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
                                {isEditing ? 'Guardar Cambios' : 'Crear Almacén'}
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
