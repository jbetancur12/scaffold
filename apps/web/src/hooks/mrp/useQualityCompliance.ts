import { useState } from 'react';
import {
    CapaStatus,
    DocumentApprovalMethod,
    DocumentProcess,
    NonConformityStatus,
    QualitySeverity,
    TechnovigilanceCaseType,
    TechnovigilanceCausality,
    TechnovigilanceSeverity,
    TechnovigilanceStatus,
    TechnovigilanceReportChannel,
    RecallScopeType,
    RecallNotificationChannel,
    RecallNotificationStatus,
    QualityRiskControlStatus,
} from '@scaffold/types';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import {
    useCapasQuery,
    useControlledDocumentsQuery,
    useCreateControlledDocumentMutation,
    useCreateCapaMutation,
    useCreateNonConformityMutation,
    useCreateTechnovigilanceCaseMutation,
    useNonConformitiesQuery,
    useQualityAuditQuery,
    useTechnovigilanceCasesQuery,
    useSubmitControlledDocumentMutation,
    useApproveControlledDocumentMutation,
    useUpdateCapaMutation,
    useUpdateNonConformityMutation,
    useUpdateTechnovigilanceCaseMutation,
    useReportTechnovigilanceCaseMutation,
    useRecallCasesQuery,
    useCreateRecallCaseMutation,
    useUpdateRecallProgressMutation,
    useCreateRecallNotificationMutation,
    useUpdateRecallNotificationMutation,
    useCloseRecallCaseMutation,
    useComplianceDashboardQuery,
    useExportComplianceMutation,
    useRiskControlsQuery,
    useCreateRiskControlMutation,
    useTrainingEvidenceQuery,
    useCreateTrainingEvidenceMutation,
} from '@/hooks/mrp/useQuality';
import { useQualityRegulatoryFlow } from '@/hooks/mrp/useQualityRegulatoryFlow';
import { useQualityReceptionReleaseFlow } from '@/hooks/mrp/useQualityReceptionReleaseFlow';

