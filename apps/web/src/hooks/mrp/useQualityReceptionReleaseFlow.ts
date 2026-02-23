import { useState } from 'react';
import { DocumentApprovalMethod, IncomingInspectionResult } from '@scaffold/types';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import {
    useIncomingInspectionsQuery,
    useBatchReleasesQuery,
    useResolveIncomingInspectionMutation,
    useCorrectIncomingInspectionCostMutation,
    useUpsertBatchReleaseChecklistMutation,
    useSignBatchReleaseMutation,
} from '@/hooks/mrp/useQuality';

export const useQualityReceptionReleaseFlow = () => {
    const { toast } = useToast();
    const { data: incomingInspectionsData, loading: loadingIncomingInspections } = useIncomingInspectionsQuery();
    const { data: batchReleasesData, loading: loadingBatchReleases } = useBatchReleasesQuery();
    const { execute: resolveIncomingInspection } = useResolveIncomingInspectionMutation();
    const { execute: correctIncomingInspectionCost } = useCorrectIncomingInspectionCostMutation();
    const { execute: upsertBatchReleaseChecklist, loading: savingBatchReleaseChecklist } = useUpsertBatchReleaseChecklistMutation();
    const { execute: signBatchRelease, loading: signingBatchRelease } = useSignBatchReleaseMutation();

    const [batchReleaseForm, setBatchReleaseForm] = useState({
        productionBatchId: '',
        qcApproved: false,
        labelingValidated: false,
        documentsCurrent: false,
        evidencesComplete: false,
        checklistNotes: '',
        rejectedReason: '',
    });

    const incomingInspections = incomingInspectionsData ?? [];
    const batchReleases = batchReleasesData ?? [];

    const quickResolveIncomingInspection = async (id: string, quantityReceived: number) => {
        try {
            const resultRaw = window.prompt(
                'Resultado de inspección (aprobado, condicional, rechazado)',
                IncomingInspectionResult.APROBADO
            );
            if (!resultRaw) return;
            if (!Object.values(IncomingInspectionResult).includes(resultRaw as IncomingInspectionResult)) {
                toast({ title: 'Error', description: 'Resultado de inspección inválido', variant: 'destructive' });
                return;
            }

            const acceptedRaw = window.prompt('Cantidad aceptada', String(quantityReceived));
            if (acceptedRaw === null) return;
            const quantityAccepted = Number(acceptedRaw);
            if (Number.isNaN(quantityAccepted) || quantityAccepted < 0) {
                toast({ title: 'Error', description: 'Cantidad aceptada inválida', variant: 'destructive' });
                return;
            }
            const quantityRejected = Number((quantityReceived - quantityAccepted).toFixed(4));
            if (quantityRejected < 0) {
                toast({ title: 'Error', description: 'La cantidad aceptada no puede exceder la recibida', variant: 'destructive' });
                return;
            }

            const supplierLotCode = window.prompt('Lote del proveedor (opcional)') || undefined;
            const certificateRef = window.prompt('Referencia de certificado (opcional)') || undefined;
            const notes = window.prompt('Notas de inspección (opcional)') || undefined;
            const acceptedUnitCostRaw = window.prompt('Costo unitario real aceptado (opcional, para corregir costo promedio)');
            const acceptedUnitCost = acceptedUnitCostRaw && acceptedUnitCostRaw.trim().length > 0
                ? Number(acceptedUnitCostRaw)
                : undefined;
            if (acceptedUnitCostRaw && acceptedUnitCostRaw.trim().length > 0 && (Number.isNaN(acceptedUnitCost) || (acceptedUnitCost ?? 0) < 0)) {
                toast({ title: 'Error', description: 'Costo unitario aceptado inválido', variant: 'destructive' });
                return;
            }

            await resolveIncomingInspection({
                id,
                inspectionResult: resultRaw as IncomingInspectionResult,
                supplierLotCode,
                certificateRef,
                notes,
                quantityAccepted,
                quantityRejected,
                acceptedUnitCost,
                actor: 'sistema-web',
            });
            toast({ title: 'Inspección resuelta', description: 'La recepción fue liberada/rechazada correctamente.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo resolver la inspección'), variant: 'destructive' });
        }
    };

    const quickCorrectIncomingInspectionCost = async (id: string) => {
        try {
            const acceptedUnitCostRaw = window.prompt('Nuevo costo unitario real aceptado');
            if (acceptedUnitCostRaw === null) return;
            const acceptedUnitCost = Number(acceptedUnitCostRaw);
            if (Number.isNaN(acceptedUnitCost) || acceptedUnitCost <= 0) {
                toast({ title: 'Error', description: 'Costo unitario corregido inválido', variant: 'destructive' });
                return;
            }

            const reason = window.prompt('Motivo de corrección (trazabilidad de auditoría)');
            if (!reason || reason.trim().length < 5) {
                toast({ title: 'Error', description: 'Debes indicar un motivo de al menos 5 caracteres', variant: 'destructive' });
                return;
            }

            await correctIncomingInspectionCost({
                id,
                acceptedUnitCost,
                reason: reason.trim(),
                actor: 'sistema-web',
            });

            toast({ title: 'Costo corregido', description: 'Se actualizó el costo aceptado y se registró auditoría.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo corregir el costo de recepción'), variant: 'destructive' });
        }
    };

    const handleUpsertBatchReleaseChecklist = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!batchReleaseForm.productionBatchId) {
            toast({ title: 'Error', description: 'Debes indicar el ID del lote', variant: 'destructive' });
            return;
        }
        try {
            await upsertBatchReleaseChecklist({
                productionBatchId: batchReleaseForm.productionBatchId.trim(),
                qcApproved: batchReleaseForm.qcApproved,
                labelingValidated: batchReleaseForm.labelingValidated,
                documentsCurrent: batchReleaseForm.documentsCurrent,
                evidencesComplete: batchReleaseForm.evidencesComplete,
                checklistNotes: batchReleaseForm.checklistNotes || undefined,
                rejectedReason: batchReleaseForm.rejectedReason || undefined,
                actor: 'sistema-web',
            });
            toast({ title: 'Checklist guardado', description: 'La liberación quedó actualizada.' });
            setBatchReleaseForm((prev) => ({ ...prev, checklistNotes: '', rejectedReason: '' }));
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo guardar checklist de liberación'), variant: 'destructive' });
        }
    };

    const quickSignBatchRelease = async (productionBatchId: string) => {
        try {
            const approvalSignature = window.prompt('Firma de aprobación QA (nombre completo o identificador)');
            if (!approvalSignature) return;

            const methodRaw = window.prompt(
                'Método de firma (firma_manual, firma_digital)',
                DocumentApprovalMethod.FIRMA_MANUAL
            );
            if (!methodRaw) return;

            if (!Object.values(DocumentApprovalMethod).includes(methodRaw as DocumentApprovalMethod)) {
                toast({ title: 'Error', description: 'Método de firma inválido', variant: 'destructive' });
                return;
            }

            await signBatchRelease({
                productionBatchId,
                actor: 'sistema-web',
                approvalMethod: methodRaw as DocumentApprovalMethod,
                approvalSignature,
            });
            toast({ title: 'Lote liberado', description: 'La liberación QA quedó firmada.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo firmar la liberación QA'), variant: 'destructive' });
        }
    };

    return {
        incomingInspections,
        batchReleases,
        batchReleaseForm,
        setBatchReleaseForm,
        loadingIncomingInspections,
        loadingBatchReleases,
        savingBatchReleaseChecklist,
        signingBatchRelease,
        quickResolveIncomingInspection,
        quickCorrectIncomingInspectionCost,
        handleUpsertBatchReleaseChecklist,
        quickSignBatchRelease,
    };
};
