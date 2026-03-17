import { useQualityRegulatoryFlow } from '@/hooks/mrp/useQualityRegulatoryFlow';
import { useQualityReceptionReleaseFlow } from '@/hooks/mrp/useQualityReceptionReleaseFlow';
import { useQualityNcCapaDocsFlow } from '@/hooks/mrp/useQualityNcCapaDocsFlow';
import { useQualityPostmarketFlow } from '@/hooks/mrp/useQualityPostmarketFlow';
import { useQualityDhrComplianceFlow } from '@/hooks/mrp/useQualityDhrComplianceFlow';
import { useQualityDeviationOosFlow } from '@/hooks/mrp/useQualityDeviationOosFlow';
import { useQualityChangeControlFlow } from '@/hooks/mrp/useQualityChangeControlFlow';
import { useQualityEquipmentFlow } from '@/hooks/mrp/useQualityEquipmentFlow';
import { useQualityOperationalAlertsFlow } from '@/hooks/mrp/useQualityOperationalAlertsFlow';
import { useProductsQuery } from '@/hooks/mrp/useProducts';
import { useRawMaterialsQuery } from '@/hooks/mrp/useRawMaterials';
import { useSuppliersQuery } from '@/hooks/mrp/useSuppliers';
import { useWarehousesQuery } from '@/hooks/mrp/useWarehouses';
import { usePurchaseOrdersQuery } from '@/hooks/mrp/usePurchaseOrders';
import { usePurchaseRequisitionsQuery } from '@/hooks/mrp/usePurchaseRequisitions';
import { useSalesOrdersQuery } from '@/hooks/mrp/useSalesOrders';
import { useProductionOrdersQuery } from '@/hooks/mrp/useProductionOrders';

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
    const productsCatalogQuery = useProductsQuery(1, 2000, '', '');
    const rawMaterialsCatalogQuery = useRawMaterialsQuery(1, 2000, '');
    const suppliersCatalogQuery = useSuppliersQuery(1, 2000);
    const warehousesCatalogQuery = useWarehousesQuery();
    const purchaseOrdersCatalogQuery = usePurchaseOrdersQuery(1, 2000);
    const purchaseRequisitionsCatalogQuery = usePurchaseRequisitionsQuery(1, 2000);
    const salesOrdersCatalogQuery = useSalesOrdersQuery(1, 2000);
    const productionOrdersCatalogQuery = useProductionOrdersQuery(1, 2000);

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
        productsCatalog: productsCatalogQuery.data?.products ?? [],
        rawMaterialsCatalog: rawMaterialsCatalogQuery.materials,
        suppliersCatalog: suppliersCatalogQuery.data?.suppliers ?? [],
        warehousesCatalog: warehousesCatalogQuery.data ?? [],
        purchaseOrdersCatalog: purchaseOrdersCatalogQuery.data?.data ?? [],
        purchaseRequisitionsCatalog: purchaseRequisitionsCatalogQuery.data?.data ?? [],
        salesOrdersCatalog: salesOrdersCatalogQuery.data?.data ?? [],
        productionOrdersCatalog: productionOrdersCatalogQuery.data?.orders ?? [],
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
        refetchIncomingInspections: receptionReleaseFlow.refetchIncomingInspections,
        loadingBatchReleases: receptionReleaseFlow.loadingBatchReleases,
        loadingInvimaRegistrations: regulatoryFlow.loadingInvimaRegistrations,
        savingRegulatoryLabel: regulatoryFlow.savingRegulatoryLabel,
        validatingDispatch: regulatoryFlow.validatingDispatch,
        savingBatchReleaseChecklist: receptionReleaseFlow.savingBatchReleaseChecklist,
        signingBatchRelease: receptionReleaseFlow.signingBatchRelease,
        resolvingIncomingInspection: receptionReleaseFlow.resolvingIncomingInspection,
        creatingInvimaRegistration: regulatoryFlow.creatingInvimaRegistration,
        handleUpsertRegulatoryLabel: regulatoryFlow.handleUpsertRegulatoryLabel,
        quickValidateDispatch: regulatoryFlow.quickValidateDispatch,
        quickResolveIncomingInspection: receptionReleaseFlow.quickResolveIncomingInspection,
        resolveIncomingInspectionWithPayload: receptionReleaseFlow.resolveIncomingInspectionWithPayload,
        quickCorrectIncomingInspectionCost: receptionReleaseFlow.quickCorrectIncomingInspectionCost,
        handleUpsertBatchReleaseChecklist: receptionReleaseFlow.handleUpsertBatchReleaseChecklist,
        signBatchReleaseWithPayload: receptionReleaseFlow.signBatchReleaseWithPayload,
        handleCreateInvimaRegistration: regulatoryFlow.handleCreateInvimaRegistration,
    };
};
