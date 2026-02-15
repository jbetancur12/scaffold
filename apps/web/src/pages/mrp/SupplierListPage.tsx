import { useCallback } from 'react';
import { mrpApi } from '@/services/mrpApi';
import { Supplier } from '@scaffold/types';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Truck, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import { useMrpQuery } from '@/hooks/useMrpQuery';
import { mrpQueryKeys } from '@/hooks/mrpQueryKeys';

export default function SupplierListPage() {
    const navigate = useNavigate();
    const { toast } = useToast();

    const fetchSuppliers = useCallback(async () => {
        try {
            const response = await mrpApi.getSuppliers();
            return response.suppliers;
        } catch (error) {
            toast({
                title: 'Error',
                description: getErrorMessage(error, 'No se pudieron cargar los proveedores'),
                variant: 'destructive',
            });
            throw error;
        }
    }, [toast]);

    const { data: suppliersData, loading } = useMrpQuery<Supplier[]>(fetchSuppliers, true, mrpQueryKeys.suppliers);
    const suppliers = suppliersData ?? [];

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Proveedores</h1>
                    <p className="text-slate-500 mt-1">Gestiona la lista de proveedores y sus contactos.</p>
                </div>
                <Button onClick={() => navigate('/mrp/suppliers/new')} className="shadow-lg shadow-primary/20">
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Proveedor
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
                                <TableHead className="font-bold text-slate-900">Contacto</TableHead>
                                <TableHead className="font-bold text-slate-900">Email</TableHead>
                                <TableHead className="text-right font-bold text-slate-900">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {suppliers.map((supplier) => (
                                <TableRow
                                    key={supplier.id}
                                    className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/mrp/suppliers/${supplier.id}`)}
                                >
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                                <Truck className="h-4 w-4 text-slate-500" />
                                            </div>
                                            <span className="text-slate-900">{supplier.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{supplier.contactName || '-'}</TableCell>
                                    <TableCell>{supplier.email || '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/mrp/suppliers/${supplier.id}/edit`);
                                                }}
                                                className="h-8 w-8 p-0"
                                            >
                                                {/* Reusing Edit2 icon from lucide-react if imported, or just text/icon */}
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {suppliers.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-10 text-slate-500">
                                        No hay proveedores registrados.
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
