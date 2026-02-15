import { useState } from 'react';
import {
    RecallNotificationChannel,
    RecallNotificationStatus,
    RecallScopeType,
    TechnovigilanceCaseType,
    TechnovigilanceCausality,
    TechnovigilanceSeverity,
    TechnovigilanceStatus,
    TechnovigilanceReportChannel,
} from '@scaffold/types';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import { mrpApi } from '@/services/mrpApi';
import {
    useCreateTechnovigilanceCaseMutation,
    useTechnovigilanceCasesQuery,
    useUpdateTechnovigilanceCaseMutation,
    useReportTechnovigilanceCaseMutation,
    useRecallCasesQuery,
    useCustomersQuery,
    useShipmentsQuery,
    useCreateCustomerMutation,
    useCreateShipmentMutation,
    useCreateRecallCaseMutation,
    useUpdateRecallProgressMutation,
    useCreateRecallNotificationMutation,
    useUpdateRecallNotificationMutation,
    useCloseRecallCaseMutation,
} from '@/hooks/mrp/useQuality';

export const useQualityPostmarketFlow = () => {
    const { toast } = useToast();

    const { data: technovigilanceData, loading: loadingTechno } = useTechnovigilanceCasesQuery();
    const { data: recallsData, loading: loadingRecalls } = useRecallCasesQuery();
    const { data: customersData, loading: loadingCustomers } = useCustomersQuery();
    const { data: shipmentsData, loading: loadingShipments } = useShipmentsQuery();

    const { execute: createTechnoCase, loading: creatingTechnoCase } = useCreateTechnovigilanceCaseMutation();
    const { execute: updateTechnoCase } = useUpdateTechnovigilanceCaseMutation();
    const { execute: reportTechnoCase } = useReportTechnovigilanceCaseMutation();
    const { execute: createRecallCase, loading: creatingRecall } = useCreateRecallCaseMutation();
    const { execute: createCustomer, loading: creatingCustomer } = useCreateCustomerMutation();
    const { execute: createShipment, loading: creatingShipment } = useCreateShipmentMutation();
    const { execute: updateRecallProgress } = useUpdateRecallProgressMutation();
    const { execute: createRecallNotification } = useCreateRecallNotificationMutation();
    const { execute: updateRecallNotification } = useUpdateRecallNotificationMutation();
    const { execute: closeRecallCase } = useCloseRecallCaseMutation();

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
    const [customerForm, setCustomerForm] = useState({
        name: '',
        documentType: '',
        documentNumber: '',
        contactName: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
    });
    const [shipmentForm, setShipmentForm] = useState({
        customerId: '',
        commercialDocument: '',
        shippedAt: '',
        dispatchedBy: 'sistema-web',
        notes: '',
        items: [{ productionBatchId: '', productionBatchUnitId: '', quantity: 1 }],
    });

    const technovigilanceCases = technovigilanceData ?? [];
    const recalls = recallsData ?? [];
    const customers = customersData ?? [];
    const shipments = shipmentsData ?? [];

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
            const reportNumber = window.prompt('Numero de radicado INVIMA');
            if (!reportNumber) return;

            const channelRaw = window.prompt('Canal (invima_portal, email_oficial, otro)', TechnovigilanceReportChannel.INVIMA_PORTAL);
            if (!channelRaw) return;

            if (!Object.values(TechnovigilanceReportChannel).includes(channelRaw as TechnovigilanceReportChannel)) {
                toast({ title: 'Error', description: 'Canal de reporte invalido', variant: 'destructive' });
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

    const handleCreateCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createCustomer({
                name: customerForm.name,
                documentType: customerForm.documentType || undefined,
                documentNumber: customerForm.documentNumber || undefined,
                contactName: customerForm.contactName || undefined,
                email: customerForm.email || undefined,
                phone: customerForm.phone || undefined,
                address: customerForm.address || undefined,
                notes: customerForm.notes || undefined,
            });
            setCustomerForm({
                name: '',
                documentType: '',
                documentNumber: '',
                contactName: '',
                email: '',
                phone: '',
                address: '',
                notes: '',
            });
            toast({ title: 'Cliente creado', description: 'Cliente registrado para trazabilidad de despacho.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo crear el cliente'), variant: 'destructive' });
        }
    };

    const handleCreateShipment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!shipmentForm.customerId) {
            toast({ title: 'Error', description: 'Selecciona un cliente', variant: 'destructive' });
            return;
        }
        const hasInvalid = shipmentForm.items.some((item) => !item.productionBatchId || Number(item.quantity) <= 0);
        if (hasInvalid) {
            toast({ title: 'Error', description: 'Completa los items del despacho', variant: 'destructive' });
            return;
        }
        try {
            await createShipment({
                customerId: shipmentForm.customerId,
                commercialDocument: shipmentForm.commercialDocument,
                shippedAt: shipmentForm.shippedAt || undefined,
                dispatchedBy: shipmentForm.dispatchedBy || 'sistema-web',
                notes: shipmentForm.notes || undefined,
                items: shipmentForm.items.map((item) => ({
                    productionBatchId: item.productionBatchId.trim(),
                    productionBatchUnitId: item.productionBatchUnitId?.trim() || undefined,
                    quantity: Number(item.quantity),
                })),
            });
            setShipmentForm({
                customerId: '',
                commercialDocument: '',
                shippedAt: '',
                dispatchedBy: 'sistema-web',
                notes: '',
                items: [{ productionBatchId: '', productionBatchUnitId: '', quantity: 1 }],
            });
            toast({ title: 'Despacho registrado', description: 'Trazabilidad bidireccional actualizada.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo registrar el despacho'), variant: 'destructive' });
        }
    };

    const addShipmentItem = () => {
        setShipmentForm((prev) => ({
            ...prev,
            items: [...prev.items, { productionBatchId: '', productionBatchUnitId: '', quantity: 1 }],
        }));
    };

    const removeShipmentItem = (index: number) => {
        setShipmentForm((prev) => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }));
    };

    const updateShipmentItem = (index: number, field: 'productionBatchId' | 'productionBatchUnitId' | 'quantity', value: string | number) => {
        setShipmentForm((prev) => ({
            ...prev,
            items: prev.items.map((item, i) => (
                i === index ? { ...item, [field]: value } : item
            )),
        }));
    };

    const quickShowRecallAffectedCustomers = async (recallCaseId: string) => {
        try {
            const rows = await mrpApi.listRecallAffectedCustomers(recallCaseId);
            if (rows.length === 0) {
                toast({ title: 'Sin destinatarios', description: 'No se encontraron clientes afectados para ese recall.' });
                return;
            }
            const summary = rows.map((row) => `${row.customerName} (${row.shipments.length} envio(s))`).join(' | ');
            toast({ title: 'Clientes potencialmente afectados', description: summary });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo consultar clientes afectados'), variant: 'destructive' });
        }
    };

    const quickUpdateRecallProgress = async (id: string, current: number) => {
        try {
            const value = window.prompt('Cantidad recuperada acumulada', String(current));
            if (value === null) return;
            const retrievedQuantity = Number(value);
            if (Number.isNaN(retrievedQuantity) || retrievedQuantity < 0) {
                toast({ title: 'Error', description: 'Cantidad invalida', variant: 'destructive' });
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
            const recipientContact = window.prompt('Contacto (email/telefono)');
            if (!recipientContact) return;
            const channelRaw = window.prompt('Canal (email, telefono, whatsapp, otro)', RecallNotificationChannel.EMAIL);
            if (!channelRaw) return;
            if (!Object.values(RecallNotificationChannel).includes(channelRaw as RecallNotificationChannel)) {
                toast({ title: 'Error', description: 'Canal invalido', variant: 'destructive' });
                return;
            }

            await createRecallNotification({
                id,
                recipientName,
                recipientContact,
                channel: channelRaw as RecallNotificationChannel,
                actor: 'sistema-web',
            });
            toast({ title: 'Notificacion creada', description: 'Registro de notificacion agregado.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo crear la notificacion'), variant: 'destructive' });
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
            toast({ title: 'Notificacion actualizada', description: `Estado: ${status}` });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo actualizar la notificacion'), variant: 'destructive' });
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

    return {
        technovigilanceCases,
        recalls,
        customers,
        shipments,
        technoForm,
        recallForm,
        customerForm,
        shipmentForm,
        setTechnoForm,
        setRecallForm,
        setCustomerForm,
        setShipmentForm,
        loadingTechno,
        loadingRecalls,
        loadingCustomers,
        loadingShipments,
        creatingTechnoCase,
        creatingRecall,
        creatingCustomer,
        creatingShipment,
        handleCreateTechnoCase,
        quickSetTechnoStatus,
        quickReportTechno,
        handleCreateRecall,
        handleCreateCustomer,
        handleCreateShipment,
        addShipmentItem,
        removeShipmentItem,
        updateShipmentItem,
        quickUpdateRecallProgress,
        quickShowRecallAffectedCustomers,
        quickCreateRecallNotification,
        quickUpdateRecallNotificationStatus,
        quickCloseRecall,
    };
};
