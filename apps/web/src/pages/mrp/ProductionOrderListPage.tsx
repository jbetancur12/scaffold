import { useNavigate } from 'react-router-dom';
import { DocumentCategory, OperationalConfig, ProductionOrderStatus } from '@scaffold/types';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Plus, Eye, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { useProductionOrdersQuery } from '@/hooks/mrp/useProductionOrders';
import { useMrpQueryErrorToast } from '@/hooks/mrp/useMrpQueryErrorToast';
import { useControlledDocumentsQuery } from '@/hooks/mrp/useQuality';
import { useOperationalConfigQuery, useSaveOperationalConfigMutation } from '@/hooks/mrp/useOperationalConfig';
import { useState } from 'react';
import { getErrorMessage } from '@/lib/api-error';
import { useToast } from '@/components/ui/use-toast';

export default function ProductionOrderListPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [showPackagingSettings, setShowPackagingSettings] = useState(false);

    const { data: ordersResponse, loading, error } = useProductionOrdersQuery();
    const { data: operationalConfig } = useOperationalConfigQuery();
    const { execute: saveOperationalConfig, loading: savingConfig } = useSaveOperationalConfigMutation();
    const { data: packagingDocs } = useControlledDocumentsQuery({
        documentCategory: DocumentCategory.FOR,
    });
    const [selectedPackagingDocCode, setSelectedPackagingDocCode] = useState<string>('');
    const orders = ordersResponse?.orders ?? [];

    useMrpQueryErrorToast(error, 'No se pudieron cargar las órdenes de producción');

    const packagingOptions = packagingDocs ?? [];
    const currentConfigured = selectedPackagingDocCode || operationalConfig?.defaultPackagingControlledDocumentCode || '';

    const handleSavePackagingConfig = async () => {
        if (!operationalConfig) return;
        try {
            const payload: Partial<OperationalConfig> = {
                ...operationalConfig,
                defaultPurchaseOrderControlledDocumentId: operationalConfig.defaultPurchaseOrderControlledDocumentId || undefined,
                defaultPurchaseOrderControlledDocumentCode: operationalConfig.defaultPurchaseOrderControlledDocumentCode || undefined,
                defaultIncomingInspectionControlledDocumentCode: operationalConfig.defaultIncomingInspectionControlledDocumentCode || undefined,
                defaultPackagingControlledDocumentCode: currentConfigured || undefined,
            };
            await saveOperationalConfig(payload);
            toast({ title: 'Configuración guardada', description: 'Formato global de empaque actualizado.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo guardar la configuración de empaque'), variant: 'destructive' });
        }
    };

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
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setShowPackagingSettings((prev) => !prev)}>
                        <Settings className="mr-2 h-4 w-4" />
                        Formato empaque
                    </Button>
                    <Button onClick={() => navigate('/mrp/production-orders/new')}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nueva Orden
                    </Button>
                </div>
            </div>

            {showPackagingSettings ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                    <div className="text-sm text-slate-600">
                        Selecciona el documento global de control para empaque. Este código FOR se aplicará por defecto a todos los registros de empaque.
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                        <select
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                            value={currentConfigured}
                            onChange={(e) => setSelectedPackagingDocCode(e.target.value)}
                        >
                            <option value="">Selecciona formato de empaque...</option>
                            {packagingOptions.map((doc) => (
                                <option key={doc.id} value={doc.code}>
                                    {doc.code} v{doc.version} - {doc.title} ({doc.status})
                                </option>
                            ))}
                        </select>
                        <Button onClick={handleSavePackagingConfig} disabled={savingConfig}>
                            {savingConfig ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </div>
                    {!currentConfigured ? (
                        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                            Debes configurar este formato para poder diligenciar y cerrar empaque en lotes.
                        </div>
                    ) : null}
                </div>
            ) : null}

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
