import { useNavigate } from 'react-router-dom';
import { DocumentCategory, DocumentStatus, OperationalConfig, ProductionOrderStatus } from '@scaffold/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Plus, Eye, Settings, Factory, Clock, CheckCircle2,
    Loader2, XCircle, FileText, ChevronDown, ChevronUp,
    AlertCircle, Save
} from 'lucide-react';
import { format } from 'date-fns';
import { useProductionOrdersQuery } from '@/hooks/mrp/useProductionOrders';
import { useMrpQueryErrorToast } from '@/hooks/mrp/useMrpQueryErrorToast';
import { useControlledDocumentsQuery } from '@/hooks/mrp/useQuality';
import { useOperationalConfigQuery, useSaveOperationalConfigMutation } from '@/hooks/mrp/useOperationalConfig';
import { useMemo, useState } from 'react';
import { getErrorMessage } from '@/lib/api-error';
import { useToast } from '@/components/ui/use-toast';

const statusConfig: Record<ProductionOrderStatus, { label: string; classes: string; icon: React.ReactNode }> = {
    [ProductionOrderStatus.DRAFT]: {
        label: 'Borrador',
        classes: 'bg-slate-50 text-slate-600 border-slate-200 ring-slate-500/10',
        icon: <FileText className="h-3 w-3 mr-1" />,
    },
    [ProductionOrderStatus.PLANNED]: {
        label: 'Planificada',
        classes: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/20',
        icon: <Clock className="h-3 w-3 mr-1" />,
    },
    [ProductionOrderStatus.IN_PROGRESS]: {
        label: 'En Progreso',
        classes: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20',
        icon: <Loader2 className="h-3 w-3 mr-1 animate-spin" />,
    },
    [ProductionOrderStatus.COMPLETED]: {
        label: 'Completada',
        classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20',
        icon: <CheckCircle2 className="h-3 w-3 mr-1" />,
    },
    [ProductionOrderStatus.CANCELLED]: {
        label: 'Cancelada',
        classes: 'bg-red-50 text-red-600 border-red-200 ring-red-500/10',
        icon: <XCircle className="h-3 w-3 mr-1" />,
    },
};

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

    const kpi = useMemo(() => ({
        total: orders.length,
        planned: orders.filter(o => o.status === ProductionOrderStatus.PLANNED).length,
        inProgress: orders.filter(o => o.status === ProductionOrderStatus.IN_PROGRESS).length,
        completed: orders.filter(o => o.status === ProductionOrderStatus.COMPLETED).length,
    }), [orders]);

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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/20 to-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Hero Header */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-6 md:p-8 relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-50/40 to-transparent pointer-events-none" />
                        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-violet-50 rounded-2xl ring-1 ring-violet-100 shadow-sm shrink-0">
                                    <Factory className="h-7 w-7 text-violet-600" />
                                </div>
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-none">
                                        Órdenes de Producción
                                    </h1>
                                    <p className="text-slate-500 mt-1.5 text-sm md:text-base">
                                        Gestiona y monitorea el ciclo completo de fabricación.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowPackagingSettings((prev) => !prev)}
                                    className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 font-medium h-10 px-4"
                                >
                                    <Settings className="mr-2 h-4 w-4" />
                                    Formatos
                                    {showPackagingSettings ? <ChevronUp className="ml-2 h-3.5 w-3.5" /> : <ChevronDown className="ml-2 h-3.5 w-3.5" />}
                                </Button>
                                <Button
                                    onClick={() => navigate('/mrp/production-orders/new')}
                                    className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm shadow-violet-200 font-medium rounded-xl h-10 px-5 transition-all"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Nueva Orden
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Packaging Config Panel */}
                {showPackagingSettings && (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                            <Settings className="h-4 w-4 text-violet-500" />
                            <h2 className="font-semibold text-slate-800">Formatos Globales de Lote</h2>
                        </div>
                        <div className="p-6 space-y-5">
                            <p className="text-sm text-slate-500">
                                Configura los documentos FOR globales para el flujo de lote: empaque, etiquetado y liberación QA.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Modo de Trazabilidad</label>
                                    <select
                                        className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 cursor-not-allowed"
                                        value={currentOperationMode}
                                        disabled
                                    >
                                        <option value="lote">Lote (fijo)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Formato de Empaque</label>
                                    <select
                                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                        value={currentPackagingConfigured}
                                        onChange={(e) => setSelectedPackagingDocCode(e.target.value)}
                                    >
                                        <option value="">Selecciona formato de empaque...</option>
                                        {packagingOptions.map((doc) => (
                                            <option key={doc.id} value={doc.code}>
                                                {doc.code} v{doc.version} — {doc.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Formato de Etiquetado</label>
                                    <select
                                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                        value={currentLabelingConfigured}
                                        onChange={(e) => setSelectedLabelingDocCode(e.target.value)}
                                    >
                                        <option value="">Selecciona formato de etiquetado...</option>
                                        {packagingOptions.map((doc) => (
                                            <option key={`${doc.id}-lbl`} value={doc.code}>
                                                {doc.code} v{doc.version} — {doc.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Formato de Liberación QA</label>
                                    <select
                                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                        value={currentBatchReleaseConfigured}
                                        onChange={(e) => setSelectedBatchReleaseDocCode(e.target.value)}
                                    >
                                        <option value="">Selecciona formato de liberación QA...</option>
                                        {packagingOptions.map((doc) => (
                                            <option key={`${doc.id}-qa`} value={doc.code}>
                                                {doc.code} v{doc.version} — {doc.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            {(!currentPackagingConfigured || !currentLabelingConfigured || !currentBatchReleaseConfigured) && (
                                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    Debes configurar los tres formatos para completar el flujo unificado del lote.
                                </div>
                            )}
                            <div className="flex justify-end">
                                <Button
                                    onClick={handleSavePackagingConfig}
                                    disabled={savingConfig}
                                    className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-10 px-6 font-medium"
                                >
                                    {savingConfig ? (
                                        <>
                                            <div className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Guardar
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-slate-100 rounded-lg">
                                <Factory className="h-4 w-4 text-slate-600" />
                            </div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900">{kpi.total}</div>
                    </div>
                    <div className="bg-white border border-blue-100 p-4 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-blue-50 rounded-lg">
                                <Clock className="h-4 w-4 text-blue-600" />
                            </div>
                            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Planificadas</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-700">{kpi.planned}</div>
                    </div>
                    <div className="bg-white border border-amber-100 p-4 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-amber-50 rounded-lg">
                                <Loader2 className="h-4 w-4 text-amber-600" />
                            </div>
                            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">En Progreso</span>
                        </div>
                        <div className="text-2xl font-bold text-amber-700">{kpi.inProgress}</div>
                    </div>
                    <div className="bg-white border border-emerald-100 p-4 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-emerald-50 rounded-lg">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            </div>
                            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Completadas</span>
                        </div>
                        <div className="text-2xl font-bold text-emerald-700">{kpi.completed}</div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <div className="animate-spin mb-4 h-8 w-8 border-4 border-slate-200 border-t-violet-600 rounded-full" />
                            <p className="font-medium animate-pulse">Cargando órdenes...</p>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="py-20 px-6 text-center">
                            <div className="bg-slate-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-slate-50/50">
                                <Factory className="h-8 w-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">Sin órdenes de producción</h3>
                            <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
                                No hay órdenes registradas. Crea la primera para comenzar el proceso de fabricación.
                            </p>
                            <Button
                                onClick={() => navigate('/mrp/production-orders/new')}
                                variant="outline"
                                className="rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Nueva Orden
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/80 border-b border-slate-100 hover:bg-slate-50/80">
                                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider py-3.5 pl-6">Código</TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider py-3.5">Estado</TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider py-3.5">Fecha Inicio</TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider py-3.5">Fecha Fin</TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider py-3.5 pr-6 text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.map((order) => {
                                    const cfg = statusConfig[order.status] ?? statusConfig[ProductionOrderStatus.DRAFT];
                                    return (
                                        <TableRow
                                            key={order.id}
                                            className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors cursor-pointer"
                                            onClick={() => navigate(`/mrp/production-orders/${order.id}`)}
                                        >
                                            <TableCell className="pl-6 py-4">
                                                <span className="font-bold text-slate-900 font-mono tracking-tight">
                                                    {order.code}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <Badge variant="outline" className={`inline-flex items-center font-semibold ring-1 ring-inset ${cfg.classes}`}>
                                                    {cfg.icon}
                                                    {cfg.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-4 text-sm text-slate-600">
                                                {order.startDate ? format(new Date(order.startDate), 'dd/MM/yyyy') : (
                                                    <span className="text-slate-400 italic">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-4 text-sm text-slate-600">
                                                {order.endDate ? format(new Date(order.endDate), 'dd/MM/yyyy') : (
                                                    <span className="text-slate-400 italic">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-4 pr-6 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/mrp/production-orders/${order.id}`); }}
                                                    className="rounded-lg text-slate-500 hover:text-violet-700 hover:bg-violet-50 h-8 px-3"
                                                >
                                                    <Eye className="h-4 w-4 mr-1.5" />
                                                    Ver
                                                </Button>
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