export const useQualityCompliance = () => {
    const { toast } = useToast();
    const regulatoryFlow = useQualityRegulatoryFlow();
    const receptionReleaseFlow = useQualityReceptionReleaseFlow();

    const { data: nonConformitiesData, loading: loadingNc } = useNonConformitiesQuery();
    const { data: capasData, loading: loadingCapas } = useCapasQuery();
    const { data: auditData, loading: loadingAudit } = useQualityAuditQuery();
    const { data: technovigilanceData, loading: loadingTechno } = useTechnovigilanceCasesQuery();
    const { data: recallsData, loading: loadingRecalls } = useRecallCasesQuery();
    const { data: complianceDashboardData, loading: loadingComplianceDashboard } = useComplianceDashboardQuery();
    const { data: riskControlsData, loading: loadingRiskControls } = useRiskControlsQuery();
    const { data: trainingEvidenceData, loading: loadingTrainingEvidence } = useTrainingEvidenceQuery();
    const { data: documentsData, loading: loadingDocuments } = useControlledDocumentsQuery();

    const { execute: createNc, loading: creatingNc } = useCreateNonConformityMutation();
    const { execute: updateNc } = useUpdateNonConformityMutation();
    const { execute: createCapa, loading: creatingCapa } = useCreateCapaMutation();
    const { execute: updateCapa } = useUpdateCapaMutation();
    const { execute: createDocument, loading: creatingDocument } = useCreateControlledDocumentMutation();
    const { execute: submitDocument, loading: submittingDocument } = useSubmitControlledDocumentMutation();
    const { execute: approveDocument, loading: approvingDocument } = useApproveControlledDocumentMutation();
    const { execute: createTechnoCase, loading: creatingTechnoCase } = useCreateTechnovigilanceCaseMutation();
    const { execute: updateTechnoCase } = useUpdateTechnovigilanceCaseMutation();
    const { execute: reportTechnoCase } = useReportTechnovigilanceCaseMutation();
    const { execute: createRecallCase, loading: creatingRecall } = useCreateRecallCaseMutation();
    const { execute: updateRecallProgress } = useUpdateRecallProgressMutation();
    const { execute: createRecallNotification } = useCreateRecallNotificationMutation();
    const { execute: updateRecallNotification } = useUpdateRecallNotificationMutation();
    const { execute: closeRecallCase } = useCloseRecallCaseMutation();
    const { execute: exportCompliance, loading: exportingCompliance } = useExportComplianceMutation();
    const { execute: createRiskControl, loading: creatingRiskControl } = useCreateRiskControlMutation();
    const { execute: createTrainingEvidence, loading: creatingTrainingEvidence } = useCreateTrainingEvidenceMutation();

    const [ncForm, setNcForm] = useState({
        title: '',
        description: '',
        severity: QualitySeverity.MEDIA,
        source: 'produccion',
    });
    const [capaForm, setCapaForm] = useState({
        nonConformityId: '',
        actionPlan: '',
        owner: '',
        dueDate: '',
    });
    const [documentForm, setDocumentForm] = useState({
        code: '',
        title: '',
        process: DocumentProcess.PRODUCCION,
        version: 1,
        content: '',
        effectiveDate: '',
        expiresAt: '',
    });
    const [technoForm, setTechnoForm] = useState({
        title: '',
        description: '',
        type: TechnovigilanceCaseType.QUEJA,
        severity: TechnovigilanceSeverity.MODERADA,
        causality: '' as '' | TechnovigilanceCausality,
        lotCode: '',
        serialCode: '',
    });
    const [recallForm, setRecallForm] = useState({
        title: '',
        reason: '',
        scopeType: RecallScopeType.LOTE,
        lotCode: '',
        serialCode: '',
        affectedQuantity: 1,
        isMock: false,
        targetResponseMinutes: '',
    });
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

    const nonConformities = nonConformitiesData ?? [];
    const capas = capasData ?? [];
    const audits = auditData ?? [];
    const technovigilanceCases = technovigilanceData ?? [];
    const recalls = recallsData ?? [];
    const complianceDashboard = complianceDashboardData;
    const riskControls = riskControlsData ?? [];
    const trainingEvidence = trainingEvidenceData ?? [];
    const documents = documentsData ?? [];
    const openNc = nonConformities.filter((n) => n.status !== NonConformityStatus.CERRADA);

    const handleCreateNc = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createNc(ncForm);
            setNcForm({ title: '', description: '', severity: QualitySeverity.MEDIA, source: 'produccion' });
            toast({ title: 'No conformidad creada', description: 'Registro creado correctamente.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo crear la no conformidad'), variant: 'destructive' });
        }
    };

    const handleCreateCapa = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!capaForm.nonConformityId) {
            toast({ title: 'Error', description: 'Selecciona una no conformidad', variant: 'destructive' });
            return;
        }
        try {
            await createCapa(capaForm);
            setCapaForm({ nonConformityId: '', actionPlan: '', owner: '', dueDate: '' });
            toast({ title: 'CAPA creada', description: 'Plan registrado correctamente.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo crear CAPA'), variant: 'destructive' });
        }
    };

    const quickCloseNc = async (id: string) => {
        try {
            await updateNc({ id, status: NonConformityStatus.CERRADA, actor: 'sistema-web' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo cerrar la no conformidad'), variant: 'destructive' });
        }
    };

    const quickCloseCapa = async (id: string) => {
        try {
            await updateCapa({ id, status: CapaStatus.CERRADA, actor: 'sistema-web' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo cerrar CAPA'), variant: 'destructive' });
        }
    };

    const handleCreateDocument = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createDocument({
                code: documentForm.code,
                title: documentForm.title,
                process: documentForm.process,
                version: documentForm.version,
                content: documentForm.content || undefined,
                effectiveDate: documentForm.effectiveDate || undefined,
                expiresAt: documentForm.expiresAt || undefined,
                actor: 'sistema-web',
            });
            setDocumentForm({
                code: '',
                title: '',
                process: DocumentProcess.PRODUCCION,
                version: 1,
                content: '',
                effectiveDate: '',
                expiresAt: '',
            });
            toast({ title: 'Documento creado', description: 'Documento controlado registrado en borrador.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo crear el documento'), variant: 'destructive' });
        }
    };

    const handleSubmitDocument = async (id: string) => {
        try {
            await submitDocument({ id, actor: 'sistema-web' });
            toast({ title: 'Documento enviado', description: 'Ahora está en revisión.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo enviar a revisión'), variant: 'destructive' });
        }
    };

    const handleApproveDocument = async (id: string) => {
        try {
            const approvalSignature = window.prompt('Firma de aprobación (nombre completo o identificador)');
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

            await approveDocument({
                id,
                actor: 'sistema-web',
                approvalMethod: methodRaw as DocumentApprovalMethod,
                approvalSignature,
            });
            toast({ title: 'Documento aprobado', description: 'Ya quedó vigente para su proceso.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo aprobar el documento'), variant: 'destructive' });
        }
    };

    const handleCreateTechnoCase = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createTechnoCase({
                title: technoForm.title,
                description: technoForm.description,
                type: technoForm.type,
                severity: technoForm.severity,
                causality: technoForm.causality || undefined,
                lotCode: technoForm.lotCode || undefined,
                serialCode: technoForm.serialCode || undefined,
                createdBy: 'sistema-web',
            });
            setTechnoForm({
                title: '',
                description: '',
                type: TechnovigilanceCaseType.QUEJA,
                severity: TechnovigilanceSeverity.MODERADA,
                causality: '',
                lotCode: '',
                serialCode: '',
            });
            toast({ title: 'Caso registrado', description: 'Caso de tecnovigilancia creado correctamente.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo crear el caso'), variant: 'destructive' });
        }
    };

    const quickSetTechnoStatus = async (id: string, status: TechnovigilanceStatus) => {
        try {
            await updateTechnoCase({ id, status, actor: 'sistema-web' });
            toast({ title: 'Caso actualizado', description: `Estado cambiado a ${status}.` });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo actualizar el caso'), variant: 'destructive' });
        }
    };

    const quickReportTechno = async (id: string) => {
        try {
            const reportNumber = window.prompt('Número de radicado INVIMA');
            if (!reportNumber) return;

            const channelRaw = window.prompt('Canal (invima_portal, email_oficial, otro)', TechnovigilanceReportChannel.INVIMA_PORTAL);
            if (!channelRaw) return;

            if (!Object.values(TechnovigilanceReportChannel).includes(channelRaw as TechnovigilanceReportChannel)) {
                toast({ title: 'Error', description: 'Canal de reporte inválido', variant: 'destructive' });
                return;
            }

            const reportPayloadRef = window.prompt('Referencia de soporte (opcional)') || undefined;

            await reportTechnoCase({
                id,
                reportNumber,
                reportChannel: channelRaw as TechnovigilanceReportChannel,
                reportPayloadRef,
                reportedAt: new Date().toISOString(),
                actor: 'sistema-web',
            });
            toast({ title: 'Reporte actualizado', description: 'Caso reportado a INVIMA con trazabilidad.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo reportar el caso a INVIMA'), variant: 'destructive' });
        }
    };

    const handleCreateRecall = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createRecallCase({
                title: recallForm.title,
                reason: recallForm.reason,
                scopeType: recallForm.scopeType,
                lotCode: recallForm.lotCode || undefined,
                serialCode: recallForm.serialCode || undefined,
                affectedQuantity: Number(recallForm.affectedQuantity),
                isMock: recallForm.isMock,
                targetResponseMinutes: recallForm.targetResponseMinutes ? Number(recallForm.targetResponseMinutes) : undefined,
                actor: 'sistema-web',
            });
            setRecallForm({
                title: '',
                reason: '',
                scopeType: RecallScopeType.LOTE,
                lotCode: '',
                serialCode: '',
                affectedQuantity: 1,
                isMock: false,
                targetResponseMinutes: '',
            });
            toast({ title: 'Recall creado', description: 'Caso de retiro registrado.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo crear el recall'), variant: 'destructive' });
        }
    };

    const quickUpdateRecallProgress = async (id: string, current: number) => {
        try {
            const value = window.prompt('Cantidad recuperada acumulada', String(current));
            if (value === null) return;
            const retrievedQuantity = Number(value);
            if (Number.isNaN(retrievedQuantity) || retrievedQuantity < 0) {
                toast({ title: 'Error', description: 'Cantidad inválida', variant: 'destructive' });
                return;
            }
            await updateRecallProgress({ id, retrievedQuantity, actor: 'sistema-web' });
            toast({ title: 'Recall actualizado', description: 'Cobertura y avance actualizados.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo actualizar el recall'), variant: 'destructive' });
        }
    };

    const quickCreateRecallNotification = async (id: string) => {
        try {
            const recipientName = window.prompt('Nombre del destinatario');
            if (!recipientName) return;
            const recipientContact = window.prompt('Contacto (email/teléfono)');
            if (!recipientContact) return;
            const channelRaw = window.prompt('Canal (email, telefono, whatsapp, otro)', RecallNotificationChannel.EMAIL);
            if (!channelRaw) return;
            if (!Object.values(RecallNotificationChannel).includes(channelRaw as RecallNotificationChannel)) {
                toast({ title: 'Error', description: 'Canal inválido', variant: 'destructive' });
                return;
            }

            await createRecallNotification({
                id,
                recipientName,
                recipientContact,
                channel: channelRaw as RecallNotificationChannel,
                actor: 'sistema-web',
            });
            toast({ title: 'Notificación creada', description: 'Registro de notificación agregado.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo crear la notificación'), variant: 'destructive' });
        }
    };

    const quickUpdateRecallNotificationStatus = async (notificationId: string, status: RecallNotificationStatus) => {
        try {
            const payload: {
                notificationId: string;
                status: RecallNotificationStatus;
                sentAt?: string;
                acknowledgedAt?: string;
                actor: string;
            } = {
                notificationId,
                status,
                actor: 'sistema-web',
            };

            if (status === RecallNotificationStatus.ENVIADA) payload.sentAt = new Date().toISOString();
            if (status === RecallNotificationStatus.CONFIRMADA) payload.acknowledgedAt = new Date().toISOString();

            await updateRecallNotification(payload);
            toast({ title: 'Notificación actualizada', description: `Estado: ${status}` });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo actualizar la notificación'), variant: 'destructive' });
        }
    };

    const quickCloseRecall = async (id: string) => {
        try {
            const closureEvidence = window.prompt('Evidencia de cierre del recall');
            if (!closureEvidence) return;
            await closeRecallCase({
                id,
                closureEvidence,
                endedAt: new Date().toISOString(),
                actor: 'sistema-web',
            });
            toast({ title: 'Recall cerrado', description: 'Caso cerrado con evidencia registrada.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo cerrar el recall'), variant: 'destructive' });
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
            toast({ title: 'Capacitación registrada', description: 'Evidencia agregada correctamente.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo registrar la capacitación'), variant: 'destructive' });
        }
    };

    return {
        nonConformities,
        capas,
        audits,
        technovigilanceCases,
        recalls,
        regulatoryLabels: regulatoryFlow.regulatoryLabels,
        incomingInspections: receptionReleaseFlow.incomingInspections,
        batchReleases: receptionReleaseFlow.batchReleases,
        invimaRegistrations: regulatoryFlow.invimaRegistrations,
        complianceDashboard,
        riskControls,
        trainingEvidence,
        documents,
        openNc,
        ncForm,
        capaForm,
        documentForm,
        technoForm,
        recallForm,
        regulatoryLabelForm: regulatoryFlow.regulatoryLabelForm,
        riskControlForm,
        trainingForm,
        batchReleaseForm: receptionReleaseFlow.batchReleaseForm,
        invimaRegistrationForm: regulatoryFlow.invimaRegistrationForm,
        setNcForm,
        setCapaForm,
        setDocumentForm,
        setTechnoForm,
        setRecallForm,
        setRegulatoryLabelForm: regulatoryFlow.setRegulatoryLabelForm,
        setRiskControlForm,
        setTrainingForm,
        setBatchReleaseForm: receptionReleaseFlow.setBatchReleaseForm,
        setInvimaRegistrationForm: regulatoryFlow.setInvimaRegistrationForm,
        loadingNc,
        loadingCapas,
        loadingAudit,
        loadingTechno,
        loadingRecalls,
        loadingRegulatoryLabels: regulatoryFlow.loadingRegulatoryLabels,
        loadingIncomingInspections: receptionReleaseFlow.loadingIncomingInspections,
        loadingBatchReleases: receptionReleaseFlow.loadingBatchReleases,
        loadingInvimaRegistrations: regulatoryFlow.loadingInvimaRegistrations,
        loadingComplianceDashboard,
        loadingRiskControls,
        loadingTrainingEvidence,
        loadingDocuments,
        creatingNc,
        creatingCapa,
        creatingDocument,
        creatingTechnoCase,
        creatingRecall,
        savingRegulatoryLabel: regulatoryFlow.savingRegulatoryLabel,
        validatingDispatch: regulatoryFlow.validatingDispatch,
        exportingCompliance,
        creatingRiskControl,
        creatingTrainingEvidence,
        savingBatchReleaseChecklist: receptionReleaseFlow.savingBatchReleaseChecklist,
        signingBatchRelease: receptionReleaseFlow.signingBatchRelease,
        creatingInvimaRegistration: regulatoryFlow.creatingInvimaRegistration,
        submittingDocument,
        approvingDocument,
        handleCreateNc,
        handleCreateCapa,
        quickCloseNc,
        quickCloseCapa,
        handleCreateDocument,
        handleSubmitDocument,
        handleApproveDocument,
        handleCreateTechnoCase,
        quickSetTechnoStatus,
        quickReportTechno,
        handleCreateRecall,
        quickUpdateRecallProgress,
        quickCreateRecallNotification,
        quickUpdateRecallNotificationStatus,
        quickCloseRecall,
        handleUpsertRegulatoryLabel: regulatoryFlow.handleUpsertRegulatoryLabel,
        quickValidateDispatch: regulatoryFlow.quickValidateDispatch,
        quickResolveIncomingInspection: receptionReleaseFlow.quickResolveIncomingInspection,
        handleUpsertBatchReleaseChecklist: receptionReleaseFlow.handleUpsertBatchReleaseChecklist,
        quickSignBatchRelease: receptionReleaseFlow.quickSignBatchRelease,
        handleCreateInvimaRegistration: regulatoryFlow.handleCreateInvimaRegistration,
        handleExportCompliance,
        handleCreateRiskControl,
        handleCreateTrainingEvidence,
    };
};
