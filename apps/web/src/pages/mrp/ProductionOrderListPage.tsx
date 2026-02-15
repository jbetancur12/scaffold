import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { mrpApi } from '@/services/mrpApi';
import { ProductionOrder, ProductionOrderStatus } from '@scaffold/types';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Plus, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';

export default function ProductionOrderListPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [orders, setOrders] = useState<ProductionOrder[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await mrpApi.getProductionOrders();
            setOrders(data.orders);
        } catch (error) {
            toast({
                title: 'Error',
                description: getErrorMessage(error, 'No se pudieron cargar las órdenes de producción'),
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const getStatusColor = (status: ProductionOrderStatus) => {
        switch (status) {
            case ProductionOrderStatus.DRAFT: return 'text-slate-500 bg-slate-100';
            case ProductionOrderStatus.PLANNED: return 'text-blue-600 bg-blue-50';
            case ProductionOrderStatus.IN_PROGRESS: return 'text-amber-600 bg-amber-50';
            case ProductionOrderStatus.COMPLETED: return 'text-green-600 bg-green-50';
            case ProductionOrderStatus.CANCELLED: return 'text-red-600 bg-red-50';
            default: return 'text-slate-500 bg-slate-100';
        }
    };

    const getStatusLabel = (status: ProductionOrderStatus) => {
        switch (status) {
            case ProductionOrderStatus.DRAFT: return 'Borrador';
            case ProductionOrderStatus.PLANNED: return 'Planificada';
            case ProductionOrderStatus.IN_PROGRESS: return 'En Progreso';
            case ProductionOrderStatus.COMPLETED: return 'Completada';
            case ProductionOrderStatus.CANCELLED: return 'Cancelada';
            default: return status;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Órdenes de Producción
                    </h1>
                    <p className="text-slate-500">
                        Gestiona y monitorea las órdenes de producción.
                    </p>
                </div>
                <Button onClick={() => navigate('/mrp/production-orders/new')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Orden
                </Button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Fecha Inicio</TableHead>
                            <TableHead>Fecha Fin</TableHead>
                            <TableHead>Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8">
                                    Cargando...
                                </TableCell>
                            </TableRow>
                        ) : orders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                    No hay órdenes de producción registradas.
                                </TableCell>
                            </TableRow>
                        ) : (
                            orders.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-medium">{order.code}</TableCell>
                                    <TableCell>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                            {getStatusLabel(order.status)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {order.startDate ? format(new Date(order.startDate), 'dd/MM/yyyy') : '-'}
                                    </TableCell>
                                    <TableCell>
                                        {order.endDate ? format(new Date(order.endDate), 'dd/MM/yyyy') : '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => navigate(`/mrp/production-orders/${order.id}`)}>
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
