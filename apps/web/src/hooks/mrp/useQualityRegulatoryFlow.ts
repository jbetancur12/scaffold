import { useState } from 'react';
import {
    InvimaRegistrationStatus,
    RegulatoryCodingStandard,
    RegulatoryDeviceType,
    RegulatoryLabelScopeType,
} from '@scaffold/types';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import {
    useRegulatoryLabelsQuery,
    useUpsertRegulatoryLabelMutation,
    useValidateDispatchReadinessMutation,
} from '@/hooks/mrp/useQuality';
import { useCreateInvimaRegistrationMutation, useInvimaRegistrationsQuery } from '@/hooks/mrp/useProducts';

export const useQualityRegulatoryFlow = () => {
    const { toast } = useToast();
    const { data: regulatoryLabelsData, loading: loadingRegulatoryLabels } = useRegulatoryLabelsQuery();
    const { data: invimaRegistrationsData, loading: loadingInvimaRegistrations } = useInvimaRegistrationsQuery();
    const { execute: upsertRegulatoryLabel, loading: savingRegulatoryLabel } = useUpsertRegulatoryLabelMutation();
    const { execute: validateDispatchReadiness, loading: validatingDispatch } = useValidateDispatchReadinessMutation();
    const { execute: createInvimaRegistration, loading: creatingInvimaRegistration } = useCreateInvimaRegistrationMutation();

    const [regulatoryLabelForm, setRegulatoryLabelForm] = useState({
        productionBatchId: '',
        productionBatchUnitId: '',
        scopeType: RegulatoryLabelScopeType.LOTE,
        deviceType: RegulatoryDeviceType.CLASE_I,
        codingStandard: RegulatoryCodingStandard.GS1,
        productName: '',
        manufacturerName: '',
        invimaRegistration: '',
        lotCode: '',
        serialCode: '',
        manufactureDate: '',
        expirationDate: '',
        gtin: '',
        udiDi: '',
        udiPi: '',
        internalCode: '',
    });

    const [invimaRegistrationForm, setInvimaRegistrationForm] = useState({
        code: '',
        holderName: '',
        manufacturerName: '',
        validFrom: '',
        validUntil: '',
        status: InvimaRegistrationStatus.ACTIVO,
        notes: '',
    });

    const regulatoryLabels = regulatoryLabelsData ?? [];
    const invimaRegistrations = invimaRegistrationsData ?? [];

    const handleUpsertRegulatoryLabel = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await upsertRegulatoryLabel({
                productionBatchId: regulatoryLabelForm.productionBatchId,
                productionBatchUnitId: regulatoryLabelForm.productionBatchUnitId || undefined,
                scopeType: regulatoryLabelForm.scopeType,
                deviceType: regulatoryLabelForm.deviceType,
                codingStandard: regulatoryLabelForm.codingStandard,
                productName: regulatoryLabelForm.productName || undefined,
                manufacturerName: regulatoryLabelForm.manufacturerName || undefined,
                invimaRegistration: regulatoryLabelForm.invimaRegistration || undefined,
                lotCode: regulatoryLabelForm.lotCode || undefined,
                serialCode: regulatoryLabelForm.serialCode || undefined,
                manufactureDate: regulatoryLabelForm.manufactureDate,
                expirationDate: regulatoryLabelForm.expirationDate || undefined,
                gtin: regulatoryLabelForm.gtin || undefined,
                udiDi: regulatoryLabelForm.udiDi || undefined,
                udiPi: regulatoryLabelForm.udiPi || undefined,
                internalCode: regulatoryLabelForm.internalCode || undefined,
                actor: 'sistema-web',
            });
            toast({ title: 'Etiqueta registrada', description: 'Etiqueta regulatoria guardada y validada.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo registrar la etiqueta'), variant: 'destructive' });
        }
    };

    const quickValidateDispatch = async () => {
        try {
            const productionBatchId = window.prompt('ID del lote a validar para despacho');
            if (!productionBatchId) return;

            const result = await validateDispatchReadiness({ productionBatchId, actor: 'sistema-web' });
            if (result.eligible) {
                toast({ title: 'Despacho habilitado', description: 'El lote cumple con etiquetado regulatorio.' });
                return;
            }
            toast({
                title: 'Despacho bloqueado',
                description: result.errors.join(' | ') || 'El lote no cumple validaciones de etiquetado.',
                variant: 'destructive',
            });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo validar el despacho'), variant: 'destructive' });
        }
    };

    const handleCreateInvimaRegistration = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createInvimaRegistration({
                code: invimaRegistrationForm.code,
                holderName: invimaRegistrationForm.holderName,
                manufacturerName: invimaRegistrationForm.manufacturerName || undefined,
                validFrom: invimaRegistrationForm.validFrom || undefined,
                validUntil: invimaRegistrationForm.validUntil || undefined,
                status: invimaRegistrationForm.status,
                notes: invimaRegistrationForm.notes || undefined,
            });
            setInvimaRegistrationForm({
                code: '',
                holderName: '',
                manufacturerName: '',
                validFrom: '',
                validUntil: '',
                status: InvimaRegistrationStatus.ACTIVO,
                notes: '',
            });
            toast({ title: 'Registro INVIMA creado', description: 'Ya se puede asociar a productos regulados.' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo crear el registro INVIMA'), variant: 'destructive' });
        }
    };

    return {
        regulatoryLabels,
        invimaRegistrations,
        regulatoryLabelForm,
        invimaRegistrationForm,
        setRegulatoryLabelForm,
        setInvimaRegistrationForm,
        loadingRegulatoryLabels,
        loadingInvimaRegistrations,
        savingRegulatoryLabel,
        validatingDispatch,
        creatingInvimaRegistration,
        handleUpsertRegulatoryLabel,
        quickValidateDispatch,
        handleCreateInvimaRegistration,
    };
};
