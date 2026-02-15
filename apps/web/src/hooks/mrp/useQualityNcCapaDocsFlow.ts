import { useState } from 'react';
import {
    CapaStatus,
    DocumentApprovalMethod,
    DocumentProcess,
    NonConformityStatus,
    QualitySeverity,
} from '@scaffold/types';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import {
    useCapasQuery,
    useControlledDocumentsQuery,
    useCreateControlledDocumentMutation,
    useCreateCapaMutation,
    useCreateNonConformityMutation,
    useNonConformitiesQuery,
    useQualityAuditQuery,
    useSubmitControlledDocumentMutation,
    useApproveControlledDocumentMutation,
    useUpdateCapaMutation,
    useUpdateNonConformityMutation,
} from '@/hooks/mrp/useQuality';

export const useQualityNcCapaDocsFlow = () => {
    const { toast } = useToast();

    const { data: nonConformitiesData, loading: loadingNc } = useNonConformitiesQuery();
    const { data: capasData, loading: loadingCapas } = useCapasQuery();
    const { data: auditData, loading: loadingAudit } = useQualityAuditQuery();
    const { data: documentsData, loading: loadingDocuments } = useControlledDocumentsQuery();

    const { execute: createNc, loading: creatingNc } = useCreateNonConformityMutation();
    const { execute: updateNc } = useUpdateNonConformityMutation();
    const { execute: createCapa, loading: creatingCapa } = useCreateCapaMutation();
    const { execute: updateCapa } = useUpdateCapaMutation();
    const { execute: createDocument, loading: creatingDocument } = useCreateControlledDocumentMutation();
    const { execute: submitDocument, loading: submittingDocument } = useSubmitControlledDocumentMutation();
    const { execute: approveDocument, loading: approvingDocument } = useApproveControlledDocumentMutation();

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

    const nonConformities = nonConformitiesData ?? [];
    const capas = capasData ?? [];
    const audits = auditData ?? [];
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
            toast({ title: 'Documento enviado', description: 'Ahora esta en revision.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo enviar a revision'), variant: 'destructive' });
        }
    };

    const handleApproveDocument = async (id: string) => {
        try {
            const approvalSignature = window.prompt('Firma de aprobacion (nombre completo o identificador)');
            if (!approvalSignature) return;

            const methodRaw = window.prompt(
                'Metodo de firma (firma_manual, firma_digital)',
                DocumentApprovalMethod.FIRMA_MANUAL
            );
            if (!methodRaw) return;

            if (!Object.values(DocumentApprovalMethod).includes(methodRaw as DocumentApprovalMethod)) {
                toast({ title: 'Error', description: 'Metodo de firma invalido', variant: 'destructive' });
                return;
            }

            await approveDocument({
                id,
                actor: 'sistema-web',
                approvalMethod: methodRaw as DocumentApprovalMethod,
                approvalSignature,
            });
            toast({ title: 'Documento aprobado', description: 'Ya quedo vigente para su proceso.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo aprobar el documento'), variant: 'destructive' });
        }
    };

    return {
        nonConformities,
        capas,
        audits,
        documents,
        openNc,
        ncForm,
        capaForm,
        documentForm,
        setNcForm,
        setCapaForm,
        setDocumentForm,
        loadingNc,
        loadingCapas,
        loadingAudit,
        loadingDocuments,
        creatingNc,
        creatingCapa,
        creatingDocument,
        submittingDocument,
        approvingDocument,
        handleCreateNc,
        handleCreateCapa,
        quickCloseNc,
        quickCloseCapa,
        handleCreateDocument,
        handleSubmitDocument,
        handleApproveDocument,
    };
};
