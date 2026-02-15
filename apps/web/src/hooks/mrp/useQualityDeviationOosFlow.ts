import { useState } from 'react';
import { OosCaseStatus, OosDisposition, ProcessDeviationStatus } from '@scaffold/types';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import {
    useCreateOosCaseMutation,
    useCreateProcessDeviationMutation,
    useOosCasesQuery,
    useProcessDeviationsQuery,
    useUpdateOosCaseMutation,
    useUpdateProcessDeviationMutation,
} from '@/hooks/mrp/useQuality';

export const useQualityDeviationOosFlow = () => {
    const { toast } = useToast();
    const { data: processDeviationsData, loading: loadingProcessDeviations } = useProcessDeviationsQuery();
    const { data: oosCasesData, loading: loadingOosCases } = useOosCasesQuery();
    const { execute: createProcessDeviation, loading: creatingProcessDeviation } = useCreateProcessDeviationMutation();
    const { execute: updateProcessDeviation } = useUpdateProcessDeviationMutation();
    const { execute: createOosCase, loading: creatingOosCase } = useCreateOosCaseMutation();
    const { execute: updateOosCase } = useUpdateOosCaseMutation();

    const [processDeviationForm, setProcessDeviationForm] = useState({
        title: '',
        description: '',
        classification: 'proceso',
        productionBatchId: '',
        containmentAction: '',
        investigationSummary: '',
        capaActionId: '',
    });
    const [oosCaseForm, setOosCaseForm] = useState({
        testName: '',
        resultValue: '',
        specification: '',
        productionBatchId: '',
        investigationSummary: '',
        capaActionId: '',
    });

    const processDeviations = processDeviationsData ?? [];
    const oosCases = oosCasesData ?? [];

    const handleCreateProcessDeviation = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createProcessDeviation({
                title: processDeviationForm.title,
                description: processDeviationForm.description,
                classification: processDeviationForm.classification || undefined,
                productionBatchId: processDeviationForm.productionBatchId || undefined,
                containmentAction: processDeviationForm.containmentAction || undefined,
                investigationSummary: processDeviationForm.investigationSummary || undefined,
                capaActionId: processDeviationForm.capaActionId || undefined,
                actor: 'sistema-web',
            });
            setProcessDeviationForm({
                title: '',
                description: '',
                classification: 'proceso',
                productionBatchId: '',
                containmentAction: '',
                investigationSummary: '',
                capaActionId: '',
            });
            toast({ title: 'Desviación registrada', description: 'Caso abierto y trazado en auditoría.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo registrar la desviación'), variant: 'destructive' });
        }
    };

    const quickCloseProcessDeviation = async (id: string) => {
        try {
            const investigationSummary = window.prompt('Resumen de investigación');
            if (!investigationSummary) return;
            const closureEvidence = window.prompt('Evidencia de cierre');
            if (!closureEvidence) return;
            await updateProcessDeviation({
                id,
                status: ProcessDeviationStatus.CERRADA,
                investigationSummary,
                closureEvidence,
                actor: 'sistema-web',
            });
            toast({ title: 'Desviación cerrada', description: 'Se registró evidencia de cierre.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo cerrar la desviación'), variant: 'destructive' });
        }
    };

    const handleCreateOosCase = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createOosCase({
                testName: oosCaseForm.testName,
                resultValue: oosCaseForm.resultValue,
                specification: oosCaseForm.specification,
                productionBatchId: oosCaseForm.productionBatchId || undefined,
                investigationSummary: oosCaseForm.investigationSummary || undefined,
                capaActionId: oosCaseForm.capaActionId || undefined,
                actor: 'sistema-web',
            });
            setOosCaseForm({
                testName: '',
                resultValue: '',
                specification: '',
                productionBatchId: '',
                investigationSummary: '',
                capaActionId: '',
            });
            toast({ title: 'Caso OOS registrado', description: 'El lote queda bloqueado hasta disposición QA.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo registrar el caso OOS'), variant: 'destructive' });
        }
    };

    const quickCloseOosCase = async (id: string) => {
        try {
            const decisionNotes = window.prompt('Notas de decisión QA');
            if (!decisionNotes) return;
            const dispositionRaw = window.prompt('Disposición (reprocesar, descartar, uso_condicional, liberar)', 'liberar');
            if (!dispositionRaw) return;
            if (!Object.values(OosDisposition).includes(dispositionRaw as OosDisposition)) {
                toast({ title: 'Error', description: 'Disposición inválida', variant: 'destructive' });
                return;
            }

            await updateOosCase({
                id,
                status: OosCaseStatus.CERRADO,
                disposition: dispositionRaw as OosDisposition,
                decisionNotes,
                actor: 'sistema-web',
            });
            toast({ title: 'Caso OOS cerrado', description: 'Se registró disposición y decisión QA.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo cerrar el caso OOS'), variant: 'destructive' });
        }
    };

    return {
        processDeviations,
        oosCases,
        processDeviationForm,
        oosCaseForm,
        setProcessDeviationForm,
        setOosCaseForm,
        loadingProcessDeviations,
        loadingOosCases,
        creatingProcessDeviation,
        creatingOosCase,
        handleCreateProcessDeviation,
        handleCreateOosCase,
        quickCloseProcessDeviation,
        quickCloseOosCase,
    };
};
