import { useState } from 'react';
import {
    ChangeApprovalDecision,
    ChangeControlStatus,
    ChangeControlType,
    ChangeImpactLevel,
} from '@scaffold/types';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import {
    useChangeControlsQuery,
    useCreateChangeControlApprovalMutation,
    useCreateChangeControlMutation,
    useUpdateChangeControlMutation,
} from '@/hooks/mrp/useQuality';

export const useQualityChangeControlFlow = () => {
    const { toast } = useToast();
    const { data: changeControlsData, loading: loadingChangeControls } = useChangeControlsQuery();
    const { execute: createChangeControl, loading: creatingChangeControl } = useCreateChangeControlMutation();
    const { execute: updateChangeControl } = useUpdateChangeControlMutation();
    const { execute: createChangeControlApproval, loading: creatingChangeControlApproval } = useCreateChangeControlApprovalMutation();

    const [changeControlForm, setChangeControlForm] = useState({
        title: '',
        description: '',
        type: ChangeControlType.PROCESO,
        impactLevel: ChangeImpactLevel.MEDIO,
        evaluationSummary: '',
        requestedBy: 'sistema-web',
        effectiveDate: '',
        linkedDocumentId: '',
        affectedProductionOrderId: '',
        affectedProductionBatchId: '',
        beforeChangeBatchCode: '',
        afterChangeBatchCode: '',
    });

    const changeControls = changeControlsData ?? [];

    const handleCreateChangeControl = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createChangeControl({
                ...changeControlForm,
                effectiveDate: changeControlForm.effectiveDate || undefined,
                linkedDocumentId: changeControlForm.linkedDocumentId || undefined,
                affectedProductionOrderId: changeControlForm.affectedProductionOrderId || undefined,
                affectedProductionBatchId: changeControlForm.affectedProductionBatchId || undefined,
                beforeChangeBatchCode: changeControlForm.beforeChangeBatchCode || undefined,
                afterChangeBatchCode: changeControlForm.afterChangeBatchCode || undefined,
                actor: 'sistema-web',
            });
            setChangeControlForm({
                title: '',
                description: '',
                type: ChangeControlType.PROCESO,
                impactLevel: ChangeImpactLevel.MEDIO,
                evaluationSummary: '',
                requestedBy: 'sistema-web',
                effectiveDate: '',
                linkedDocumentId: '',
                affectedProductionOrderId: '',
                affectedProductionBatchId: '',
                beforeChangeBatchCode: '',
                afterChangeBatchCode: '',
            });
            toast({ title: 'Cambio registrado', description: 'Solicitud de cambio creada en estado borrador.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo crear el control de cambio'), variant: 'destructive' });
        }
    };

    const quickApproveChangeControl = async (id: string) => {
        try {
            await updateChangeControl({ id, status: ChangeControlStatus.APROBADO, actor: 'sistema-web' });
            toast({ title: 'Cambio aprobado', description: 'Cambio marcado como aprobado.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo aprobar el cambio'), variant: 'destructive' });
        }
    };

    const quickAddApproval = async (changeControlId: string) => {
        try {
            const role = window.prompt('Rol aprobador (ej: QA, Producción, Regulatorio)', 'QA');
            if (!role) return;
            const decisionRaw = window.prompt('Decisión (pendiente, aprobado, rechazado)', ChangeApprovalDecision.APROBADO);
            if (!decisionRaw) return;
            if (!Object.values(ChangeApprovalDecision).includes(decisionRaw as ChangeApprovalDecision)) {
                toast({ title: 'Error', description: 'Decisión inválida', variant: 'destructive' });
                return;
            }
            const decisionNotes = window.prompt('Notas de decisión (opcional)') || undefined;

            await createChangeControlApproval({
                changeControlId,
                role,
                decision: decisionRaw as ChangeApprovalDecision,
                decisionNotes,
                actor: 'sistema-web',
            });
            toast({ title: 'Aprobación registrada', description: 'Se actualizó la evaluación del cambio.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo registrar la aprobación'), variant: 'destructive' });
        }
    };

    return {
        changeControls,
        changeControlForm,
        setChangeControlForm,
        loadingChangeControls,
        creatingChangeControl,
        creatingChangeControlApproval,
        handleCreateChangeControl,
        quickApproveChangeControl,
        quickAddApproval,
    };
};
