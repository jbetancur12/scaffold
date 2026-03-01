import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Warehouse as WarehouseIcon, Plus, Edit2, Trash2, ShieldAlert, Package, Layers, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { getErrorMessage } from '@/lib/api-error';
import { useDeleteWarehouseMutation, useWarehousesQuery } from '@/hooks/mrp/useWarehouses';
import { useMrpQueryErrorToast } from '@/hooks/mrp/useMrpQueryErrorToast';
import { WarehouseType } from '@scaffold/types';

export default function WarehouseListPage() {
    const navigate = useNavigate();
    const { toast } = useToast();

    const { data: warehousesData, loading, error } = useWarehousesQuery();
    const warehouses = warehousesData ?? [];
    const { execute: deleteWarehouse } = useDeleteWarehouseMutation();

    useMrpQueryErrorToast(error, 'No se pudieron cargar los almacenes');

    const kpis = useMemo(() => {
        let rawMaterials = 0;
        let finishedGoods = 0;
        let quarantine = 0;

        warehouses.forEach(w => {
            if (w.type === 'raw_materials') rawMaterials++;
            else if (w.type === 'finished_goods') finishedGoods++;
            else if (w.type === 'quarantine') quarantine++;
        });

        return {
            total: warehouses.length,
            rawMaterials,
            finishedGoods,
            quarantine
        };
    }, [warehouses]);

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este almacén?')) return;
        try {
            await deleteWarehouse(id);
            toast({
                title: 'Almacén eliminado',
                description: 'El almacén ha sido eliminado correctamente.',
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: getErrorMessage(error, 'No se pudo eliminar el almacén.'),
                variant: 'destructive',
            });
        }
    };

    const getTypeDetails = (type: string | WarehouseType) => {
        switch (type) {
            case 'raw_materials':
                return {
                    label: 'Materias Primas',
                    classes: 'bg-amber-50 text-amber-700 ring-amber-600/10',
                    iconClasses: 'bg-amber-50 text-amber-600',
                    Icon: Package
                };
            case 'finished_goods':
                return {
                    label: 'Prod. Terminados',
                    classes: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
                    iconClasses: 'bg-emerald-50 text-emerald-600',
                    Icon: Layers
                };
            case 'quarantine':
                return {
                    label: 'Cuarentena',
                    classes: 'bg-red-50 text-red-700 ring-red-600/10',
                    iconClasses: 'bg-red-50 text-red-600',
                    Icon: ShieldAlert
                };
            default:
                return {
                    label: 'Otro',
                    classes: 'bg-slate-50 text-slate-700 ring-slate-600/10',
                    iconClasses: 'bg-slate-100 text-slate-500',
                    Icon: WarehouseIcon
                };
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
            {/* Hero Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-2">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl ring-1 ring-indigo-100 hidden sm:block">
                        <WarehouseIcon className="h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-1">
                            Almacenes
                        </h1>
                        <p className="text-sm text-slate-500">
                            Gestiona centros de almacenamiento, ubicaciones y tipos de inventario.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <Button
                        onClick={() => navigate('/mrp/warehouses/new')}
                        className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Almacén
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                            <WarehouseIcon className="h-5 w-5" />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total</h3>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 mt-1">{kpis.total}</div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                            <Package className="h-5 w-5" />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Materia Prima</h3>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 mt-1">{kpis.rawMaterials}</div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                            <Layers className="h-5 w-5" />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Terminados</h3>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 mt-1">{kpis.finishedGoods}</div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                            <ShieldAlert className="h-5 w-5" />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Cuarentena</h3>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 mt-1">{kpis.quarantine}</div>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6">
                <div className="p-4 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800">Directorio de Almacenes</h2>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-medium">
                        {kpis.total} registros
                    </Badge>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50/80">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-[35%] py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</TableHead>
                                    <TableHead className="w-[25%] py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</TableHead>
                                    <TableHead className="w-[25%] py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ubicación</TableHead>
                                    <TableHead className="w-[15%] py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {warehouses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-[400px]">
                                            <div className="flex flex-col items-center justify-center text-center h-full space-y-4">
                                                <div className="p-6 bg-slate-50 rounded-full ring-8 ring-slate-50/50">
                                                    <WarehouseIcon className="h-10 w-10 text-slate-300" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-lg font-medium text-slate-900">
                                                        No hay almacenes registrados
                                                    </p>
                                                    <p className="text-sm text-slate-500 max-w-sm mx-auto">
                                                        Crea tu primer almacén para empezar a gestionar inventarios y ubicaciones físicas de tus productos.
                                                    </p>
                                                </div>
                                                <Button
                                                    onClick={() => navigate('/mrp/warehouses/new')}
                                                    variant="outline"
                                                    className="mt-4 border-dashed border-2 bg-slate-50 hover:bg-slate-100 text-slate-600"
                                                >
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Crear Almacén
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    warehouses.map((warehouse) => {
                                        const typeDetails = getTypeDetails(warehouse.type);
                                        const TypeIcon = typeDetails.Icon;

                                        return (
                                            <TableRow key={warehouse.id} className="group hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg shrink-0 ${typeDetails.iconClasses}`}>
                                                            <TypeIcon className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-slate-900 line-clamp-1">
                                                                {warehouse.name}
                                                            </div>
                                                            {(warehouse as any).description && (
                                                                <div className="text-xs text-slate-500 mt-0.5 max-w-[200px] sm:max-w-xs truncate">
                                                                    {(warehouse as any).description}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ring-1 ring-inset ${typeDetails.classes}`}>
                                                        {typeDetails.label}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    {warehouse.location ? (
                                                        <div className="flex items-center text-sm text-slate-600 gap-1.5">
                                                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                                            <span className="truncate max-w-[150px]">{warehouse.location}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-slate-400 italic">No especificada</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-4 text-right">
                                                    <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => navigate(`/mrp/warehouses/${warehouse.id}/edit`)}
                                                            className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                            title="Editar"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(warehouse.id)}
                                                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </div>
    );
}
