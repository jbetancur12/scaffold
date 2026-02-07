import { useState, useEffect, useCallback } from 'react';
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

export default function SupplierListPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);

    const loadSuppliers = useCallback(async () => {
        try {
            setLoading(true);
            const response = await mrpApi.getSuppliers();
            setSuppliers(response.suppliers);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'No se pudieron cargar los proveedores',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadSuppliers();
    }, [loadSuppliers]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Proveedores</h1>
                    <p className="text-slate-500 mt-1">Gestiona la lista de proveedores y sus contactos.</p>
                </div>
                <Button onClick={() => navigate('/dashboard/mrp/suppliers/new')} className="shadow-lg shadow-primary/20">
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
                                <TableRow key={supplier.id} className="group hover:bg-slate-50/50 transition-colors">
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
                                        {/* Action buttons */}
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
