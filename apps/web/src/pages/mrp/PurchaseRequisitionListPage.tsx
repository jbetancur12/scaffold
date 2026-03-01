import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, ClipboardList, Clock, CheckCircle2, ArrowRightLeft, XCircle, ShoppingCart } from 'lucide-react';
import { PurchaseRequisitionStatus } from '@scaffold/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import { usePurchaseRequisitionsQuery, useUpdatePurchaseRequisitionStatusMutation } from '@/hooks/mrp/usePurchaseRequisitions';

const statusConfig: Record<PurchaseRequisitionStatus, { label: string; classes: string; icon: React.ReactNode }> = {
    [PurchaseRequisitionStatus.PENDIENTE]: {
        label: 'Pendiente',
        classes: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20',
        icon: <Clock className="h-3 w-3 mr-1" />,
    },
    [PurchaseRequisitionStatus.APROBADA]: {
        label: 'Aprobada',
        classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20',
        icon: <CheckCircle2 className="h-3 w-3 mr-1" />,
    },
    [PurchaseRequisitionStatus.CONVERTIDA]: {
        label: 'Convertida',
        classes: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/20',
        icon: <ArrowRightLeft className="h-3 w-3 mr-1" />,
    },
    [PurchaseRequisitionStatus.CANCELADA]: {
        label: 'Cancelada',
        classes: 'bg-slate-50 text-slate-500 border-slate-200 ring-slate-500/10',
        icon: <XCircle className="h-3 w-3 mr-1" />,
    },
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

    const kpi = useMemo(() => ({
        total: sortedRows.length,
        pendiente: sortedRows.filter(r => r.status === PurchaseRequisitionStatus.PENDIENTE).length,
        aprobada: sortedRows.filter(r => r.status === PurchaseRequisitionStatus.APROBADA).length,
        convertida: sortedRows.filter(r => r.status === PurchaseRequisitionStatus.CONVERTIDA).length,
    }), [sortedRows]);

    const quickApprove = async (id: string) => {
        try {
            await updateStatus({ id, status: PurchaseRequisitionStatus.APROBADA });
            toast({ title: 'Requisición aprobada' });
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo aprobar la requisición'), variant: 'destructive' });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/20 to-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Hero Header */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-6 md:p-8 relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-50/40 to-transparent pointer-events-none" />
                        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-orange-50 rounded-2xl ring-1 ring-orange-100 shadow-sm shrink-0">
                                    <ClipboardList className="h-7 w-7 text-orange-600" />
                                </div>
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-none">
                                        Requisiciones de Compra
                                    </h1>
                                    <p className="text-slate-500 mt-1.5 text-sm md:text-base">
                                        Gestiona faltantes de materiales antes de generar órdenes de compra.
                                    </p>
                                </div>
                            </div>
                            <Button
                                onClick={() => navigate('/mrp/purchase-requisitions/new')}
                                className="shrink-0 bg-orange-600 hover:bg-orange-700 text-white shadow-sm shadow-orange-200 font-medium rounded-xl h-11 px-6 transition-all"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Nueva Requisición
                            </Button>
                        </div>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-slate-100 rounded-lg">
                                <ClipboardList className="h-4 w-4 text-slate-600" />
                            </div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900">{kpi.total}</div>
                    </div>
                    <div className="bg-white border border-amber-100 p-4 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-amber-50 rounded-lg">
                                <Clock className="h-4 w-4 text-amber-600" />
                            </div>
                            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Pendiente</span>
                        </div>
                        <div className="text-2xl font-bold text-amber-700">{kpi.pendiente}</div>
                    </div>
                    <div className="bg-white border border-emerald-100 p-4 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-emerald-50 rounded-lg">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            </div>
                            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Aprobadas</span>
                        </div>
                        <div className="text-2xl font-bold text-emerald-700">{kpi.aprobada}</div>
                    </div>
                    <div className="bg-white border border-blue-100 p-4 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-blue-50 rounded-lg">
                                <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                            </div>
                            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Convertidas</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-700">{kpi.convertida}</div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <div className="animate-spin mb-4 h-8 w-8 border-4 border-slate-200 border-t-orange-600 rounded-full" />
                            <p className="font-medium animate-pulse">Cargando requisiciones...</p>
                        </div>
                    ) : sortedRows.length === 0 ? (
                        <div className="py-20 px-6 text-center">
                            <div className="bg-slate-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-slate-50/50">
                                <ClipboardList className="h-8 w-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">Sin requisiciones</h3>
                            <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
                                No hay requisiciones de compra registradas. Crea la primera para gestionar faltantes.
                            </p>
                            <Button
                                onClick={() => navigate('/mrp/purchase-requisitions/new')}
                                variant="outline"
                                className="rounded-xl border-orange-200 text-orange-700 hover:bg-orange-50"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Nueva Requisición
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/80 border-b border-slate-100 hover:bg-slate-50/80">
                                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider py-3.5 pl-6">Fecha</TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider py-3.5">Solicitante</TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider py-3.5">OP Asociada</TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider py-3.5 text-center">Ítems</TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider py-3.5">Estado</TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider py-3.5 pr-6 text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedRows.map((row) => {
                                    const cfg = statusConfig[row.status];
                                    return (
                                        <TableRow
                                            key={row.id}
                                            className={`border-b border-slate-50 hover:bg-slate-50/60 transition-colors ${highlightedId === row.id ? 'bg-emerald-50/60 hover:bg-emerald-50/80' : ''
                                                }`}
                                        >
                                            <TableCell className="pl-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                                                {new Date(row.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' })}
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <span className="font-semibold text-slate-800 text-sm">{row.requestedBy}</span>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                {row.productionOrderId ? (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-mono font-semibold">
                                                        OP-{row.productionOrderId.slice(0, 8).toUpperCase()}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-sm italic">Manual</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-4 text-center">
                                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                                                    {row.items?.length || 0}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <Badge variant="outline" className={`inline-flex items-center font-semibold ring-1 ring-inset ${cfg.classes}`}>
                                                    {cfg.icon}
                                                    {cfg.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-4 pr-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {row.status === PurchaseRequisitionStatus.PENDIENTE && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => quickApprove(row.id)}
                                                            className="rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs h-8 px-3"
                                                        >
                                                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                                            Aprobar
                                                        </Button>
                                                    )}
                                                    {(row.status === PurchaseRequisitionStatus.PENDIENTE || row.status === PurchaseRequisitionStatus.APROBADA) && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => navigate(`/mrp/purchase-orders/new?requisitionId=${row.id}`)}
                                                            className="rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs h-8 px-3"
                                                        >
                                                            <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                                                            Crear OC
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </div>
        </div>
    );
}
