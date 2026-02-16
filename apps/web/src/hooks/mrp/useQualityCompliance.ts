import { useQualityRegulatoryFlow } from '@/hooks/mrp/useQualityRegulatoryFlow';
import { useQualityReceptionReleaseFlow } from '@/hooks/mrp/useQualityReceptionReleaseFlow';
import { useQualityNcCapaDocsFlow } from '@/hooks/mrp/useQualityNcCapaDocsFlow';
import { useQualityPostmarketFlow } from '@/hooks/mrp/useQualityPostmarketFlow';
import { useQualityDhrComplianceFlow } from '@/hooks/mrp/useQualityDhrComplianceFlow';
import { useQualityDeviationOosFlow } from '@/hooks/mrp/useQualityDeviationOosFlow';
import { useQualityChangeControlFlow } from '@/hooks/mrp/useQualityChangeControlFlow';
import { useQualityEquipmentFlow } from '@/hooks/mrp/useQualityEquipmentFlow';
import { useQualityOperationalAlertsFlow } from '@/hooks/mrp/useQualityOperationalAlertsFlow';

export const useQualityCompliance = () => {
    const ncCapaDocsFlow = useQualityNcCapaDocsFlow();
    const postmarketFlow = useQualityPostmarketFlow();
    const dhrComplianceFlow = useQualityDhrComplianceFlow();
    const regulatoryFlow = useQualityRegulatoryFlow();
    const receptionReleaseFlow = useQualityReceptionReleaseFlow();
    const deviationOosFlow = useQualityDeviationOosFlow();
    const changeControlFlow = useQualityChangeControlFlow();
    const equipmentFlow = useQualityEquipmentFlow();
    const operationalAlertsFlow = useQualityOperationalAlertsFlow();

    return {
        ...ncCapaDocsFlow,
        ...postmarketFlow,
        ...dhrComplianceFlow,
        ...deviationOosFlow,
        ...changeControlFlow,
        ...equipmentFlow,
        ...operationalAlertsFlow,
        regulatoryLabels: regulatoryFlow.regulatoryLabels,
        incomingInspections: receptionReleaseFlow.incomingInspections,
        batchReleases: receptionReleaseFlow.batchReleases,
        invimaRegistrations: regulatoryFlow.invimaRegistrations,
        regulatoryLabelForm: regulatoryFlow.regulatoryLabelForm,
        batchReleaseForm: receptionReleaseFlow.batchReleaseForm,
        invimaRegistrationForm: regulatoryFlow.invimaRegistrationForm,
        setRegulatoryLabelForm: regulatoryFlow.setRegulatoryLabelForm,
        setBatchReleaseForm: receptionReleaseFlow.setBatchReleaseForm,
        setInvimaRegistrationForm: regulatoryFlow.setInvimaRegistrationForm,
        loadingRegulatoryLabels: regulatoryFlow.loadingRegulatoryLabels,
        loadingIncomingInspections: receptionReleaseFlow.loadingIncomingInspections,
        loadingBatchReleases: receptionReleaseFlow.loadingBatchReleases,
        loadingInvimaRegistrations: regulatoryFlow.loadingInvimaRegistrations,
        savingRegulatoryLabel: regulatoryFlow.savingRegulatoryLabel,
        validatingDispatch: regulatoryFlow.validatingDispatch,
        savingBatchReleaseChecklist: receptionReleaseFlow.savingBatchReleaseChecklist,
        signingBatchRelease: receptionReleaseFlow.signingBatchRelease,
        creatingInvimaRegistration: regulatoryFlow.creatingInvimaRegistration,
        handleUpsertRegulatoryLabel: regulatoryFlow.handleUpsertRegulatoryLabel,
        quickValidateDispatch: regulatoryFlow.quickValidateDispatch,
        quickResolveIncomingInspection: receptionReleaseFlow.quickResolveIncomingInspection,
        handleUpsertBatchReleaseChecklist: receptionReleaseFlow.handleUpsertBatchReleaseChecklist,
        quickSignBatchRelease: receptionReleaseFlow.quickSignBatchRelease,
        handleCreateInvimaRegistration: regulatoryFlow.handleCreateInvimaRegistration,
    };
};
