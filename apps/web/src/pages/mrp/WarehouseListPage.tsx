import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Warehouse as WarehouseIcon, Plus, Edit2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { getErrorMessage } from '@/lib/api-error';
import { useDeleteWarehouseMutation, useWarehousesQuery } from '@/hooks/mrp/useWarehouses';

export default function WarehouseListPage() {
    const navigate = useNavigate();
    const { toast } = useToast();

    const { data: warehousesData, loading, error } = useWarehousesQuery();
    const warehouses = warehousesData ?? [];
    const { execute: deleteWarehouse } = useDeleteWarehouseMutation();

    useEffect(() => {
        if (!error) return;
        toast({
            title: 'Error',
            description: getErrorMessage(error, 'No se pudieron cargar los almacenes'),
            variant: 'destructive',
        });
    }, [error, toast]);

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

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Almacenes</h1>
                    <p className="text-slate-500 mt-1">Gestiona los centros de almacenamiento y distribución.</p>
                </div>
                <Button onClick={() => navigate('/mrp/warehouses/new')} className="shadow-lg shadow-primary/20">
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Almacén
                </Button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow>
                                <TableHead className="font-bold text-slate-900">Nombre</TableHead>
                                <TableHead className="font-bold text-slate-900">Ubicación</TableHead>
                                <TableHead className="font-bold text-slate-900">Tipo</TableHead>
                                <TableHead className="text-right font-bold text-slate-900">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {warehouses.map((warehouse) => (
                                <TableRow key={warehouse.id} className="group hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                                <WarehouseIcon className="h-4 w-4 text-slate-500" />
                                            </div>
                                            <span className="text-slate-900">{warehouse.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{warehouse.location || 'N/A'}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            {warehouse.type === 'raw_materials' ? 'Materias Primas' :
                                                warehouse.type === 'finished_goods' ? 'Productos Terminados' :
                                                    warehouse.type === 'quarantine' ? 'Cuarentena' : 'Otro'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => navigate(`/mrp/warehouses/${warehouse.id}/edit`)}
                                                className="h-8 w-8 p-0"
                                            >
                                                <Edit2 className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(warehouse.id)}
                                                className="h-8 w-8 p-0"
                                            >
                                                <Trash2 className="h-4 w-4 text-slate-400 group-hover:text-destructive transition-colors" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {warehouses.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-10 text-slate-500">
                                        No hay almacenes registrados.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    );
}
