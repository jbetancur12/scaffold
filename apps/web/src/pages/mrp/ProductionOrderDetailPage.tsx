import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    BatchDhrExpedient,
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

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ArrowLeft, Printer, Play, CheckCircle, Truck, Loader2, Factory, FileText, Package, Layers, AlertTriangle, TrendingDown, Boxes, Save } from 'lucide-react';
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
    useReturnProductionMaterialMutation,
    useUpdateProductionBatchPackagingMutation,
    useUpdateProductionBatchQcMutation,
    useUpdateProductionBatchUnitPackagingMutation,
    useUpdateProductionBatchUnitQcMutation,
    useUpdateProductionOrderStatusMutation,
    useUpsertProductionMaterialAllocationMutation,
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
    const [lotCenterDhr, setLotCenterDhr] = useState<BatchDhrExpedient | null>(null);
    const [returnMaterialId, setReturnMaterialId] = useState<string>('');
    const [returnLotId, setReturnLotId] = useState<string>('');
    const [returnQuantity, setReturnQuantity] = useState<string>('0');
    const [returnNotes, setReturnNotes] = useState<string>('');

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
    const { execute: upsertMaterialAllocation, loading: savingMaterialAllocation } = useUpsertProductionMaterialAllocationMutation();
    const { execute: returnMaterial, loading: returningMaterial } = useReturnProductionMaterialMutation();

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

    const handleAssignMaterialLot = async (input: { rawMaterialId: string; lotId?: string; quantityRequested?: number }) => {
        if (!id) return;
        try {
            await upsertMaterialAllocation({ orderId: id, payload: input });
            toast({ title: 'Asignación guardada', description: 'Se actualizó el lote asignado para este material.' });
            await reloadOrder({ force: true });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo guardar asignación de lote'), variant: 'destructive' });
        }
    };

    const returnableMaterials = useMemo(
        () => requirements.filter((row) => (row.pepsLots?.length || 0) > 0),
        [requirements]
    );
    const selectedReturnMaterial = useMemo(
        () => returnableMaterials.find((row) => row.material.id === returnMaterialId),
        [returnableMaterials, returnMaterialId]
    );
    const returnableLots = selectedReturnMaterial?.pepsLots || [];

    const submitMaterialReturn = async () => {
        if (!id) return;
        const qty = Number(returnQuantity || 0);
        if (!returnMaterialId || !returnLotId) {
            toast({ title: 'Faltan datos', description: 'Selecciona materia prima y lote para registrar devolución.', variant: 'destructive' });
            return;
        }
        if (qty <= 0) {
            toast({ title: 'Cantidad inválida', description: 'La cantidad a devolver debe ser mayor a 0.', variant: 'destructive' });
            return;
        }
        try {
            await returnMaterial({
                orderId: id,
                payload: {
                    rawMaterialId: returnMaterialId,
                    lotId: returnLotId,
                    quantity: qty,
                    notes: returnNotes.trim() || undefined,
                    actor: 'sistema-web',
                },
            });
            toast({ title: 'Devolución registrada', description: 'Se creó movimiento kardex de entrada por devolución.' });
            setReturnQuantity('0');
            setReturnNotes('');
            await reloadOrder({ force: true });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo registrar devolución de materia prima'), variant: 'destructive' });
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

    const downloadDhrExport = async (batchId: string, formatType: 'json' | 'csv' = 'json') => {
        try {
            const file = await mrpApi.exportBatchDhr(batchId, formatType, 'sistema-web');
            const blob = new Blob([file.content], {
                type: formatType === 'json' ? 'application/json' : 'text/csv;charset=utf-8',
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = file.fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo exportar el DHR del lote'), variant: 'destructive' });
        }
    };

    const downloadDhrPdf = async (batchId: string) => {
        try {
            const blob = await mrpApi.getBatchDhrPdf(batchId, 'sistema-web');
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `DHR-${batchId.slice(0, 8).toUpperCase()}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo descargar el DHR en PDF'), variant: 'destructive' });
        }
    };

    const openLotCenter = async (batchId: string) => {
        const batch = batches.find((b) => b.id === batchId);
        if (!batch) return;
        setLotCenterBatchId(batchId);
        setLotCenterLoading(true);
        try {
            const [labels, releases, dhr] = await Promise.all([
                mrpApi.listRegulatoryLabels({ productionBatchId: batchId, scopeType: RegulatoryLabelScopeType.LOTE }),
                mrpApi.listBatchReleases({ productionBatchId: batchId }),
                mrpApi.getBatchDhr(batchId, 'sistema-web'),
            ]);
            const lotLabel = labels.find((row) => row.scopeType === RegulatoryLabelScopeType.LOTE) || null;
            const release = releases[0] || null;
            setLotCenterLotLabel(lotLabel);
            setLotCenterRelease(release);
            setLotCenterDhr(dhr);
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
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/20 to-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-slate-400">
                    <div className="animate-spin h-8 w-8 border-4 border-slate-200 border-t-violet-600 rounded-full" />
                    <p className="font-medium animate-pulse text-sm">Cargando orden...</p>
                </div>
            </div>
        );
    }

    if (!order) {
        return <div className="p-8 text-slate-500 italic">Orden no encontrada</div>;
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

    const formatShortDate = (value?: string | Date | null) => {
        if (!value) return '—';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '—';
        return format(date, 'dd/MM/yyyy');
    };

    const lotTimeline = [
        { key: 'for', label: 'FOR Empaque', done: lotStepStatus.form },
        { key: 'label', label: 'Etiquetado', done: lotStepStatus.label },
        { key: 'qc', label: 'QC', done: lotStepStatus.qc },
        { key: 'pack', label: 'Empaque', done: lotStepStatus.packed },
        { key: 'qa', label: 'Liberación QA', done: lotStepStatus.qa },
    ];

    const lotDocumentSnapshots = [
        {
            key: 'packaging',
            title: 'FOR Empaque',
            code: activeLotBatch?.packagingFormDocumentCode,
            version: activeLotBatch?.packagingFormDocumentVersion,
            date: activeLotBatch?.packagingFormDocumentDate,
            status: lotStepStatus.form ? 'Listo' : 'Pendiente',
        },
        {
            key: 'labeling',
            title: 'FOR Etiquetado',
            code: lotCenterLotLabel?.documentControlCode,
            version: lotCenterLotLabel?.documentControlVersion,
            date: lotCenterLotLabel?.documentControlDate,
            status: lotStepStatus.label ? 'Validado' : 'Pendiente',
        },
        {
            key: 'release',
            title: 'FOR Liberación QA',
            code: lotCenterRelease?.documentControlCode,
            version: lotCenterRelease?.documentControlVersion,
            date: lotCenterRelease?.documentControlDate,
            status: lotStepStatus.qa ? 'Firmado' : 'Pendiente',
        },
    ];

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

    const statusCfgDetail = {
        [ProductionOrderStatus.DRAFT]: { label: 'Borrador', classes: 'bg-slate-50 text-slate-600 border-slate-200' },
        [ProductionOrderStatus.PLANNED]: { label: 'Planificada', classes: 'bg-blue-50 text-blue-700 border-blue-200' },
        [ProductionOrderStatus.IN_PROGRESS]: { label: 'En Progreso', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
        [ProductionOrderStatus.COMPLETED]: { label: 'Completada', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        [ProductionOrderStatus.CANCELLED]: { label: 'Cancelada', classes: 'bg-red-50 text-red-600 border-red-200' },
    };
    const currentStatusCfg = statusCfgDetail[order.status] ?? statusCfgDetail[ProductionOrderStatus.DRAFT];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/20 to-slate-50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Hero Header */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-6 relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-50/40 to-transparent pointer-events-none" />
                        <div className="relative">
                            <Button
                                variant="ghost"
                                onClick={() => navigate('/mrp/production-orders')}
                                className="mb-4 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Volver a Órdenes
                            </Button>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-violet-50 rounded-2xl ring-1 ring-violet-100 shadow-sm shrink-0">
                                        <Factory className="h-7 w-7 text-violet-600" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-mono">{order.code}</h1>
                                            <Badge variant="outline" className={`font-semibold ring-1 ring-inset ${currentStatusCfg.classes}`}>
                                                {currentStatusCfg.label}
                                            </Badge>
                                        </div>
                                        <p className="text-slate-500 mt-1 text-sm">Detalle y gestión de la orden de producción.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {order.status === ProductionOrderStatus.DRAFT && (
                                        <Button onClick={() => handleStatusChange(ProductionOrderStatus.PLANNED)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium h-10 px-5">
                                            <Truck className="mr-2 h-4 w-4" />
                                            Planificar
                                        </Button>
                                    )}
                                    {order.status === ProductionOrderStatus.PLANNED && (
                                        <Button onClick={() => handleStatusChange(ProductionOrderStatus.IN_PROGRESS)} className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium h-10 px-5">
                                            <Play className="mr-2 h-4 w-4" />
                                            Iniciar Producción
                                        </Button>
                                    )}
                                    {order.status === ProductionOrderStatus.IN_PROGRESS && (
                                        <Button onClick={() => handleStatusChange(ProductionOrderStatus.COMPLETED)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium h-10 px-5">
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Finalizar
                                        </Button>
                                    )}
                                    <Button variant="outline" size="icon" className="rounded-xl border-slate-200 h-10 w-10">
                                        <Printer className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <Tabs defaultValue="details" className="w-full">
                    <TabsList className="bg-white border border-slate-200 rounded-2xl p-1 h-auto shadow-sm">
                        <TabsTrigger value="details" className="rounded-xl data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-sm font-medium px-5 py-2">Detalles</TabsTrigger>
                        <TabsTrigger value="procurement" className="rounded-xl data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-sm font-medium px-5 py-2">Aprovisionamiento</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="space-y-5 mt-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-violet-500" />
                                    <h2 className="font-semibold text-slate-800">Información General</h2>
                                </div>
                                <div className="p-6 grid grid-cols-2 gap-y-3 text-sm">
                                    <span className="text-slate-500 font-medium">Fecha Inicio</span>
                                    <span className="text-slate-800">{order.startDate ? format(new Date(order.startDate), 'dd/MM/yyyy') : <span className="italic text-slate-400">—</span>}</span>
                                    <span className="text-slate-500 font-medium">Fecha Fin</span>
                                    <span className="text-slate-800">{order.endDate ? format(new Date(order.endDate), 'dd/MM/yyyy') : <span className="italic text-slate-400">—</span>}</span>
                                    <span className="text-slate-500 font-medium col-span-2 mt-2 border-t border-slate-100 pt-3">Notas</span>
                                    <span className="col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-700 text-xs leading-relaxed">
                                        {order.notes || <span className="italic text-slate-400">Sin notas</span>}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                                    <Package className="h-4 w-4 text-violet-500" />
                                    <h2 className="font-semibold text-slate-800">Ítems a Producir</h2>
                                </div>
                                <div className="p-6 space-y-3">
                                    {order.items?.map((item) => {
                                        const populatedItem = item as ProductionOrderItem & { variant?: ProductVariant & { product?: Product } };
                                        return (
                                            <div key={item.id} className="flex justify-between items-center bg-slate-50 rounded-xl px-4 py-3">
                                                <div>
                                                    <div className="font-semibold text-slate-800 text-sm">{populatedItem.variant?.product?.name} <span className="text-slate-400 mx-1">·</span> {populatedItem.variant?.name}</div>
                                                    <div className="text-xs text-slate-400 mt-0.5 font-mono">{populatedItem.variant?.sku}</div>
                                                </div>
                                                <span className="font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-3 py-1 text-sm shrink-0">
                                                    {item.quantity} un.
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100">
                                <div className="flex items-center gap-2 mb-1">
                                    <Layers className="h-4 w-4 text-violet-500" />
                                    <h2 className="font-semibold text-slate-800">Trazabilidad por Lotes</h2>
                                </div>
                                <p className="text-xs text-slate-500">Crea lotes, controla QC y empaque. La orden solo se puede finalizar cuando todos los lotes estén liberados. {!isSerialMode ? 'Modo activo: lote.' : ''}</p>
                            </div>
                            <div className="p-6 space-y-4">
                                {!lotExecutionEnabled ? (
                                    <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                                        <AlertTriangle className="h-4 w-4 shrink-0" />
                                        QC y empaque se habilitan cuando la orden esté en "En Progreso".
                                    </div>
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
                                        <div className="text-center py-8 text-slate-400">
                                            <Boxes className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                            <p className="text-sm">Sin lotes registrados. Crea el primero arriba.</p>
                                        </div>
                                    ) : (
                                        batches.map((batch) => (
                                            <div key={batch.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 hover:border-violet-200 transition-colors">
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
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="procurement" className="mt-5">
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                                <TrendingDown className="h-4 w-4 text-violet-500" />
                                <h2 className="font-semibold text-slate-800">Análisis de Materiales</h2>
                                <p className="text-xs text-slate-400 ml-2">Requerimientos y disponibilidad en inventario.</p>
                            </div>
                            <div className="p-6">
                                <div className="mb-5 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-800">Devolución de sobrantes a bodega (Kardex)</h3>
                                        <p className="text-xs text-slate-500">Registra devoluciones reales de MP consumida para mantener trazabilidad INVIMA por OP/lote.</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                                        <Select
                                            value={returnMaterialId}
                                            onValueChange={(value) => {
                                                setReturnMaterialId(value);
                                                setReturnLotId('');
                                            }}
                                        >
                                            <SelectTrigger className="md:col-span-2">
                                                <SelectValue placeholder="Materia prima" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {returnableMaterials.map((row) => (
                                                    <SelectItem key={row.material.id} value={row.material.id}>
                                                        {row.material.name} ({row.material.sku})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select value={returnLotId} onValueChange={setReturnLotId} disabled={!selectedReturnMaterial}>
                                            <SelectTrigger className="md:col-span-2">
                                                <SelectValue placeholder="Lote MP" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {returnableLots.map((lot) => (
                                                    <SelectItem key={lot.lotId} value={lot.lotId}>
                                                        {lot.lotCode} · {lot.warehouseName}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <input
                                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                            type="number"
                                            min={0.0001}
                                            step={0.0001}
                                            value={returnQuantity}
                                            onChange={(e) => setReturnQuantity(e.target.value)}
                                            placeholder="Cantidad"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                                        <input
                                            className="h-10 rounded-md border border-input bg-background px-3 text-sm md:col-span-4"
                                            value={returnNotes}
                                            onChange={(e) => setReturnNotes(e.target.value)}
                                            placeholder="Observación devolución (opcional)"
                                        />
                                        <Button onClick={submitMaterialReturn} disabled={returningMaterial}>
                                            {returningMaterial ? 'Registrando...' : 'Registrar devolución'}
                                        </Button>
                                    </div>
                                </div>
                                {loadingReqs ? (
                                    <div className="flex items-center justify-center py-12 text-slate-400">
                                        <div className="animate-spin mr-3 h-6 w-6 border-4 border-slate-200 border-t-violet-600 rounded-full" />
                                        <span className="text-sm animate-pulse">Calculando requerimientos...</span>
                                    </div>
                                ) : (
                                    <ProductionRequirementsTable
                                        requirements={requirements}
                                        onAssignLot={handleAssignMaterialLot}
                                        savingAllocation={savingMaterialAllocation}
                                    />
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
            <div>

                <Dialog open={Boolean(lotCenterBatchId)} onOpenChange={(open) => {
                    if (!open) {
                        setLotCenterBatchId(null);
                        setLotCenterDhr(null);
                    }
                }}>
                    <DialogContent className="max-w-4xl">
                        <DialogHeader className="pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-violet-50 rounded-xl">
                                    <Layers className="h-5 w-5 text-violet-600" />
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-bold text-slate-900 font-mono">
                                        Centro de Lote{activeLotBatch ? ` — ${activeLotBatch.code}` : ''}
                                    </DialogTitle>
                                    <p className="text-xs text-slate-500 mt-0.5">Flujo de liberación: FOR → Etiqueta → QC → Empaque → QA</p>
                                </div>
                            </div>
                        </DialogHeader>

                        {lotCenterLoading ? (
                            <div className="flex items-center justify-center py-12 text-slate-400">
                                <div className="animate-spin mr-3 h-6 w-6 border-4 border-slate-200 border-t-violet-600 rounded-full" />
                                <span className="text-sm animate-pulse">Cargando datos del lote...</span>
                            </div>
                        ) : (
                            <div className="space-y-5 max-h-[72vh] overflow-y-auto pr-1 py-2">
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-800">Trazabilidad E2E del lote</h3>
                                            <p className="text-xs text-slate-500">Consulta el estado completo sin salir de esta vista.</p>
                                        </div>
                                        <div className="text-xs text-slate-500 font-mono">
                                            OP: {order.code} · Lote: {activeLotBatch?.code || '—'}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <Button size="sm" variant="outline" className="rounded-xl border-slate-200" onClick={() => setLotCenterBatchId(null)}>
                                            Volver al detalle OP
                                        </Button>
                                        <Button size="sm" variant="outline" className="rounded-xl border-slate-200" onClick={() => navigate('/mrp/inventory')}>
                                            Ver inventario / Kardex
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="rounded-xl border-slate-200"
                                            onClick={() => activeLotBatch && downloadPackagingFormPdf(activeLotBatch.id)}
                                            disabled={!lotStepStatus.form}
                                        >
                                            PDF FOR Empaque
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="rounded-xl border-slate-200"
                                            onClick={() => activeLotBatch && downloadLabelPdf(activeLotBatch.id)}
                                            disabled={!lotStepStatus.label}
                                        >
                                            PDF Etiquetado
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="rounded-xl border-slate-200"
                                            onClick={() => activeLotBatch && downloadBatchReleasePdf(activeLotBatch.id)}
                                            disabled={!lotCenterRelease}
                                        >
                                            PDF Liberación QA
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="rounded-xl border-slate-200"
                                            onClick={() => activeLotBatch && downloadDhrPdf(activeLotBatch.id)}
                                            disabled={!lotCenterDhr}
                                        >
                                            PDF DHR
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="rounded-xl border-slate-200"
                                            onClick={() => activeLotBatch && downloadDhrExport(activeLotBatch.id, 'json')}
                                            disabled={!lotCenterDhr}
                                        >
                                            Exportar DHR
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                        {lotDocumentSnapshots.map((doc) => (
                                            <div key={doc.key} className="bg-white border border-slate-200 rounded-xl p-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{doc.title}</p>
                                                    <Badge variant="outline" className={doc.status === 'Pendiente' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}>
                                                        {doc.status}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm font-mono text-slate-900 mt-2">{doc.code || 'Sin documento'}</p>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Versión: {doc.version ? `v${doc.version}` : '—'} · Fecha: {formatShortDate(doc.date)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                                            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Origen (Recepción / OC)</p>
                                            {(lotCenterDhr?.materials || []).length === 0 ? (
                                                <p className="text-xs text-slate-500">Sin materias primas registradas en DHR.</p>
                                            ) : (
                                                <div className="space-y-2 max-h-52 overflow-auto pr-1">
                                                    {lotCenterDhr?.materials.map((material) => (
                                                        <div key={material.rawMaterialId} className="border border-slate-100 rounded-lg p-2">
                                                            <p className="text-xs font-semibold text-slate-800">
                                                                {material.rawMaterialName} <span className="text-slate-400">({material.rawMaterialSku})</span>
                                                            </p>
                                                            {material.latestInspection ? (
                                                                <p className="text-xs text-slate-600 mt-1">
                                                                    Recepción: {formatShortDate(material.latestInspection.inspectedAt)} · Resultado: {material.latestInspection.inspectionResult || 'N/A'}
                                                                    {material.latestInspection.purchaseOrderId ? (
                                                                        <>
                                                                            {' '}· OC:{' '}
                                                                            <button
                                                                                type="button"
                                                                                className="underline text-violet-700 hover:text-violet-900"
                                                                                onClick={() => navigate(`/mrp/purchase-orders/${material.latestInspection?.purchaseOrderId}`)}
                                                                            >
                                                                                {material.latestInspection.purchaseOrderCode || `OC-${material.latestInspection.purchaseOrderId.slice(0, 8).toUpperCase()}`}
                                                                            </button>
                                                                        </>
                                                                    ) : null}
                                                                </p>
                                                            ) : (
                                                                <p className="text-xs text-amber-700 mt-1">Sin recepción liberada detectada.</p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                                            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Despacho</p>
                                            {(lotCenterDhr?.shipments || []).length === 0 ? (
                                                <p className="text-xs text-slate-500">Lote aún no despachado.</p>
                                            ) : (
                                                <div className="space-y-2 max-h-52 overflow-auto pr-1">
                                                    {lotCenterDhr?.shipments.map((shipment) => (
                                                        <div key={shipment.id} className="border border-slate-100 rounded-lg p-2">
                                                            <p className="text-xs font-semibold text-slate-800">
                                                                {shipment.customer?.name || 'Cliente'} · {shipment.commercialDocument}
                                                            </p>
                                                            <p className="text-xs text-slate-600 mt-1">
                                                                Fecha: {formatShortDate(shipment.shippedAt)} · Ítems: {shipment.items.length}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                                        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Kardex MP (consumo/devolución OP)</p>
                                        {(lotCenterDhr?.materialMovements || []).length === 0 ? (
                                            <p className="text-xs text-slate-500">Sin movimientos kardex vinculados a esta OP.</p>
                                        ) : (
                                            <div className="space-y-2 max-h-44 overflow-auto pr-1">
                                                {lotCenterDhr?.materialMovements.map((movement) => (
                                                    <div key={movement.id} className="border border-slate-100 rounded-lg p-2">
                                                        <p className="text-xs font-semibold text-slate-800">
                                                            {movement.rawMaterialName} <span className="text-slate-400">({movement.rawMaterialSku})</span>
                                                        </p>
                                                        <p className="text-xs text-slate-600 mt-1">
                                                            {formatShortDate(movement.occurredAt)} · {movement.movementType} · Qty {Number(movement.quantity).toLocaleString('es-CO')}
                                                            {' '}· Saldo lote {Number(movement.balanceAfter).toLocaleString('es-CO')}
                                                        </p>
                                                        <p className="text-xs text-slate-500 mt-1">
                                                            Lote: {movement.supplierLotCode || 'N/A'} · Bodega: {movement.warehouseName || 'N/A'}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Progress stepper */}
                                <div className="grid grid-cols-5 gap-2">
                                    {lotTimeline.map(({ key, label, done }, index) => (
                                        <div key={key} className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-center transition-all ${done ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${done ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                {done ? '✓' : index + 1}
                                            </div>
                                            <span className={`text-xs font-semibold leading-tight ${done ? 'text-emerald-700' : 'text-slate-500'}`}>{label}</span>
                                            <span className={`text-[10px] font-medium ${done ? 'text-emerald-600' : 'text-slate-400'}`}>{done ? 'Listo' : 'Pendiente'}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Paso 1: FOR */}
                                <div className={`bg-white border rounded-2xl overflow-hidden ${lotStepStatus.form ? 'border-emerald-100' : 'border-slate-200'}`}>
                                    <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${lotStepStatus.form ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                            {lotStepStatus.form ? '✓' : '1'}
                                        </div>
                                        <h3 className="font-semibold text-slate-800 text-sm">FOR de Empaque</h3>
                                        {lotStepStatus.form && <span className="ml-auto text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Completo</span>}
                                    </div>
                                    <div className="px-5 py-4 flex flex-wrap items-center gap-2">
                                        <Button
                                            variant={lotStepStatus.form ? 'outline' : 'default'}
                                            onClick={() => activeLotBatch && openPackagingFormDialog(activeLotBatch.id)}
                                            className={lotStepStatus.form ? 'rounded-xl border-slate-200' : 'bg-violet-600 hover:bg-violet-700 text-white rounded-xl'}
                                        >
                                            <Package className="mr-2 h-4 w-4" />
                                            {lotStepStatus.form ? 'Editar FOR' : 'Diligenciar FOR'}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => activeLotBatch && downloadPackagingFormPdf(activeLotBatch.id)}
                                            disabled={!lotStepStatus.form}
                                            className="rounded-xl border-slate-200"
                                        >
                                            <Printer className="mr-2 h-4 w-4" />
                                            PDF FOR
                                        </Button>
                                    </div>
                                </div>

                                {/* Paso 2: Etiqueta */}
                                <div className={`bg-white border rounded-2xl overflow-hidden ${lotStepStatus.label ? 'border-emerald-100' : 'border-slate-200'}`}>
                                    <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${lotStepStatus.label ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                            {lotStepStatus.label ? '✓' : '2'}
                                        </div>
                                        <h3 className="font-semibold text-slate-800 text-sm">Etiqueta Regulatoria de Lote</h3>
                                        {lotStepStatus.label && <span className="ml-auto text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Validada</span>}
                                    </div>
                                    <div className="px-5 py-4 space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {[
                                                { placeholder: 'Nombre producto', key: 'productName' as const },
                                                { placeholder: 'Fabricante', key: 'manufacturerName' as const },
                                                { placeholder: 'Registro INVIMA', key: 'invimaRegistration' as const },
                                                { placeholder: 'Código lote', key: 'lotCode' as const, mono: true },
                                            ].map(({ placeholder, key, mono }) => (
                                                <input
                                                    key={key}
                                                    className={`h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-violet-500 ${mono ? 'font-mono' : ''}`}
                                                    placeholder={placeholder}
                                                    value={lotCenterLabel[key]}
                                                    onChange={(e) => setLotCenterLabel((p) => ({ ...p, [key]: e.target.value }))}
                                                />
                                            ))}
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-slate-500">Fecha fabricación</label>
                                                <input type="date" className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-violet-500" value={lotCenterLabel.manufactureDate} onChange={(e) => setLotCenterLabel((p) => ({ ...p, manufactureDate: e.target.value }))} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-slate-500">Fecha vencimiento</label>
                                                <input type="date" className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-violet-500" value={lotCenterLabel.expirationDate} onChange={(e) => setLotCenterLabel((p) => ({ ...p, expirationDate: e.target.value }))} />
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                                            <Button
                                                variant="outline"
                                                onClick={() => activeLotBatch && downloadLabelPdf(activeLotBatch.id)}
                                                disabled={!lotStepStatus.label}
                                                className="rounded-xl border-slate-200"
                                            >
                                                <Printer className="mr-2 h-4 w-4" />
                                                PDF Etiquetado
                                            </Button>
                                            <Button
                                                onClick={saveLotLabel}
                                                disabled={lotCenterSavingLabel || !lotStepStatus.form}
                                                className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium"
                                            >
                                                {lotCenterSavingLabel ? (
                                                    <>
                                                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                                                        Guardando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="mr-2 h-4 w-4" />
                                                        Guardar y validar etiqueta
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Pasos 3, 4 y 5: QC, Empaque, Checklist QA */}
                                <div className={`bg-white border rounded-2xl overflow-hidden ${lotStepStatus.qa ? 'border-emerald-100' : 'border-slate-200'}`}>
                                    <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${lotStepStatus.qa ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                            {lotStepStatus.qa ? '✓' : '3–5'}
                                        </div>
                                        <h3 className="font-semibold text-slate-800 text-sm">QC · Empaque · Liberación QA</h3>
                                    </div>
                                    <div className="px-5 py-4 space-y-4">
                                        {/* Checklist */}
                                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {[
                                                { key: 'qc_auto', label: 'QC aprobado (automático)', checked: lotStepStatus.qc, disabled: true },
                                                { key: 'labelingValidated', label: 'Etiquetado validado', checked: lotCenterChecklist.labelingValidated, onChange: (v: boolean) => setLotCenterChecklist((p) => ({ ...p, labelingValidated: v })) },
                                                { key: 'documentsCurrent', label: 'Documentación vigente', checked: lotCenterChecklist.documentsCurrent, onChange: (v: boolean) => setLotCenterChecklist((p) => ({ ...p, documentsCurrent: v })) },
                                                { key: 'evidencesComplete', label: 'Evidencias completas', checked: lotCenterChecklist.evidencesComplete, onChange: (v: boolean) => setLotCenterChecklist((p) => ({ ...p, evidencesComplete: v })) },
                                            ].map(({ key, label, checked, disabled, onChange }) => (
                                                <label key={key} className={`flex items-center gap-3 select-none ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                                                    <div
                                                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300 bg-white'}`}
                                                        onClick={() => !disabled && onChange && onChange(!checked)}
                                                    >
                                                        {checked && <CheckCircle className="h-3 w-3 text-white" />}
                                                    </div>
                                                    <input type="checkbox" className="sr-only" checked={checked} disabled={disabled} onChange={(e) => !disabled && onChange && onChange(e.target.checked)} />
                                                    <span className="text-sm text-slate-700">{label}</span>
                                                </label>
                                            ))}
                                        </div>

                                        {/* Notas */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Notas checklist</label>
                                                <textarea
                                                    className="min-h-[72px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm w-full resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                                                    placeholder="Notas adicionales..."
                                                    value={lotCenterChecklist.checklistNotes}
                                                    onChange={(e) => setLotCenterChecklist((p) => ({ ...p, checklistNotes: e.target.value }))}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Motivo de rechazo <span className="normal-case text-slate-400">(opcional)</span></label>
                                                <textarea
                                                    className="min-h-[72px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm w-full resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                                                    placeholder="Motivo de rechazo..."
                                                    value={lotCenterChecklist.rejectedReason}
                                                    onChange={(e) => setLotCenterChecklist((p) => ({ ...p, rejectedReason: e.target.value }))}
                                                />
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                variant="outline"
                                                onClick={() => activeLotBatch && handleBatchQc(activeLotBatch.id, true)}
                                                disabled={!lotStepStatus.form || !lotStepStatus.label || lotStepStatus.qc}
                                                className={`rounded-xl ${lotStepStatus.qc ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-slate-200'}`}
                                            >
                                                <CheckCircle className="mr-2 h-4 w-4" />
                                                {lotStepStatus.qc ? 'QC Aprobado' : 'Aprobar QC'}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => activeLotBatch && handleBatchPackaging(activeLotBatch.id, true)}
                                                disabled={!lotStepStatus.form || !lotStepStatus.label || !lotStepStatus.qc || lotStepStatus.packed}
                                                className={`rounded-xl ${lotStepStatus.packed ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-slate-200'}`}
                                            >
                                                <Boxes className="mr-2 h-4 w-4" />
                                                {lotStepStatus.packed ? 'Empacado' : 'Ejecutar empaque'}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={saveLotChecklist}
                                                disabled={lotCenterSavingChecklist || !lotStepStatus.packed}
                                                className="rounded-xl border-slate-200"
                                            >
                                                {lotCenterSavingChecklist ? 'Guardando...' : 'Guardar checklist QA'}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => activeLotBatch && downloadBatchReleasePdf(activeLotBatch.id)}
                                                disabled={!lotCenterRelease}
                                                className="rounded-xl border-slate-200 ml-auto"
                                            >
                                                <Printer className="mr-2 h-4 w-4" />
                                                PDF Liberación QA
                                            </Button>
                                        </div>

                                        {/* Firma digital */}
                                        <div className="flex items-end gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                                            <div className="flex-1 space-y-1.5">
                                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Firma digital</label>
                                                <input
                                                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                                                    value={lotCenterSignature}
                                                    onChange={(e) => setLotCenterSignature(e.target.value)}
                                                    placeholder="Firma digital (responsable QA)"
                                                />
                                            </div>
                                            <Button
                                                onClick={signLotRelease}
                                                disabled={lotCenterSigning || !lotStepStatus.packed || !checklistReadyForSign}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium h-10 px-5 shrink-0"
                                            >
                                                {lotCenterSigning ? (
                                                    <>
                                                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                                                        Firmando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle className="mr-2 h-4 w-4" />
                                                        Firmar liberación QA
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <DialogFooter className="pt-4 border-t border-slate-100 flex gap-2">
                            <Button
                                onClick={handleNextLotStep}
                                disabled={lotCenterLoading || nextLotStep === 'done'}
                                className={`rounded-xl font-medium ${nextLotStep === 'done' ? 'bg-emerald-600 text-white' : 'bg-violet-600 hover:bg-violet-700 text-white'}`}
                            >
                                {nextLotStep === 'done' ? (
                                    <>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Lote Completo
                                    </>
                                ) : nextLotStepLabel}
                            </Button>
                            <Button variant="outline" onClick={() => setLotCenterBatchId(null)} className="rounded-xl border-slate-200">
                                Cerrar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>


                <Dialog open={Boolean(packagingFormBatchId)} onOpenChange={(open) => !open && closePackagingFormDialog()}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader className="pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-violet-50 rounded-xl">
                                    <Package className="h-5 w-5 text-violet-600" />
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-bold text-slate-900">FOR de Empaque por Lote</DialogTitle>
                                    <p className="text-xs text-slate-500 mt-0.5">Diligencia el formato de empaque para este lote de producción.</p>
                                </div>
                            </div>
                        </DialogHeader>
                        <div className="max-h-[65vh] overflow-y-auto pr-1 space-y-5 py-2">
                            {/* Personal */}
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Personal</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-sm font-medium text-slate-700">Operario</Label>
                                        <input
                                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-violet-500"
                                            value={packagingForm.operatorName}
                                            onChange={(e) => setPackagingForm((prev) => ({ ...prev, operatorName: e.target.value }))}
                                            placeholder="Nombre del operario"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-sm font-medium text-slate-700">Verificador</Label>
                                        <input
                                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-violet-500"
                                            value={packagingForm.verifierName}
                                            onChange={(e) => setPackagingForm((prev) => ({ ...prev, verifierName: e.target.value }))}
                                            placeholder="Nombre del verificador"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Cantidades */}
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Cantidades</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-sm font-medium text-slate-700">A empacar</Label>
                                        <input
                                            type="number" min={1}
                                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-violet-500"
                                            value={packagingForm.quantityToPack}
                                            onChange={(e) => setPackagingForm((prev) => ({ ...prev, quantityToPack: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-sm font-medium text-slate-700">Empacada</Label>
                                        <input
                                            type="number" min={0}
                                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-violet-500"
                                            value={packagingForm.quantityPacked}
                                            onChange={(e) => setPackagingForm((prev) => ({ ...prev, quantityPacked: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-sm font-medium text-slate-700">Etiqueta de lote</Label>
                                        <input
                                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm w-full font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                                            value={packagingForm.lotLabel}
                                            onChange={(e) => setPackagingForm((prev) => ({ ...prev, lotLabel: e.target.value }))}
                                            placeholder="Ej: LOTE-20260224"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Checklist */}
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Verificación previa</p>
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {[
                                        { key: 'hasTechnicalSheet', label: 'Ficha técnica disponible' },
                                        { key: 'hasLabels', label: 'Etiquetas disponibles' },
                                        { key: 'hasPackagingMaterial', label: 'Material de empaque disponible' },
                                        { key: 'hasTools', label: 'Herramientas listas' },
                                        { key: 'inventoryRecorded', label: 'Registro en inventario realizado', full: true },
                                    ].map(({ key, label, full }) => {
                                        const checked = packagingForm[key as keyof typeof packagingForm] as boolean;
                                        return (
                                            <label key={key} className={`flex items-center gap-3 cursor-pointer select-none ${full ? 'md:col-span-2' : ''}`}>
                                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-violet-600 border-violet-600' : 'border-slate-300 bg-white'}`}
                                                    onClick={() => setPackagingForm((prev) => ({ ...prev, [key]: !checked }))}
                                                >
                                                    {checked && <CheckCircle className="h-3 w-3 text-white" />}
                                                </div>
                                                <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => setPackagingForm((prev) => ({ ...prev, [key]: e.target.checked }))} />
                                                <span className="text-sm text-slate-700">{label}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Observaciones y no conformidades */}
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Observaciones y no conformidades</p>
                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-sm font-medium text-slate-700">Observaciones</Label>
                                        <textarea
                                            className="min-h-[72px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm w-full resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                                            value={packagingForm.observations}
                                            onChange={(e) => setPackagingForm((prev) => ({ ...prev, observations: e.target.value }))}
                                            placeholder="Observaciones generales..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-sm font-medium text-slate-700">No conformidad</Label>
                                            <textarea
                                                className="min-h-[72px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm w-full resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                                                value={packagingForm.nonConformity}
                                                onChange={(e) => setPackagingForm((prev) => ({ ...prev, nonConformity: e.target.value }))}
                                                placeholder="Descripción (si aplica)"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-sm font-medium text-slate-700">Acción correctiva</Label>
                                            <textarea
                                                className="min-h-[72px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm w-full resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                                                value={packagingForm.correctiveAction}
                                                onChange={(e) => setPackagingForm((prev) => ({ ...prev, correctiveAction: e.target.value }))}
                                                placeholder="Acción tomada..."
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-sm font-medium text-slate-700">Acción preventiva</Label>
                                            <textarea
                                                className="min-h-[72px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm w-full resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                                                value={packagingForm.preventiveAction}
                                                onChange={(e) => setPackagingForm((prev) => ({ ...prev, preventiveAction: e.target.value }))}
                                                placeholder="Acción preventiva..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="pt-4 border-t border-slate-100 flex gap-2">
                            <Button variant="outline" onClick={closePackagingFormDialog} className="rounded-xl border-slate-200 text-slate-600">
                                Cancelar
                            </Button>
                            <Button
                                onClick={submitPackagingForm}
                                disabled={savingPackagingForm}
                                className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium px-6"
                            >
                                {savingPackagingForm ? (
                                    <>
                                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Guardar FOR
                                    </>
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
            </div >
        </div>

    );
}
