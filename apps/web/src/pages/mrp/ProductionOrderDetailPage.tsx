import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    BatchRelease,
    BatchReleaseStatus,
    DocumentApprovalMethod,
    Product,
    ProductionOrderItem,
    ProductionOrderStatus,
    ProductVariant,
    RegulatoryCodingStandard,
    RegulatoryDeviceType,
    RegulatoryLabel,
    RegulatoryLabelScopeType,
    RegulatoryLabelStatus,
} from '@scaffold/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ArrowLeft, Printer, Play, CheckCircle, Truck, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ProductionRequirementsTable } from '@/components/mrp/ProductionRequirementsTable';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { getErrorMessage } from '@/lib/api-error';
import { mrpApi } from '@/services/mrpApi';
import { useMrpQueryErrorRedirect } from '@/hooks/mrp/useMrpQueryErrorRedirect';
import { useMrpQueryErrorToast } from '@/hooks/mrp/useMrpQueryErrorToast';
import { useOperationalConfigQuery } from '@/hooks/mrp/useOperationalConfig';
import { useWarehousesQuery } from '@/hooks/mrp/useWarehouses';
import {
    useAddProductionBatchUnitsMutation,
    useCreateProductionBatchMutation,
    useProductionBatchesQuery,
    useProductionOrderQuery,
    useProductionRequirementsQuery,
    useUpdateProductionBatchPackagingMutation,
    useUpdateProductionBatchQcMutation,
    useUpdateProductionBatchUnitPackagingMutation,
    useUpdateProductionBatchUnitQcMutation,
    useUpdateProductionOrderStatusMutation,
    useUpsertProductionBatchPackagingFormMutation,
} from '@/hooks/mrp/useProductionOrders';

