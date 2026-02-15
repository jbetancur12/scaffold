import { useState, useEffect, useCallback } from 'react';
import { mrpApi } from '@/services/mrpApi';
import { RawMaterial } from '@scaffold/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Database, Plus, Edit2, Search, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api-error';
import { useMrpQuery } from '@/hooks/useMrpQuery';

export default function RawMaterialListPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [materials, setMaterials] = useState<RawMaterial[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 10;

    const fetchMaterials = useCallback(async () => {
        try {
            return await mrpApi.getRawMaterials(page, limit, search);
        } catch (error) {
            toast({
                title: 'Error',
                description: getErrorMessage(error, 'No se pudo cargar la materia prima'),
                variant: 'destructive',
            });
            throw error;
        }
    }, [page, search, toast]);

    const { execute, data, loading: queryLoading } = useMrpQuery(fetchMaterials, false);

    useEffect(() => {
        const timer = setTimeout(() => {
            void execute();
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [execute]);

    useEffect(() => {
        setLoading(queryLoading);
        setMaterials(data?.materials || []);
        setTotal(data?.total || 0);
    }, [data, queryLoading]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Materia Prima</h1>
                    <p className="text-slate-500 mt-1">Gestiona el inventario de materiales e insumos.</p>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar material..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1); // Reset to page 1 on search
                            }}
                            className="pl-8 w-[200px] lg:w-[300px]"
                        />
                    </div>
                    <Button onClick={() => navigate('/mrp/raw-materials/new')} className="shadow-lg shadow-primary/20">
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Material
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                ) : (
                    <>
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
                                    <TableRow
                                        key={material.id}
                                        className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/mrp/raw-materials/${material.id}`)}
                                    >
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
                                        <TableCell className="font-semibold text-slate-600">{formatCurrency(material.cost)}</TableCell>
                                        <TableCell className="font-bold text-primary">{formatCurrency(material.averageCost)}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-xs">
                                                <span className="font-medium text-slate-900">{formatCurrency(material.lastPurchasePrice)}</span>
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
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate('/mrp/raw-materials/new', {
                                                            state: {
                                                                initialData: {
                                                                    ...material,
                                                                    name: `${material.name} (Copia)`,
                                                                    sku: '', // Reset SKU to force regeneration or manual entry
                                                                    id: undefined, // Ensure it's treated as new
                                                                    createdAt: undefined,
                                                                    updatedAt: undefined
                                                                }
                                                            }
                                                        });
                                                    }}
                                                    title="Duplicar Material"
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <Copy className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/mrp/raw-materials/${material.id}/edit`);
                                                    }}
                                                    title="Editar Material"
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
                                        <TableCell colSpan={7} className="text-center py-10 text-slate-500">
                                            No hay materiales registrados.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        <div className="flex items-center justify-end space-x-2 p-4 border-t border-slate-100">
                            <div className="flex-1 text-sm text-muted-foreground">
                                Página {page} de {Math.max(1, Math.ceil(total / limit))} ({total} registros)
                            </div>
                            <div className="space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Anterior
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => p + 1)}
                                    disabled={page >= Math.ceil(total / limit)}
                                >
                                    Siguiente
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
