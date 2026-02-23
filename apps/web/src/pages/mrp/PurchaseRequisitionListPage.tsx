import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PurchaseRequisitionStatus } from '@scaffold/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import { usePurchaseRequisitionsQuery, useUpdatePurchaseRequisitionStatusMutation } from '@/hooks/mrp/usePurchaseRequisitions';

const statusLabel: Record<PurchaseRequisitionStatus, string> = {
    [PurchaseRequisitionStatus.PENDIENTE]: 'Pendiente',
    [PurchaseRequisitionStatus.APROBADA]: 'Aprobada',
    [PurchaseRequisitionStatus.CONVERTIDA]: 'Convertida',
    [PurchaseRequisitionStatus.CANCELADA]: 'Cancelada',
};

export default function PurchaseRequisitionListPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [searchParams] = useSearchParams();
    const highlightedId = searchParams.get('highlight');
    const { data, loading } = usePurchaseRequisitionsQuery(1, 100);
    const { execute: updateStatus } = useUpdatePurchaseRequisitionStatusMutation();
    const rows = data?.data ?? [];

    const sortedRows = useMemo(
        () => [...rows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        [rows]
    );

    const quickApprove = async (id: string) => {
        try {
            await updateStatus({ id, status: PurchaseRequisitionStatus.APROBADA });
            toast({ title: 'Requisición aprobada' });
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo aprobar la requisición'), variant: 'destructive' });
        }
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Requisiciones de Compra</h1>
                    <p className="text-slate-600">Gestiona faltantes antes de generar órdenes de compra.</p>
                </div>
                <Button onClick={() => navigate('/mrp/purchase-requisitions/new')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva requisición
                </Button>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
                {loading ? (
                    <div className="text-sm text-slate-500">Cargando...</div>
                ) : sortedRows.length === 0 ? (
                    <div className="text-sm text-slate-500">Sin requisiciones registradas.</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Solicitante</TableHead>
                                <TableHead>OP</TableHead>
                                <TableHead>Ítems</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedRows.map((row) => (
                                <TableRow key={row.id} className={highlightedId === row.id ? 'bg-emerald-50/70' : ''}>
                                    <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
                                    <TableCell>{row.requestedBy}</TableCell>
                                    <TableCell>{row.productionOrderId ? `OP-${row.productionOrderId.slice(0, 8).toUpperCase()}` : 'N/A'}</TableCell>
                                    <TableCell>{row.items?.length || 0}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{statusLabel[row.status]}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        {row.status === PurchaseRequisitionStatus.PENDIENTE ? (
                                            <Button variant="outline" size="sm" onClick={() => quickApprove(row.id)}>
                                                Aprobar
                                            </Button>
                                        ) : null}
                                        {(row.status === PurchaseRequisitionStatus.PENDIENTE || row.status === PurchaseRequisitionStatus.APROBADA) ? (
                                            <Button
                                                size="sm"
                                                onClick={() => navigate(`/mrp/purchase-orders/new?requisitionId=${row.id}`)}
                                            >
                                                Crear OC
                                            </Button>
                                        ) : null}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    );
}
