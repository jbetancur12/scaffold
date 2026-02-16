import { useState } from 'react';
import {
    EquipmentCalibrationResult,
    EquipmentMaintenanceResult,
    EquipmentMaintenanceType,
    EquipmentStatus,
} from '@scaffold/types';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import {
    useBatchEquipmentUsageQuery,
    useCreateEquipmentCalibrationMutation,
    useCreateEquipmentMaintenanceMutation,
    useCreateEquipmentMutation,
    useEquipmentAlertsQuery,
    useEquipmentHistoryQuery,
    useEquipmentQuery,
    useRegisterBatchEquipmentUsageMutation,
    useUpdateEquipmentMutation,
} from '@/hooks/mrp/useQuality';

export const useQualityEquipmentFlow = () => {
    const { toast } = useToast();

    const { data: equipmentData, loading: loadingEquipment } = useEquipmentQuery();
    const { data: alertsData, loading: loadingEquipmentAlerts } = useEquipmentAlertsQuery(30);
    const { data: usageData, loading: loadingEquipmentUsage } = useBatchEquipmentUsageQuery();

    const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('');
    const { data: equipmentHistoryData, loading: loadingEquipmentHistory } = useEquipmentHistoryQuery(
        selectedEquipmentId || undefined
    );

    const { execute: createEquipment, loading: creatingEquipment } = useCreateEquipmentMutation();
    const { execute: updateEquipment, loading: updatingEquipment } = useUpdateEquipmentMutation();
    const { execute: createCalibration, loading: creatingCalibration } = useCreateEquipmentCalibrationMutation();
    const { execute: createMaintenance, loading: creatingMaintenance } = useCreateEquipmentMaintenanceMutation();
    const { execute: registerUsage, loading: registeringUsage } = useRegisterBatchEquipmentUsageMutation();

    const [equipmentForm, setEquipmentForm] = useState({
        code: '',
        name: '',
        area: '',
        isCritical: false,
        status: EquipmentStatus.ACTIVO,
        calibrationFrequencyDays: '',
        maintenanceFrequencyDays: '',
        notes: '',
    });

    const [calibrationForm, setCalibrationForm] = useState({
        equipmentId: '',
        executedAt: '',
        dueAt: '',
        result: EquipmentCalibrationResult.APROBADA,
        certificateRef: '',
        evidenceRef: '',
        performedBy: 'sistema-web',
        notes: '',
    });

    const [maintenanceForm, setMaintenanceForm] = useState({
        equipmentId: '',
        executedAt: '',
        dueAt: '',
        type: EquipmentMaintenanceType.PREVENTIVO,
        result: EquipmentMaintenanceResult.COMPLETADO,
        evidenceRef: '',
        performedBy: 'sistema-web',
        notes: '',
    });

    const [usageForm, setUsageForm] = useState({
        productionBatchId: '',
        equipmentId: '',
        usedAt: '',
        usedBy: 'sistema-web',
        notes: '',
    });

    const equipment = equipmentData ?? [];
    const equipmentAlerts = alertsData ?? [];
    const equipmentUsage = usageData ?? [];
    const equipmentHistory = equipmentHistoryData ?? null;

    const criticalEquipmentCount = equipment.filter((item) => item.isCritical).length;

    const handleCreateEquipment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createEquipment({
                code: equipmentForm.code,
                name: equipmentForm.name,
                area: equipmentForm.area || undefined,
                isCritical: equipmentForm.isCritical,
                status: equipmentForm.status,
                calibrationFrequencyDays: equipmentForm.calibrationFrequencyDays
                    ? Number(equipmentForm.calibrationFrequencyDays)
                    : undefined,
                maintenanceFrequencyDays: equipmentForm.maintenanceFrequencyDays
                    ? Number(equipmentForm.maintenanceFrequencyDays)
                    : undefined,
                notes: equipmentForm.notes || undefined,
                actor: 'sistema-web',
            });
            toast({ title: 'Equipo creado', description: 'Equipo registrado correctamente.' });
            setEquipmentForm({
                code: '',
                name: '',
                area: '',
                isCritical: false,
                status: EquipmentStatus.ACTIVO,
                calibrationFrequencyDays: '',
                maintenanceFrequencyDays: '',
                notes: '',
            });
        } catch (err) {
            toast({
                title: 'Error',
                description: getErrorMessage(err, 'No se pudo crear el equipo'),
                variant: 'destructive',
            });
        }
    };

    const quickToggleEquipmentStatus = async (id: string, currentStatus: EquipmentStatus) => {
        try {
            await updateEquipment({
                id,
                status: currentStatus === EquipmentStatus.ACTIVO ? EquipmentStatus.INACTIVO : EquipmentStatus.ACTIVO,
                actor: 'sistema-web',
            });
            toast({ title: 'Estado actualizado', description: 'Se actualizó el estado del equipo.' });
        } catch (err) {
            toast({
                title: 'Error',
                description: getErrorMessage(err, 'No se pudo actualizar el estado del equipo'),
                variant: 'destructive',
            });
        }
    };

    const handleCreateCalibration = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!calibrationForm.equipmentId) {
            toast({ title: 'Error', description: 'Debes seleccionar un equipo', variant: 'destructive' });
            return;
        }

        try {
            await createCalibration({
                equipmentId: calibrationForm.equipmentId,
                executedAt: calibrationForm.executedAt || undefined,
                dueAt: calibrationForm.dueAt || undefined,
                result: calibrationForm.result,
                certificateRef: calibrationForm.certificateRef || undefined,
                evidenceRef: calibrationForm.evidenceRef || undefined,
                performedBy: calibrationForm.performedBy || undefined,
                notes: calibrationForm.notes || undefined,
                actor: 'sistema-web',
            });
            toast({ title: 'Calibración registrada', description: 'Se registró la calibración.' });
            setCalibrationForm((prev) => ({
                ...prev,
                executedAt: '',
                dueAt: '',
                certificateRef: '',
                evidenceRef: '',
                notes: '',
            }));
        } catch (err) {
            toast({
                title: 'Error',
                description: getErrorMessage(err, 'No se pudo registrar la calibración'),
                variant: 'destructive',
            });
        }
    };

    const handleCreateMaintenance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!maintenanceForm.equipmentId) {
            toast({ title: 'Error', description: 'Debes seleccionar un equipo', variant: 'destructive' });
            return;
        }

        try {
            await createMaintenance({
                equipmentId: maintenanceForm.equipmentId,
                executedAt: maintenanceForm.executedAt || undefined,
                dueAt: maintenanceForm.dueAt || undefined,
                type: maintenanceForm.type,
                result: maintenanceForm.result,
                evidenceRef: maintenanceForm.evidenceRef || undefined,
                performedBy: maintenanceForm.performedBy || undefined,
                notes: maintenanceForm.notes || undefined,
                actor: 'sistema-web',
            });
            toast({ title: 'Mantenimiento registrado', description: 'Se registró el mantenimiento.' });
            setMaintenanceForm((prev) => ({
                ...prev,
                executedAt: '',
                dueAt: '',
                evidenceRef: '',
                notes: '',
            }));
        } catch (err) {
            toast({
                title: 'Error',
                description: getErrorMessage(err, 'No se pudo registrar el mantenimiento'),
                variant: 'destructive',
            });
        }
    };

    const handleRegisterEquipmentUsage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!usageForm.productionBatchId || !usageForm.equipmentId) {
            toast({
                title: 'Error',
                description: 'Debes indicar lote y equipo',
                variant: 'destructive',
            });
            return;
        }

        try {
            await registerUsage({
                productionBatchId: usageForm.productionBatchId,
                equipmentId: usageForm.equipmentId,
                usedAt: usageForm.usedAt || undefined,
                usedBy: usageForm.usedBy || undefined,
                notes: usageForm.notes || undefined,
                actor: 'sistema-web',
            });
            toast({ title: 'Uso registrado', description: 'Se registró el uso del equipo en lote.' });
            setUsageForm((prev) => ({ ...prev, usedAt: '', notes: '' }));
        } catch (err) {
            toast({
                title: 'Error',
                description: getErrorMessage(err, 'No se pudo registrar el uso del equipo'),
                variant: 'destructive',
            });
        }
    };

    return {
        equipment,
        equipmentAlerts,
        equipmentUsage,
        equipmentHistory,
        selectedEquipmentId,
        setSelectedEquipmentId,
        criticalEquipmentCount,
        equipmentForm,
        setEquipmentForm,
        calibrationForm,
        setCalibrationForm,
        maintenanceForm,
        setMaintenanceForm,
        usageForm,
        setUsageForm,
        loadingEquipment,
        loadingEquipmentAlerts,
        loadingEquipmentUsage,
        loadingEquipmentHistory,
        creatingEquipment,
        updatingEquipment,
        creatingCalibration,
        creatingMaintenance,
        registeringUsage,
        handleCreateEquipment,
        handleCreateCalibration,
        handleCreateMaintenance,
        handleRegisterEquipmentUsage,
        quickToggleEquipmentStatus,
    };
};
