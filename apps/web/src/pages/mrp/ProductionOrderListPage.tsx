import { useNavigate } from 'react-router-dom';
import { DocumentCategory, DocumentStatus, OperationalConfig, ProductionOrderStatus } from '@scaffold/types';
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
        status: DocumentStatus.APROBADO,
    });
    const [selectedPackagingDocCode, setSelectedPackagingDocCode] = useState<string>('');
    const [selectedLabelingDocCode, setSelectedLabelingDocCode] = useState<string>('');
    const [selectedBatchReleaseDocCode, setSelectedBatchReleaseDocCode] = useState<string>('');
    const orders = ordersResponse?.orders ?? [];

    useMrpQueryErrorToast(error, 'No se pudieron cargar las órdenes de producción');

    const packagingOptions = packagingDocs ?? [];
    const currentPackagingConfigured = selectedPackagingDocCode || operationalConfig?.defaultPackagingControlledDocumentCode || '';
    const currentLabelingConfigured = selectedLabelingDocCode || operationalConfig?.defaultLabelingControlledDocumentCode || '';
    const currentBatchReleaseConfigured = selectedBatchReleaseDocCode || operationalConfig?.defaultBatchReleaseControlledDocumentCode || '';
    const currentOperationMode: 'lote' | 'serial' = 'lote';

    const handleSavePackagingConfig = async () => {
        if (!operationalConfig) return;
        try {
            const payload: Partial<OperationalConfig> = {
                ...operationalConfig,
                defaultPurchaseOrderControlledDocumentId: operationalConfig.defaultPurchaseOrderControlledDocumentId || undefined,
                defaultPurchaseOrderControlledDocumentCode: operationalConfig.defaultPurchaseOrderControlledDocumentCode || undefined,
                defaultIncomingInspectionControlledDocumentCode: operationalConfig.defaultIncomingInspectionControlledDocumentCode || undefined,
                defaultPackagingControlledDocumentCode: currentPackagingConfigured || undefined,
                defaultLabelingControlledDocumentCode: currentLabelingConfigured || undefined,
                defaultBatchReleaseControlledDocumentCode: currentBatchReleaseConfigured || undefined,
                operationMode: 'lote',
            };
            await saveOperationalConfig(payload);
            toast({ title: 'Configuración guardada', description: 'Formatos globales de lote actualizados.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo guardar la configuración global'), variant: 'destructive' });
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
                        Configura los documentos globales (FOR) para el flujo de lote: empaque, etiquetado y liberación QA.
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        <label className="text-sm font-medium">Modo de trazabilidad de producción</label>
                        <select
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                            value={currentOperationMode}
                            disabled
                        >
                            <option value="lote">Lote (fijo)</option>
                        </select>
                        <label className="text-sm font-medium">Formato global de Empaque</label>
                        <select
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                            value={currentPackagingConfigured}
                            onChange={(e) => setSelectedPackagingDocCode(e.target.value)}
                        >
                            <option value="">Selecciona formato de empaque...</option>
                            {packagingOptions.map((doc) => (
                                <option key={doc.id} value={doc.code}>
                                    {doc.code} v{doc.version} - {doc.title} ({doc.status})
                                </option>
                            ))}
                        </select>
                        <label className="text-sm font-medium">Formato global de Etiquetado</label>
                        <select
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                            value={currentLabelingConfigured}
                            onChange={(e) => setSelectedLabelingDocCode(e.target.value)}
                        >
                            <option value="">Selecciona formato de etiquetado...</option>
                            {packagingOptions.map((doc) => (
                                <option key={`${doc.id}-lbl`} value={doc.code}>
                                    {doc.code} v{doc.version} - {doc.title} ({doc.status})
                                </option>
                            ))}
                        </select>
                        <label className="text-sm font-medium">Formato global de Liberación QA</label>
                        <select
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                            value={currentBatchReleaseConfigured}
                            onChange={(e) => setSelectedBatchReleaseDocCode(e.target.value)}
                        >
                            <option value="">Selecciona formato de liberación QA...</option>
                            {packagingOptions.map((doc) => (
                                <option key={`${doc.id}-qa`} value={doc.code}>
                                    {doc.code} v{doc.version} - {doc.title} ({doc.status})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleSavePackagingConfig} disabled={savingConfig}>
                            {savingConfig ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </div>
                    {!currentPackagingConfigured || !currentLabelingConfigured || !currentBatchReleaseConfigured ? (
                        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                            Debes configurar los tres formatos para completar el flujo unificado del lote.
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