export default function ProductionOrderDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    // Warehouse selection for completion
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
    const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
    const [newBatchVariantId, setNewBatchVariantId] = useState<string>('');
    const [newBatchQty, setNewBatchQty] = useState<number>(1);
    const [newBatchCode, setNewBatchCode] = useState<string>('');
    const [packagingFormBatchId, setPackagingFormBatchId] = useState<string | null>(null);
    const [packagingForm, setPackagingForm] = useState({
        operatorName: '',
        verifierName: '',
        quantityToPack: '0',
        quantityPacked: '0',
        lotLabel: '',
        hasTechnicalSheet: false,
        hasLabels: false,
        hasPackagingMaterial: false,
        hasTools: false,
        inventoryRecorded: false,
        observations: '',
        nonConformity: '',
        correctiveAction: '',
        preventiveAction: '',
    });
    const [lotCenterBatchId, setLotCenterBatchId] = useState<string | null>(null);
    const [lotCenterLabel, setLotCenterLabel] = useState({
        productName: '',
        manufacturerName: '',
        invimaRegistration: '',
        lotCode: '',
        manufactureDate: new Date().toISOString().slice(0, 10),
        expirationDate: '',
        codingStandard: RegulatoryCodingStandard.INTERNO,
        deviceType: RegulatoryDeviceType.CLASE_I,
    });
    const [lotCenterChecklist, setLotCenterChecklist] = useState({
        qcApproved: false,
        labelingValidated: false,
        documentsCurrent: false,
        evidencesComplete: false,
        checklistNotes: '',
        rejectedReason: '',
    });
    const [lotCenterSignature, setLotCenterSignature] = useState('sistema-web');
    const [lotCenterLoading, setLotCenterLoading] = useState(false);
    const [lotCenterSavingChecklist, setLotCenterSavingChecklist] = useState(false);
    const [lotCenterSavingLabel, setLotCenterSavingLabel] = useState(false);
    const [lotCenterSigning, setLotCenterSigning] = useState(false);
    const [lotCenterRelease, setLotCenterRelease] = useState<BatchRelease | null>(null);
    const [lotCenterLotLabel, setLotCenterLotLabel] = useState<RegulatoryLabel | null>(null);

    const { data: order, loading, error, execute: reloadOrder } = useProductionOrderQuery(id);
    const { data: requirementsData, loading: loadingReqs, error: requirementsError } = useProductionRequirementsQuery(id);
    const { data: batchesData, error: batchesError, execute: reloadBatches } = useProductionBatchesQuery(id);
    const { data: warehousesData, error: warehousesError } = useWarehousesQuery();
    const { data: operationalConfig } = useOperationalConfigQuery();
    const requirements = requirementsData ?? [];
    const batches = batchesData ?? [];
    const warehouses = warehousesData ?? [];
    const isSerialMode = operationalConfig?.operationMode === 'serial';
    const { execute: updateOrderStatus, loading: submitting } = useUpdateProductionOrderStatusMutation();
    const { execute: createBatch, loading: creatingBatch } = useCreateProductionBatchMutation();
    const { execute: addBatchUnits } = useAddProductionBatchUnitsMutation();
    const { execute: updateBatchQc } = useUpdateProductionBatchQcMutation();
    const { execute: updateBatchPackaging } = useUpdateProductionBatchPackagingMutation();
    const { execute: updateUnitQc } = useUpdateProductionBatchUnitQcMutation();
    const { execute: updateUnitPackaging } = useUpdateProductionBatchUnitPackagingMutation();
    const { execute: upsertPackagingForm, loading: savingPackagingForm } = useUpsertProductionBatchPackagingFormMutation();

    useMrpQueryErrorRedirect(error, 'No se pudo cargar la orden de producción', '/mrp/production-orders');
    useMrpQueryErrorToast(requirementsError, 'No se pudieron calcular los requerimientos');
    useMrpQueryErrorToast(warehousesError, 'No se pudieron cargar los almacenes');
    useMrpQueryErrorToast(batchesError, 'No se pudieron cargar los lotes');

    const handleStatusChange = async (newStatus: ProductionOrderStatus) => {
        if (!order) return;

        if (newStatus === ProductionOrderStatus.COMPLETED) {
            setIsCompleteDialogOpen(true);
            return;
        }

        try {
            await updateOrderStatus({ orderId: order.id, status: newStatus });
            toast({ title: "Estado actualizado", description: `La orden ahora está: ${newStatus}` });
            await reloadOrder({ force: true });
        } catch (error) {
            toast({
                title: "Error al actualizar",
                description: getErrorMessage(error, 'No se pudo cambiar el estado'),
                variant: "destructive"
            });
        }
    };

    const handleComplete = async () => {
        if (!order) return;
        try {
            await updateOrderStatus({
                orderId: order.id,
                status: ProductionOrderStatus.COMPLETED,
                warehouseId: selectedWarehouseId || undefined,
            });
            toast({ title: "Orden completada", description: "El producto terminado ha sido agregado al inventario." });
            setIsCompleteDialogOpen(false);
            await reloadOrder({ force: true });
        } catch (error) {
            toast({
                title: "Error",
                description: getErrorMessage(error, 'No se pudo completar la orden'),
                variant: "destructive"
            });
        }
    };

    const handleCreateBatch = async () => {
        if (!id || !newBatchVariantId || newBatchQty <= 0) return;
        try {
            await createBatch({
                orderId: id,
                variantId: newBatchVariantId,
                plannedQty: newBatchQty,
                code: newBatchCode || undefined,
            });
            toast({ title: 'Lote creado', description: 'Lote creado correctamente.' });
            setNewBatchCode('');
            await reloadBatches({ force: true });
            await reloadOrder({ force: true });
        } catch (err) {
            toast({
                title: 'Error',
                description: getErrorMessage(err, 'No se pudo crear el lote'),
                variant: 'destructive',
            });
        }
    };

    const handleAddUnits = async (batchId: string) => {
        if (!id) return;
        const value = prompt('Cantidad de unidades a generar para este lote:', '1');
        const quantity = Number(value);
        if (!quantity || quantity <= 0) return;
        try {
            await addBatchUnits({ orderId: id, batchId, quantity });
            toast({ title: 'Unidades generadas', description: `${quantity} unidades agregadas al lote.` });
            await reloadBatches({ force: true });
        } catch (err) {
            toast({
                title: 'Error',
                description: getErrorMessage(err, 'No se pudieron generar unidades'),
                variant: 'destructive',
            });
        }
    };

    const handleBatchQc = async (batchId: string, passed: boolean) => {
        if (!id) return;
        try {
            await updateBatchQc({ orderId: id, batchId, passed });
            await reloadBatches({ force: true });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo actualizar QC'), variant: 'destructive' });
        }
    };

    const handleBatchPackaging = async (batchId: string, packed: boolean) => {
        if (!id) return;
        try {
            await updateBatchPackaging({ orderId: id, batchId, packed });
            await reloadBatches({ force: true });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo actualizar empaque'), variant: 'destructive' });
        }
    };

    const handleUnitQc = async (unitId: string, passed: boolean) => {
        if (!id) return;
        try {
            await updateUnitQc({ orderId: id, unitId, passed });
            await reloadBatches({ force: true });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo actualizar QC de unidad'), variant: 'destructive' });
        }
    };

    const handleUnitPackaging = async (unitId: string, packaged: boolean) => {
        if (!id) return;
        try {
            await updateUnitPackaging({ orderId: id, unitId, packaged });
            await reloadBatches({ force: true });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo actualizar empaque de unidad'), variant: 'destructive' });
        }
    };

    const openPackagingFormDialog = (batchId: string) => {
        const batch = batches.find((b) => b.id === batchId);
        const data = (batch?.packagingFormData || {}) as Record<string, unknown>;
        setPackagingFormBatchId(batchId);
        setPackagingForm({
            operatorName: String(data.operatorName || ''),
            verifierName: String(data.verifierName || ''),
            quantityToPack: String(data.quantityToPack || batch?.plannedQty || 0),
            quantityPacked: String(data.quantityPacked || batch?.producedQty || 0),
            lotLabel: String(data.lotLabel || batch?.code || ''),
            hasTechnicalSheet: Boolean(data.hasTechnicalSheet),
            hasLabels: Boolean(data.hasLabels),
            hasPackagingMaterial: Boolean(data.hasPackagingMaterial),
            hasTools: Boolean(data.hasTools),
            inventoryRecorded: Boolean(data.inventoryRecorded),
            observations: String(data.observations || ''),
            nonConformity: String(data.nonConformity || ''),
            correctiveAction: String(data.correctiveAction || ''),
            preventiveAction: String(data.preventiveAction || ''),
        });
    };

    const closePackagingFormDialog = () => setPackagingFormBatchId(null);

    const submitPackagingForm = async () => {
        if (!id || !packagingFormBatchId) return;
        const batch = batches.find((row) => row.id === packagingFormBatchId);
        const plannedQty = Number(batch?.plannedQty || 0);
        const quantityToPack = Number(packagingForm.quantityToPack || 0);
        const quantityPacked = Number(packagingForm.quantityPacked || 0);
        if (quantityToPack <= 0) {
            toast({ title: 'Error', description: 'Cantidad a empacar debe ser mayor a 0', variant: 'destructive' });
            return;
        }
        if (quantityPacked < 0) {
            toast({ title: 'Error', description: 'Cantidad empacada no puede ser negativa', variant: 'destructive' });
            return;
        }
        if (plannedQty > 0 && quantityToPack > plannedQty) {
            toast({ title: 'Error', description: `Cantidad a empacar no puede superar el plan del lote (${plannedQty})`, variant: 'destructive' });
            return;
        }
        if (quantityPacked > quantityToPack) {
            toast({ title: 'Error', description: 'Cantidad empacada no puede superar la cantidad a empacar', variant: 'destructive' });
            return;
        }
        try {
            await upsertPackagingForm({
                orderId: id,
                batchId: packagingFormBatchId,
                payload: {
                    operatorName: packagingForm.operatorName.trim(),
                    verifierName: packagingForm.verifierName.trim(),
                    quantityToPack,
                    quantityPacked,
                    lotLabel: packagingForm.lotLabel.trim(),
                    hasTechnicalSheet: packagingForm.hasTechnicalSheet,
                    hasLabels: packagingForm.hasLabels,
                    hasPackagingMaterial: packagingForm.hasPackagingMaterial,
                    hasTools: packagingForm.hasTools,
                    inventoryRecorded: packagingForm.inventoryRecorded,
                    observations: packagingForm.observations.trim() || undefined,
                    nonConformity: packagingForm.nonConformity.trim() || undefined,
                    correctiveAction: packagingForm.correctiveAction.trim() || undefined,
                    preventiveAction: packagingForm.preventiveAction.trim() || undefined,
                    actor: 'sistema-web',
                },
            });
            toast({ title: 'FOR guardado', description: 'Formato de empaque guardado correctamente.' });
            closePackagingFormDialog();
            await reloadBatches({ force: true });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo guardar el FOR de empaque'), variant: 'destructive' });
        }
    };

    const downloadPackagingFormPdf = async (batchId: string) => {
        try {
            const blob = await mrpApi.getProductionBatchPackagingFormPdf(batchId);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `FOR-EMPAQUE-${batchId.slice(0, 8).toUpperCase()}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo descargar el FOR de empaque'), variant: 'destructive' });
        }
    };

    const downloadLabelPdf = async (batchId: string) => {
        try {
            const blob = await mrpApi.getRegulatoryLabelPdf(batchId);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `FOR-ETIQUETADO-${batchId.slice(0, 8).toUpperCase()}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo descargar el PDF de etiquetado'), variant: 'destructive' });
        }
    };

    const downloadBatchReleasePdf = async (batchId: string) => {
        try {
            const blob = await mrpApi.getBatchReleasePdf(batchId);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `FOR-LIBERACION-QA-${batchId.slice(0, 8).toUpperCase()}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo descargar el PDF de liberación QA'), variant: 'destructive' });
        }
    };

    const openLotCenter = async (batchId: string) => {
        const batch = batches.find((b) => b.id === batchId);
        if (!batch) return;
        setLotCenterBatchId(batchId);
        setLotCenterLoading(true);
        try {
            const [labels, releases] = await Promise.all([
                mrpApi.listRegulatoryLabels({ productionBatchId: batchId, scopeType: RegulatoryLabelScopeType.LOTE }),
                mrpApi.listBatchReleases({ productionBatchId: batchId }),
            ]);
            const lotLabel = labels.find((row) => row.scopeType === RegulatoryLabelScopeType.LOTE) || null;
            const release = releases[0] || null;
            setLotCenterLotLabel(lotLabel);
            setLotCenterRelease(release);
            setLotCenterLabel({
                productName: lotLabel?.productName || batch.variant?.product?.name || '',
                manufacturerName: lotLabel?.manufacturerName || '',
                invimaRegistration: lotLabel?.invimaRegistration || '',
                lotCode: lotLabel?.lotCode || batch.code,
                manufactureDate: lotLabel?.manufactureDate ? new Date(lotLabel.manufactureDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
                expirationDate: lotLabel?.expirationDate ? new Date(lotLabel.expirationDate).toISOString().slice(0, 10) : '',
                codingStandard: lotLabel?.codingStandard || RegulatoryCodingStandard.INTERNO,
                deviceType: lotLabel?.deviceType || RegulatoryDeviceType.CLASE_I,
            });
            setLotCenterChecklist({
                qcApproved: release?.qcApproved ?? batch.qcStatus === 'passed',
                labelingValidated: release?.labelingValidated ?? lotLabel?.status === RegulatoryLabelStatus.VALIDADA,
                documentsCurrent: release?.documentsCurrent ?? Boolean(batch.packagingFormCompleted),
                evidencesComplete: release?.evidencesComplete ?? Boolean(batch.packagingFormCompleted),
                checklistNotes: release?.checklistNotes || '',
                rejectedReason: release?.rejectedReason || '',
            });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo cargar el centro de lote'), variant: 'destructive' });
        } finally {
            setLotCenterLoading(false);
        }
    };

    const saveLotLabel = async () => {
        if (!lotCenterBatchId) return;
        setLotCenterSavingLabel(true);
        try {
            const row = await mrpApi.upsertRegulatoryLabel({
                productionBatchId: lotCenterBatchId,
                scopeType: RegulatoryLabelScopeType.LOTE,
                deviceType: lotCenterLabel.deviceType,
                codingStandard: lotCenterLabel.codingStandard,
                productName: lotCenterLabel.productName || undefined,
                manufacturerName: lotCenterLabel.manufacturerName || undefined,
                invimaRegistration: lotCenterLabel.invimaRegistration || undefined,
                lotCode: lotCenterLabel.lotCode || undefined,
                manufactureDate: lotCenterLabel.manufactureDate,
                expirationDate: lotCenterLabel.expirationDate || undefined,
                actor: 'sistema-web',
            });
            setLotCenterLotLabel(row);
            setLotCenterChecklist((prev) => ({ ...prev, labelingValidated: row.status === RegulatoryLabelStatus.VALIDADA }));
            toast({
                title: row.status === RegulatoryLabelStatus.VALIDADA ? 'Etiqueta validada' : 'Etiqueta guardada',
                description: row.status === RegulatoryLabelStatus.VALIDADA ? 'Etiqueta de lote en estado validada.' : 'Revisa campos para que quede validada.',
            });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo guardar etiqueta regulatoria'), variant: 'destructive' });
        } finally {
            setLotCenterSavingLabel(false);
        }
    };

    const saveLotChecklist = async () => {
        if (!lotCenterBatchId) return;
        setLotCenterSavingChecklist(true);
        try {
            const row = await mrpApi.upsertBatchReleaseChecklist({
                productionBatchId: lotCenterBatchId,
                qcApproved: lotStepStatus.qc,
                labelingValidated: lotCenterChecklist.labelingValidated,
                documentsCurrent: lotCenterChecklist.documentsCurrent,
                evidencesComplete: lotCenterChecklist.evidencesComplete,
                checklistNotes: lotCenterChecklist.checklistNotes || undefined,
                rejectedReason: lotCenterChecklist.rejectedReason || undefined,
                actor: 'sistema-web',
            });
            setLotCenterRelease(row);
            toast({ title: 'Checklist guardado', description: 'Checklist de liberación QA actualizado.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo guardar checklist QA'), variant: 'destructive' });
        } finally {
            setLotCenterSavingChecklist(false);
        }
    };

    const signLotRelease = async () => {
        if (!lotCenterBatchId) return;
        setLotCenterSigning(true);
        try {
            const row = await mrpApi.signBatchRelease(lotCenterBatchId, {
                actor: 'sistema-web',
                approvalMethod: DocumentApprovalMethod.FIRMA_DIGITAL,
                approvalSignature: lotCenterSignature.trim() || 'sistema-web',
            });
            setLotCenterRelease(row);
            toast({ title: 'Liberación firmada', description: 'El lote quedó liberado por QA.' });
            if (id) {
                await reloadBatches({ force: true });
                await reloadOrder({ force: true });
            }
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo firmar liberación QA'), variant: 'destructive' });
        } finally {
            setLotCenterSigning(false);
        }
    };

    const getQcStatusLabel = (status?: string) => {
        switch (status) {
            case 'passed':
                return 'Aprobado';
            case 'failed':
                return 'Rechazado';
            case 'pending':
            default:
                return 'Pendiente';
        }
    };

    const getPackagingStatusLabel = (status?: string) => {
        switch (status) {
            case 'packed':
                return 'Empacado';
            case 'pending':
            default:
                return 'Pendiente';
        }
    };

    const getQcBadgeClass = (status?: string) => {
        switch (status) {
            case 'passed':
                return 'border-emerald-200 bg-emerald-50 text-emerald-700';
            case 'failed':
                return 'border-red-200 bg-red-50 text-red-700';
            case 'pending':
            default:
                return 'border-amber-200 bg-amber-50 text-amber-700';
        }
    };

    const getPackagingBadgeClass = (status?: string) => {
        switch (status) {
            case 'packed':
                return 'border-blue-200 bg-blue-50 text-blue-700';
            case 'pending':
            default:
                return 'border-slate-200 bg-slate-50 text-slate-700';
        }
    };

    const shortId = (value: string) => (value.length > 12 ? `${value.slice(0, 8)}...` : value);
    const selectedOrderItem = useMemo(
        () => (order?.items ?? []).find((item) => item.variantId === newBatchVariantId),
        [order?.items, newBatchVariantId]
    );
    const plannedForSelectedVariant = useMemo(
        () => (batches ?? [])
            .filter((batch) => batch.variant?.id === newBatchVariantId)
            .reduce((acc, batch) => acc + Number(batch.plannedQty || 0), 0),
        [batches, newBatchVariantId]
    );
    const orderedForSelectedVariant = Number(selectedOrderItem?.quantity || 0);
    const remainingToPlanForSelectedVariant = Math.max(orderedForSelectedVariant - plannedForSelectedVariant, 0);
    const exceedsPlannedQtyForSelectedVariant = Boolean(
        newBatchVariantId &&
        orderedForSelectedVariant > 0 &&
        newBatchQty > remainingToPlanForSelectedVariant
    );

    const handleVariantChange = (variantId: string) => {
        setNewBatchVariantId(variantId);
        const nextOrderItem = (order?.items ?? []).find((item) => item.variantId === variantId);
        const nextOrderedQty = Number(nextOrderItem?.quantity || 0);
        const nextPlannedQty = (batches ?? [])
            .filter((batch) => batch.variant?.id === variantId)
            .reduce((acc, batch) => acc + Number(batch.plannedQty || 0), 0);
        const nextRemaining = Math.max(nextOrderedQty - nextPlannedQty, 0);
        setNewBatchQty(nextRemaining > 0 ? nextRemaining : 1);
    };

    const copyBatchId = async (batchId: string) => {
        try {
            await navigator.clipboard.writeText(batchId);
            toast({ title: 'ID copiado', description: 'UUID del lote copiado al portapapeles.' });
        } catch (_error) {
            toast({
                title: 'No se pudo copiar',
                description: `Copia manualmente este ID: ${batchId}`,
                variant: 'destructive',
            });
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8">Cargando...</div>;
    }

    if (!order) {
        return <div className="p-8">Orden no encontrada</div>;
    }

    const lotExecutionEnabled = order.status === ProductionOrderStatus.IN_PROGRESS;
    const lotExecutionDisabledReason = 'Debes planificar e iniciar la orden para ejecutar QC y empaque.';
    const activeLotBatch = lotCenterBatchId ? batches.find((b) => b.id === lotCenterBatchId) : undefined;
    const lotStepStatus = {
        form: Boolean(activeLotBatch?.packagingFormCompleted),
        label: lotCenterLotLabel?.status === RegulatoryLabelStatus.VALIDADA,
        qc: activeLotBatch?.qcStatus === 'passed',
        packed: activeLotBatch?.packagingStatus === 'packed',
        qa: lotCenterRelease?.status === BatchReleaseStatus.LIBERADO_QA,
    };
    const checklistReadyForSign = Boolean(
        lotStepStatus.qc &&
        lotCenterChecklist.labelingValidated &&
        lotCenterChecklist.documentsCurrent &&
        lotCenterChecklist.evidencesComplete &&
        !lotCenterChecklist.rejectedReason?.trim()
    );
    const nextLotStep = !lotStepStatus.form
        ? 'for'
        : !lotStepStatus.label
            ? 'label'
            : !lotStepStatus.qc
                ? 'qc'
                : !lotStepStatus.packed
                    ? 'pack'
                    : !lotStepStatus.qa
                        ? (checklistReadyForSign ? 'sign' : 'checklist')
                        : 'done';
    const nextLotStepLabel = nextLotStep === 'for'
        ? 'Diligenciar FOR'
        : nextLotStep === 'label'
            ? 'Validar etiqueta'
            : nextLotStep === 'qc'
                ? 'Aprobar QC'
                : nextLotStep === 'pack'
                    ? 'Empacar lote'
                    : nextLotStep === 'checklist'
                        ? 'Guardar checklist QA'
                        : nextLotStep === 'sign'
                        ? 'Firmar liberación QA'
                        : 'Lote completo';

    const handleNextLotStep = async () => {
        if (!activeLotBatch) return;
        if (nextLotStep === 'for') {
            openPackagingFormDialog(activeLotBatch.id);
            return;
        }
        if (nextLotStep === 'label') {
            await saveLotLabel();
            return;
        }
        if (nextLotStep === 'pack') {
            await handleBatchPackaging(activeLotBatch.id, true);
            return;
        }
        if (nextLotStep === 'qc') {
            await handleBatchQc(activeLotBatch.id, true);
            if (id) {
                await reloadBatches({ force: true });
            }
            return;
        }
        if (nextLotStep === 'checklist') {
            await saveLotChecklist();
            return;
        }
        if (nextLotStep === 'sign') {
            await signLotRelease();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/mrp/production-orders')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                            {order.code}
                            <Badge variant="outline" className="ml-2">
                                {order.status}
                            </Badge>
                        </h1>
                        <p className="text-slate-500">Detalle de Orden de Producción</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {order.status === ProductionOrderStatus.DRAFT && (
                        <Button onClick={() => handleStatusChange(ProductionOrderStatus.PLANNED)} className="bg-blue-600 hover:bg-blue-700">
                            <Truck className="mr-2 h-4 w-4" />
                            Planificar
                        </Button>
                    )}
                    {order.status === ProductionOrderStatus.PLANNED && (
                        <Button onClick={() => handleStatusChange(ProductionOrderStatus.IN_PROGRESS)} className="bg-amber-600 hover:bg-amber-700">
                            <Play className="mr-2 h-4 w-4" />
                            Iniciar Producción
                        </Button>
                    )}
                    {order.status === ProductionOrderStatus.IN_PROGRESS && (
                        <Button onClick={() => handleStatusChange(ProductionOrderStatus.COMPLETED)} className="bg-green-600 hover:bg-green-700">
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Finalizar
                        </Button>
                    )}
                    <Button variant="outline" size="icon">
                        <Printer className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="details" className="w-full">
                <TabsList>
                    <TabsTrigger value="details">Detalles</TabsTrigger>
                    <TabsTrigger value="procurement">Aprovisionamiento</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Información General</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <span className="text-slate-500">Fecha Inicio:</span>
                                    <span>{order.startDate ? format(new Date(order.startDate), 'dd/MM/yyyy') : '-'}</span>

                                    <span className="text-slate-500">Fecha Fin:</span>
                                    <span>{order.endDate ? format(new Date(order.endDate), 'dd/MM/yyyy') : '-'}</span>

                                    <span className="text-slate-500">Notas:</span>
                                    <span className="col-span-2 mt-1 p-2 bg-slate-50 rounded border text-slate-700 text-xs">
                                        {order.notes || "Sin notas"}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Items a Producir</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {order.items?.map((item) => {
                                        const populatedItem = item as ProductionOrderItem & { variant?: ProductVariant & { product?: Product } };
                                        return (
                                            <div key={item.id} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                                                <div>
                                                    <div className="font-medium">{populatedItem.variant?.product?.name} - {populatedItem.variant?.name}</div>
                                                    <div className="text-xs text-slate-500">{populatedItem.variant?.sku}</div>
                                                </div>
                                                <div className="font-bold text-lg">
                                                    {item.quantity} unds
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Trazabilidad por Lotes</CardTitle>
                            <CardDescription>
                                Crea lotes, controla QC y empaque. La orden solo se puede finalizar cuando todos los lotes estén liberados.
                            </CardDescription>
                            {!isSerialMode ? (
                                <p className="text-xs text-slate-600">Modo activo: lote (sin manejo de unidades seriales).</p>
                            ) : null}
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!lotExecutionEnabled ? (
                                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                    QC y empaque se habilitan cuando la orden esté en "in_progress".
                                </p>
                            ) : null}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                <Select value={newBatchVariantId} onValueChange={handleVariantChange}>
                                    <SelectTrigger className="md:col-span-2">
                                        <SelectValue placeholder="Variante para el lote" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(order.items ?? []).map((item) => {
                                            const populatedItem = item as ProductionOrderItem & { variant?: ProductVariant & { product?: Product } };
                                            return (
                                                <SelectItem key={item.variantId} value={item.variantId}>
                                                    {populatedItem.variant?.product?.name} - {populatedItem.variant?.name}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                                <input
                                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                    type="number"
                                    min={1}
                                    value={newBatchQty}
                                    onChange={(e) => setNewBatchQty(Number(e.target.value) || 1)}
                                    placeholder="Cantidad"
                                />
                                <Button onClick={handleCreateBatch} disabled={!newBatchVariantId || creatingBatch || exceedsPlannedQtyForSelectedVariant}>
                                    {creatingBatch ? 'Creando...' : 'Crear Lote'}
                                </Button>
                            </div>
                            {newBatchVariantId ? (
                                <p className={`text-xs ${exceedsPlannedQtyForSelectedVariant ? 'text-red-700' : 'text-slate-600'}`}>
                                    Pendiente por lotear para esta variante: {remainingToPlanForSelectedVariant}
                                    {exceedsPlannedQtyForSelectedVariant ? ` | La cantidad ingresada (${newBatchQty}) supera el pendiente.` : ''}
                                </p>
                            ) : null}
                            <input
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full md:w-1/2"
                                value={newBatchCode}
                                onChange={(e) => setNewBatchCode(e.target.value)}
                                placeholder="Código lote opcional"
                            />

                            <div className="space-y-3">
                                {batches.length === 0 ? (
                                    <div className="text-sm text-slate-500">Sin lotes registrados.</div>
                                ) : (
                                    batches.map((batch) => (
                                        <div key={batch.id} className="border rounded-md p-3 space-y-3">
                                            {(() => {
                                                const hasPackagingForm = Boolean(batch.packagingFormCompleted);

                                                return (
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <div className="font-semibold">{batch.code}</div>
                                                    <div className="text-xs text-slate-500">
                                                        {batch.variant?.product?.name} - {batch.variant?.name} | Plan: {batch.plannedQty} | Producido: {batch.producedQty}
                                                    </div>
                                                    <div className="text-xs text-slate-500 mt-1">
                                                        ID:{' '}
                                                        <span title={batch.id} className="font-mono">
                                                            {shortId(batch.id)}
                                                        </span>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-6 px-2 ml-1 text-[11px]"
                                                            onClick={() => copyBatchId(batch.id)}
                                                            title="Copiar UUID completo"
                                                        >
                                                            Copiar ID
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge variant="outline" className={getQcBadgeClass(batch.qcStatus)}>
                                                        QC: {getQcStatusLabel(batch.qcStatus)}
                                                    </Badge>
                                                    <Badge variant="outline" className={getPackagingBadgeClass(batch.packagingStatus)}>
                                                        Empaque: {getPackagingStatusLabel(batch.packagingStatus)}
                                                    </Badge>
                                                    <Badge variant="outline" className={hasPackagingForm ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-700'}>
                                                        FOR Empaque: {hasPackagingForm ? 'Listo' : 'Pendiente'}
                                                    </Badge>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => openLotCenter(batch.id)}
                                                    >
                                                        Gestionar lote
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => downloadPackagingFormPdf(batch.id)}
                                                        disabled={!hasPackagingForm}
                                                        title={!hasPackagingForm ? 'Primero diligencia el FOR de empaque' : ''}
                                                    >
                                                        PDF FOR
                                                    </Button>
                                                    {isSerialMode ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleAddUnits(batch.id)}
                                                            disabled={batch.packagingStatus === 'packed' || !lotExecutionEnabled}
                                                            title={!lotExecutionEnabled ? lotExecutionDisabledReason : ''}
                                                        >
                                                            + Unidades
                                                        </Button>
                                                    ) : null}
                                                </div>
                                            </div>
                                                );
                                            })()}

                                            {(() => {
                                                const units = batch.units ?? [];
                                                const hasUnits = units.length > 0;
                                                const allUnitsQcPassed = hasUnits ? units.every((u) => u.rejected || u.qcPassed) : true;
                                                const hasPackagingForm = Boolean(batch.packagingFormCompleted);
                                                const canPackBatch = batch.qcStatus === 'passed'
                                                    && batch.packagingStatus !== 'packed'
                                                    && hasPackagingForm
                                                    && allUnitsQcPassed;
                                                const packDisabledReason = batch.qcStatus !== 'passed'
                                                    ? 'Debes aprobar QC del lote antes de empacar.'
                                                    : !hasPackagingForm
                                                        ? 'Debes diligenciar el FOR de empaque antes de empacar.'
                                                    : !allUnitsQcPassed
                                                        ? 'Todas las unidades deben pasar QC antes de empacar el lote.'
                                                        : null;
                                                return !canPackBatch && packDisabledReason ? (
                                                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                                        {packDisabledReason}
                                                    </p>
                                                ) : null;
                                            })()}

                                            {isSerialMode && (batch.units ?? []).length > 0 ? (
                                                <div className="overflow-auto">
                                                    <table className="w-full text-xs">
                                                        <thead>
                                                            <tr className="border-b">
                                                                <th className="text-left p-1">Serial</th>
                                                                <th className="text-left p-1">QC</th>
                                                                <th className="text-left p-1">Empaque</th>
                                                                <th className="text-right p-1">Acciones</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {(batch.units ?? []).map((unit) => (
                                                                <tr key={unit.id} className="border-b">
                                                                    <td className="p-1">{unit.serialCode}</td>
                                                                    <td className="p-1">{unit.qcPassed ? 'OK' : 'Pendiente'}</td>
                                                                    <td className="p-1">{unit.packaged ? 'Empacada' : 'Pendiente'}</td>
                                                                    <td className="p-1 text-right space-x-1">
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            onClick={() => handleUnitQc(unit.id, true)}
                                                                            disabled={unit.qcPassed || !lotExecutionEnabled}
                                                                            title={!lotExecutionEnabled ? lotExecutionDisabledReason : ''}
                                                                        >
                                                                            QC
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            onClick={() => handleUnitPackaging(unit.id, true)}
                                                                            disabled={!unit.qcPassed || unit.packaged || !lotExecutionEnabled}
                                                                            title={!lotExecutionEnabled ? lotExecutionDisabledReason : ''}
                                                                        >
                                                                            Empacar
                                                                        </Button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : null}
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="procurement">
                    <Card>
                        <CardHeader>
                            <CardTitle>Análisis de Materiales</CardTitle>
                            <CardDescription>
                                Requerimientos de materia prima para esta orden y disponibilidad en inventario.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingReqs ? (
                                <div className="text-center py-8">Calculando requerimientos...</div>
                            ) : (
                                <ProductionRequirementsTable requirements={requirements} />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={Boolean(lotCenterBatchId)} onOpenChange={(open) => !open && setLotCenterBatchId(null)}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Centro de Lote {activeLotBatch ? `- ${activeLotBatch.code}` : ''}</DialogTitle>
                    </DialogHeader>
                    {lotCenterLoading ? (
                        <div className="py-6 text-sm text-slate-500">Cargando datos del lote...</div>
                    ) : (
                        <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                <div className={`rounded border px-2 py-1 ${lotStepStatus.form ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>1. FOR Empaque: {lotStepStatus.form ? 'Listo' : 'Pendiente'}</div>
                                <div className={`rounded border px-2 py-1 ${lotStepStatus.label ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>2. Etiqueta: {lotStepStatus.label ? 'Validada' : 'Pendiente'}</div>
                                <div className={`rounded border px-2 py-1 ${lotStepStatus.qc ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>3. QC: {lotStepStatus.qc ? 'Aprobado' : 'Pendiente'}</div>
                                <div className={`rounded border px-2 py-1 ${lotStepStatus.packed ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>4. Empaque: {lotStepStatus.packed ? 'Empacado' : 'Pendiente'}</div>
                                <div className={`rounded border px-2 py-1 ${lotStepStatus.qa ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>5. QA: {lotStepStatus.qa ? 'Liberado' : 'Pendiente'}</div>
                            </div>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Paso 1: FOR de Empaque</CardTitle>
                                </CardHeader>
                                <CardContent className="flex items-center gap-2">
                                    <Button variant="outline" onClick={() => activeLotBatch && openPackagingFormDialog(activeLotBatch.id)}>
                                        {lotStepStatus.form ? 'Editar FOR' : 'Diligenciar FOR'}
                                    </Button>
                                    <Button variant="outline" onClick={() => activeLotBatch && downloadPackagingFormPdf(activeLotBatch.id)} disabled={!lotStepStatus.form}>Descargar PDF FOR</Button>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Paso 2: Etiqueta regulatoria de lote</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <input className="h-10 rounded-md border border-input bg-background px-3 text-sm" placeholder="Nombre producto" value={lotCenterLabel.productName} onChange={(e) => setLotCenterLabel((p) => ({ ...p, productName: e.target.value }))} />
                                    <input className="h-10 rounded-md border border-input bg-background px-3 text-sm" placeholder="Fabricante" value={lotCenterLabel.manufacturerName} onChange={(e) => setLotCenterLabel((p) => ({ ...p, manufacturerName: e.target.value }))} />
                                    <input className="h-10 rounded-md border border-input bg-background px-3 text-sm" placeholder="Registro INVIMA" value={lotCenterLabel.invimaRegistration} onChange={(e) => setLotCenterLabel((p) => ({ ...p, invimaRegistration: e.target.value }))} />
                                    <input className="h-10 rounded-md border border-input bg-background px-3 text-sm" placeholder="Código lote" value={lotCenterLabel.lotCode} onChange={(e) => setLotCenterLabel((p) => ({ ...p, lotCode: e.target.value }))} />
                                    <input type="date" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={lotCenterLabel.manufactureDate} onChange={(e) => setLotCenterLabel((p) => ({ ...p, manufactureDate: e.target.value }))} />
                                    <input type="date" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={lotCenterLabel.expirationDate} onChange={(e) => setLotCenterLabel((p) => ({ ...p, expirationDate: e.target.value }))} />
                                    <div className="md:col-span-2 flex justify-end gap-2">
                                        <Button variant="outline" onClick={() => activeLotBatch && downloadLabelPdf(activeLotBatch.id)} disabled={!lotStepStatus.label}>
                                            PDF Etiquetado
                                        </Button>
                                        <Button onClick={saveLotLabel} disabled={lotCenterSavingLabel || !lotStepStatus.form}>
                                            {lotCenterSavingLabel ? 'Guardando etiqueta...' : 'Guardar y validar etiqueta'}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Paso 4 y 5: Checklist y liberación QA</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                        <label className="flex items-center gap-2"><input type="checkbox" checked={lotStepStatus.qc} disabled />QC aprobado (automático)</label>
                                        <label className="flex items-center gap-2"><input type="checkbox" checked={lotCenterChecklist.labelingValidated} onChange={(e) => setLotCenterChecklist((p) => ({ ...p, labelingValidated: e.target.checked }))} />Etiquetado validado</label>
                                        <label className="flex items-center gap-2"><input type="checkbox" checked={lotCenterChecklist.documentsCurrent} onChange={(e) => setLotCenterChecklist((p) => ({ ...p, documentsCurrent: e.target.checked }))} />Documentación vigente</label>
                                        <label className="flex items-center gap-2"><input type="checkbox" checked={lotCenterChecklist.evidencesComplete} onChange={(e) => setLotCenterChecklist((p) => ({ ...p, evidencesComplete: e.target.checked }))} />Evidencias completas</label>
                                    </div>
                                    <textarea className="min-h-[64px] rounded-md border border-input bg-background px-3 py-2 text-sm w-full" placeholder="Notas checklist" value={lotCenterChecklist.checklistNotes} onChange={(e) => setLotCenterChecklist((p) => ({ ...p, checklistNotes: e.target.value }))} />
                                    <textarea className="min-h-[64px] rounded-md border border-input bg-background px-3 py-2 text-sm w-full" placeholder="Motivo rechazo (opcional)" value={lotCenterChecklist.rejectedReason} onChange={(e) => setLotCenterChecklist((p) => ({ ...p, rejectedReason: e.target.value }))} />
                                    <div className="flex flex-wrap gap-2 justify-end">
                                        <Button variant="outline" onClick={() => activeLotBatch && handleBatchQc(activeLotBatch.id, true)} disabled={!lotStepStatus.form || !lotStepStatus.label || lotStepStatus.qc}>
                                            Aprobar QC
                                        </Button>
                                        <Button variant="outline" onClick={() => activeLotBatch && handleBatchPackaging(activeLotBatch.id, true)} disabled={!lotStepStatus.form || !lotStepStatus.label || !lotStepStatus.qc || lotStepStatus.packed}>
                                            Ejecutar empaque
                                        </Button>
                                        <Button variant="outline" onClick={saveLotChecklist} disabled={lotCenterSavingChecklist || !lotStepStatus.packed}>
                                            {lotCenterSavingChecklist ? 'Guardando checklist...' : 'Guardar checklist QA'}
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                                        <input
                                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                            value={lotCenterSignature}
                                            onChange={(e) => setLotCenterSignature(e.target.value)}
                                            placeholder="Firma digital"
                                        />
                                        <Button onClick={signLotRelease} disabled={lotCenterSigning || !lotStepStatus.packed || !checklistReadyForSign}>
                                            {lotCenterSigning ? 'Firmando...' : 'Firmar liberación QA'}
                                        </Button>
                                    </div>
                                    <div className="flex justify-end">
                                        <Button variant="outline" onClick={() => activeLotBatch && downloadBatchReleasePdf(activeLotBatch.id)} disabled={!lotCenterRelease}>
                                            PDF Liberación QA
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={handleNextLotStep} disabled={lotCenterLoading || nextLotStep === 'done'}>
                            {nextLotStepLabel}
                        </Button>
                        <Button variant="outline" onClick={() => setLotCenterBatchId(null)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(packagingFormBatchId)} onOpenChange={(open) => !open && closePackagingFormDialog()}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>FOR de Empaque por Lote</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-1 max-h-[65vh] overflow-y-auto">
                        <div className="space-y-1">
                            <Label>Operario</Label>
                            <input
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full"
                                value={packagingForm.operatorName}
                                onChange={(e) => setPackagingForm((prev) => ({ ...prev, operatorName: e.target.value }))}
                                placeholder="Nombre del operario"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Verificador</Label>
                            <input
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full"
                                value={packagingForm.verifierName}
                                onChange={(e) => setPackagingForm((prev) => ({ ...prev, verifierName: e.target.value }))}
                                placeholder="Nombre del verificador"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Cantidad a empacar</Label>
                            <input
                                type="number"
                                min={1}
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full"
                                value={packagingForm.quantityToPack}
                                onChange={(e) => setPackagingForm((prev) => ({ ...prev, quantityToPack: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Cantidad empacada</Label>
                            <input
                                type="number"
                                min={0}
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full"
                                value={packagingForm.quantityPacked}
                                onChange={(e) => setPackagingForm((prev) => ({ ...prev, quantityPacked: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <Label>Etiqueta de lote</Label>
                            <input
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full"
                                value={packagingForm.lotLabel}
                                onChange={(e) => setPackagingForm((prev) => ({ ...prev, lotLabel: e.target.value }))}
                                placeholder="Ej: LOTE-20260224"
                            />
                        </div>
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <label className="flex items-center gap-2"><input type="checkbox" checked={packagingForm.hasTechnicalSheet} onChange={(e) => setPackagingForm((prev) => ({ ...prev, hasTechnicalSheet: e.target.checked }))} />Ficha técnica disponible</label>
                            <label className="flex items-center gap-2"><input type="checkbox" checked={packagingForm.hasLabels} onChange={(e) => setPackagingForm((prev) => ({ ...prev, hasLabels: e.target.checked }))} />Etiquetas disponibles</label>
                            <label className="flex items-center gap-2"><input type="checkbox" checked={packagingForm.hasPackagingMaterial} onChange={(e) => setPackagingForm((prev) => ({ ...prev, hasPackagingMaterial: e.target.checked }))} />Material de empaque disponible</label>
                            <label className="flex items-center gap-2"><input type="checkbox" checked={packagingForm.hasTools} onChange={(e) => setPackagingForm((prev) => ({ ...prev, hasTools: e.target.checked }))} />Herramientas listas</label>
                            <label className="flex items-center gap-2 md:col-span-2"><input type="checkbox" checked={packagingForm.inventoryRecorded} onChange={(e) => setPackagingForm((prev) => ({ ...prev, inventoryRecorded: e.target.checked }))} />Registro en inventario realizado</label>
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <Label>Observaciones</Label>
                            <textarea
                                className="min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm w-full"
                                value={packagingForm.observations}
                                onChange={(e) => setPackagingForm((prev) => ({ ...prev, observations: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <Label>No conformidad (si aplica)</Label>
                            <textarea
                                className="min-h-[70px] rounded-md border border-input bg-background px-3 py-2 text-sm w-full"
                                value={packagingForm.nonConformity}
                                onChange={(e) => setPackagingForm((prev) => ({ ...prev, nonConformity: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Acción correctiva</Label>
                            <textarea
                                className="min-h-[70px] rounded-md border border-input bg-background px-3 py-2 text-sm w-full"
                                value={packagingForm.correctiveAction}
                                onChange={(e) => setPackagingForm((prev) => ({ ...prev, correctiveAction: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Acción preventiva</Label>
                            <textarea
                                className="min-h-[70px] rounded-md border border-input bg-background px-3 py-2 text-sm w-full"
                                value={packagingForm.preventiveAction}
                                onChange={(e) => setPackagingForm((prev) => ({ ...prev, preventiveAction: e.target.value }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={closePackagingFormDialog}>
                            Cancelar
                        </Button>
                        <Button onClick={submitPackagingForm} disabled={savingPackagingForm}>
                            {savingPackagingForm ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                'Guardar FOR'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Finalizar Orden de Producción</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <p className="text-sm text-slate-500">
                            ¿Estás seguro de finalizar esta orden? Los productos terminados se agregarán al inventario.
                        </p>
                        <div className="grid gap-2">
                            <Label htmlFor="warehouse">Almacén de Destino</Label>
                            <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar almacén (Opcional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    {warehouses.map((w) => (
                                        <SelectItem key={w.id} value={w.id}>
                                            {w.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-400">
                                Si no selecciona uno, se usará el Almacén Principal.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCompleteDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleComplete} disabled={submitting}>
                            {submitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Finalizando...
                                </>
                            ) : (
                                'Confirmar y Finalizar'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
