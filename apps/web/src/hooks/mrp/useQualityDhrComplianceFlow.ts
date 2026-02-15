import { useState } from 'react';
import {
    DocumentProcess,
    QualityRiskControlStatus,
} from '@scaffold/types';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import {
    useDmrTemplatesQuery,
    useBatchDhrQuery,
    useCreateDmrTemplateMutation,
    useComplianceDashboardQuery,
    useExportBatchDhrMutation,
    useExportComplianceMutation,
    useRiskControlsQuery,
    useCreateRiskControlMutation,
    useTrainingEvidenceQuery,
    useCreateTrainingEvidenceMutation,
} from '@/hooks/mrp/useQuality';

export const useQualityDhrComplianceFlow = () => {
    const { toast } = useToast();

    const { data: dmrTemplatesData, loading: loadingDmrTemplates } = useDmrTemplatesQuery();
    const { data: complianceDashboardData, loading: loadingComplianceDashboard } = useComplianceDashboardQuery();
    const { data: riskControlsData, loading: loadingRiskControls } = useRiskControlsQuery();
    const { data: trainingEvidenceData, loading: loadingTrainingEvidence } = useTrainingEvidenceQuery();

    const { execute: createDmrTemplate, loading: creatingDmrTemplate } = useCreateDmrTemplateMutation();
    const { execute: exportCompliance, loading: exportingCompliance } = useExportComplianceMutation();
    const { execute: exportBatchDhr, loading: exportingBatchDhr } = useExportBatchDhrMutation();
    const { execute: createRiskControl, loading: creatingRiskControl } = useCreateRiskControlMutation();
    const { execute: createTrainingEvidence, loading: creatingTrainingEvidence } = useCreateTrainingEvidenceMutation();

    const [dmrTemplateForm, setDmrTemplateForm] = useState({
        productId: '',
        process: DocumentProcess.PRODUCCION,
        code: '',
        title: '',
        version: 1,
        sections: '',
        requiredEvidence: '',
    });
    const [dhrBatchId, setDhrBatchId] = useState('');
    const [riskControlForm, setRiskControlForm] = useState({
        process: DocumentProcess.PRODUCCION,
        risk: '',
        control: '',
        ownerRole: '',
        status: QualityRiskControlStatus.ACTIVO,
        evidenceRef: '',
    });
    const [trainingForm, setTrainingForm] = useState({
        role: '',
        personName: '',
        trainingTopic: '',
        completedAt: '',
        validUntil: '',
        trainerName: '',
        evidenceRef: '',
    });

    const dmrTemplates = dmrTemplatesData ?? [];
    const complianceDashboard = complianceDashboardData;
    const riskControls = riskControlsData ?? [];
    const trainingEvidence = trainingEvidenceData ?? [];
    const { data: batchDhrData, loading: loadingBatchDhr } = useBatchDhrQuery(dhrBatchId || undefined, 'sistema-web');

    const handleCreateDmrTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        const sections = dmrTemplateForm.sections.split('\n').map((v) => v.trim()).filter(Boolean);
        if (sections.length === 0) {
            toast({ title: 'Error', description: 'Debes agregar al menos una seccion DMR', variant: 'destructive' });
            return;
        }
        const requiredEvidence = dmrTemplateForm.requiredEvidence
            .split('\n')
            .map((v) => v.trim())
            .filter(Boolean);
        try {
            await createDmrTemplate({
                productId: dmrTemplateForm.productId || undefined,
                process: dmrTemplateForm.process,
                code: dmrTemplateForm.code,
                title: dmrTemplateForm.title,
                version: Number(dmrTemplateForm.version) || 1,
                sections,
                requiredEvidence,
                createdBy: 'sistema-web',
            });
            setDmrTemplateForm({
                productId: '',
                process: DocumentProcess.PRODUCCION,
                code: '',
                title: '',
                version: 1,
                sections: '',
                requiredEvidence: '',
            });
            toast({ title: 'Plantilla DMR creada', description: 'Plantilla disponible para expediente de lote.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo crear la plantilla DMR'), variant: 'destructive' });
        }
    };

    const handleExportBatchDhr = async (format: 'csv' | 'json') => {
        if (!dhrBatchId) {
            toast({ title: 'Error', description: 'Indica el ID del lote para exportar', variant: 'destructive' });
            return;
        }
        try {
            const file = await exportBatchDhr({
                productionBatchId: dhrBatchId,
                format,
                actor: 'sistema-web',
            });
            const blob = new Blob([file.content], { type: format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', file.fileName.replace(/[:]/g, '-'));
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            toast({ title: 'DHR exportado', description: `Archivo ${format.toUpperCase()} descargado.` });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo exportar el DHR'), variant: 'destructive' });
        }
    };

    const handleExportCompliance = async (format: 'csv' | 'json') => {
        try {
            const file = await exportCompliance({ format });
            if (!file.content) {
                toast({ title: 'Error', description: 'No se pudo generar el archivo', variant: 'destructive' });
                return;
            }
            const blob = new Blob([file.content], { type: format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', file.fileName.replace(/[:]/g, '-'));
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            toast({ title: 'Exportable generado', description: `Archivo ${format.toUpperCase()} descargado.` });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo exportar cumplimiento'), variant: 'destructive' });
        }
    };

    const handleCreateRiskControl = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createRiskControl({
                process: riskControlForm.process,
                risk: riskControlForm.risk,
                control: riskControlForm.control,
                ownerRole: riskControlForm.ownerRole,
                status: riskControlForm.status,
                evidenceRef: riskControlForm.evidenceRef || undefined,
                actor: 'sistema-web',
            });
            setRiskControlForm({
                process: DocumentProcess.PRODUCCION,
                risk: '',
                control: '',
                ownerRole: '',
                status: QualityRiskControlStatus.ACTIVO,
                evidenceRef: '',
            });
            toast({ title: 'Riesgo/control creado', description: 'Matriz de riesgos actualizada.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo registrar el riesgo/control'), variant: 'destructive' });
        }
    };

    const handleCreateTrainingEvidence = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createTrainingEvidence({
                role: trainingForm.role,
                personName: trainingForm.personName,
                trainingTopic: trainingForm.trainingTopic,
                completedAt: trainingForm.completedAt,
                validUntil: trainingForm.validUntil || undefined,
                trainerName: trainingForm.trainerName || undefined,
                evidenceRef: trainingForm.evidenceRef || undefined,
                actor: 'sistema-web',
            });
            setTrainingForm({
                role: '',
                personName: '',
                trainingTopic: '',
                completedAt: '',
                validUntil: '',
                trainerName: '',
                evidenceRef: '',
            });
            toast({ title: 'Capacitacion registrada', description: 'Evidencia agregada correctamente.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo registrar la capacitacion'), variant: 'destructive' });
        }
    };

    return {
        dmrTemplates,
        batchDhrData,
        complianceDashboard,
        riskControls,
        trainingEvidence,
        dmrTemplateForm,
        dhrBatchId,
        riskControlForm,
        trainingForm,
        setDmrTemplateForm,
        setDhrBatchId,
        setRiskControlForm,
        setTrainingForm,
        loadingDmrTemplates,
        loadingBatchDhr,
        loadingComplianceDashboard,
        loadingRiskControls,
        loadingTrainingEvidence,
        creatingDmrTemplate,
        exportingCompliance,
        exportingBatchDhr,
        creatingRiskControl,
        creatingTrainingEvidence,
        handleCreateDmrTemplate,
        handleExportBatchDhr,
        handleExportCompliance,
        handleCreateRiskControl,
        handleCreateTrainingEvidence,
    };
};
