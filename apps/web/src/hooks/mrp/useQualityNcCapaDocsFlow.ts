import { useEffect, useRef, useState } from 'react';
import {
    CapaStatus,
    DocumentCategory,
    DocumentApprovalMethod,
    DocumentProcess,
    DocumentProcessAreaCode,
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
    useUploadControlledDocumentSourceMutation,
    useUpdateCapaMutation,
    useUpdateNonConformityMutation,
} from '@/hooks/mrp/useQuality';
import { mrpApi } from '@/services/mrpApi';
import { useLocation } from 'react-router-dom';

type NcPrefillState = {
    prefillNc?: {
        title?: string;
        description?: string;
        severity?: QualitySeverity;
        source?: string;
        incomingInspectionId?: string;
    };
};

export const useQualityNcCapaDocsFlow = () => {
    const { toast } = useToast();
    const location = useLocation();
    const lastPrefillInspectionIdRef = useRef<string | null>(null);

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
    const { execute: uploadDocumentSource, loading: uploadingDocumentSource } = useUploadControlledDocumentSourceMutation();

    const [ncForm, setNcForm] = useState({
        title: '',
        description: '',
        severity: QualitySeverity.MEDIA,
        source: 'produccion',
        incomingInspectionId: '',
    });
    const [capaForm, setCapaForm] = useState({
        nonConformityId: '',
        actionPlan: '',
        owner: '',
        dueDate: '',
    });
    const [documentForm, setDocumentForm] = useState({
        codeNumber: '',
        title: '',
        process: DocumentProcess.CONTROL_CALIDAD,
        documentCategory: DocumentCategory.MAN,
        processAreaCode: DocumentProcessAreaCode.GC,
        version: 1,
        content: '',
        effectiveDate: '',
        expiresAt: '',
    });

    const nonConformities = nonConformitiesData ?? [];
    const capas = capasData ?? [];
    const audits = auditData ?? [];
    const documents = documentsData ?? [];
    const requiresInitialControlDocument = documents.length === 0;
    const openNc = nonConformities.filter((n) => n.status !== NonConformityStatus.CERRADA);

    useEffect(() => {
        const state = location.state as NcPrefillState | null;
        const prefill = state?.prefillNc;
        if (!prefill) return;
        const incomingInspectionId = prefill.incomingInspectionId || '';
        if (incomingInspectionId && lastPrefillInspectionIdRef.current === incomingInspectionId) return;

        setNcForm((prev) => ({
            ...prev,
            title: prefill.title || prev.title,
            description: prefill.description || prev.description,
            severity: prefill.severity || prev.severity,
            source: prefill.source || prev.source,
            incomingInspectionId: incomingInspectionId || prev.incomingInspectionId,
        }));
        lastPrefillInspectionIdRef.current = incomingInspectionId || null;
    }, [location.state]);

    const handleCreateNc = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createNc(ncForm);
            setNcForm({ title: '', description: '', severity: QualitySeverity.MEDIA, source: 'produccion', incomingInspectionId: '' });
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

    const mapAreaToProcess = (area: DocumentProcessAreaCode): DocumentProcess => {
        if (area === DocumentProcessAreaCode.GP) return DocumentProcess.PRODUCCION;
        return DocumentProcess.CONTROL_CALIDAD;
    };

    const handleCreateDocument = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const codeNumber = documentForm.codeNumber.trim().toUpperCase();
            if (!codeNumber) {
                toast({ title: 'Error', description: 'Debes indicar el consecutivo del código (ej: 05)', variant: 'destructive' });
                return;
            }
            const code = `${documentForm.processAreaCode.toUpperCase()}-${documentForm.documentCategory.toUpperCase()}-${codeNumber}`;
            await createDocument({
                code,
                title: documentForm.title,
                process: mapAreaToProcess(documentForm.processAreaCode),
                documentCategory: documentForm.documentCategory,
                processAreaCode: documentForm.processAreaCode,
                version: documentForm.version,
                content: documentForm.content || undefined,
                effectiveDate: documentForm.effectiveDate || undefined,
                expiresAt: documentForm.expiresAt || undefined,
                actor: 'sistema-web',
            });
            setDocumentForm({
                codeNumber: '',
                title: '',
                process: DocumentProcess.CONTROL_CALIDAD,
                documentCategory: DocumentCategory.MAN,
                processAreaCode: DocumentProcessAreaCode.GC,
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

    const presetInitialControlDocument = () => {
        setDocumentForm((prev) => ({
            ...prev,
            title: 'CONTROL DE DOCUMENTOS COLMOR',
            processAreaCode: DocumentProcessAreaCode.GC,
            documentCategory: DocumentCategory.MAN,
            process: DocumentProcess.CONTROL_CALIDAD,
            version: 1,
        }));
    };

    const toBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result ?? ''));
            reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
            reader.readAsDataURL(file);
        });
    };

    const handleUploadDocumentSource = async (id: string, file: File) => {
        try {
            const base64Data = await toBase64(file);
            await uploadDocumentSource({
                id,
                fileName: file.name,
                mimeType: file.type || 'application/octet-stream',
                base64Data,
                actor: 'sistema-web',
            });
            toast({ title: 'Archivo adjuntado', description: 'El archivo fuente quedó asociado al documento.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo adjuntar el archivo fuente'), variant: 'destructive' });
        }
    };

    const handleDownloadDocumentSource = (id: string, fileName?: string) => {
        void (async () => {
            try {
                const blob = await mrpApi.downloadControlledDocumentSource(id);
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName || `documento-controlado-${id}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } catch (err) {
                toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo descargar el archivo fuente'), variant: 'destructive' });
            }
        })();
    };

    const handlePrintDocument = async (id: string) => {
        const win = window.open('', '_blank', 'noopener,noreferrer');
        if (!win) {
            toast({ title: 'Error', description: 'Bloqueador de ventanas impidió abrir la impresión', variant: 'destructive' });
            return;
        }
        try {
            const html = await mrpApi.getControlledDocumentPrintableHtml(id);
            win.document.open();
            win.document.write(html);
            win.document.close();
            win.focus();
            win.print();
        } catch (err) {
            win.close();
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo generar la versión imprimible'), variant: 'destructive' });
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
        requiresInitialControlDocument,
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
        uploadingDocumentSource,
        handleCreateNc,
        handleCreateCapa,
        quickCloseNc,
        quickCloseCapa,
        handleCreateDocument,
        presetInitialControlDocument,
        handleSubmitDocument,
        handleApproveDocument,
        handleUploadDocumentSource,
        handleDownloadDocumentSource,
        handlePrintDocument,
    };
};
