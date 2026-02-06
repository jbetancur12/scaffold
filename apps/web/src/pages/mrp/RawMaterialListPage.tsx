import { useState, useEffect, useCallback } from 'react';
import { mrpApi } from '@/services/mrpApi';
import { RawMaterial } from '@scaffold/types';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Database, Plus, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

export default function RawMaterialListPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [materials, setMaterials] = useState<RawMaterial[]>([]);
    const [loading, setLoading] = useState(true);

    const loadMaterials = useCallback(async () => {
        try {
            setLoading(true);
            const response = await mrpApi.getRawMaterials();
            setMaterials(response.materials);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'No se pudo cargar la materia prima',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadMaterials();
    }, [loadMaterials]);

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Materia Prima</h1>
                        <p className="text-slate-500 mt-1">Gestiona el inventario de materiales e insumos.</p>
                    </div>
                    <Button onClick={() => navigate('/dashboard/mrp/raw-materials/new')} className="shadow-lg shadow-primary/20">
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Material
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
                                    <TableHead className="font-bold text-slate-900">SKU</TableHead>
                                    <TableHead className="font-bold text-slate-900">Unidad</TableHead>
                                    <TableHead className="font-bold text-slate-900">Costo Ref. (Anual)</TableHead>
                                    <TableHead className="font-bold text-slate-900">Costo Promedio</TableHead>
                                    <TableHead className="font-bold text-slate-900">Última Compra</TableHead>
                                    <TableHead className="text-right font-bold text-slate-900">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {materials.map((material) => (
                                    <TableRow key={material.id} className="group hover:bg-slate-50/50 transition-colors">
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                                    <Database className="h-4 w-4 text-slate-500" />
                                                </div>
                                                <span className="text-slate-900">{material.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{material.sku}</TableCell>
                                        <TableCell>{material.unit}</TableCell>
                                        <TableCell className="font-semibold text-slate-600">${material.cost?.toFixed(2) || '0.00'}</TableCell>
                                        <TableCell className="font-bold text-primary">${material.averageCost && material.averageCost > 0 ? material.averageCost.toFixed(2) : '0.00'}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-xs">
                                                <span className="font-medium text-slate-900">${material.lastPurchasePrice?.toFixed(2) || '-'}</span>
                                                <span className="text-slate-500">
                                                    {material.lastPurchaseDate ? new Date(material.lastPurchaseDate).toLocaleDateString() : 'N/A'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => navigate(`/dashboard/mrp/raw-materials/${material.id}`)}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <Edit2 className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {materials.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-10 text-slate-500">
                                            No hay materiales registrados.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
