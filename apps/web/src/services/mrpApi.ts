import api from './api';
import {
    Product,
    Supplier,
    SupplierMaterial,
    RawMaterial,
    BOMItem,
    ProductionOrder,
    ProductionBatch,
    ProductionBatchUnit,
    ProductVariant,
    InventoryItem,
    OperationalConfig,
    Warehouse,
    NonConformity,
    CapaAction,
    AuditEvent,
    NonConformityStatus,
    QualitySeverity,
    CapaStatus,
    ProcessDeviation,
    OosCase,
    ChangeControl,
    ChangeControlType,
    ChangeControlStatus,
    ChangeImpactLevel,
    ChangeApprovalDecision,
    Equipment,
    EquipmentStatus,
    EquipmentCalibration,
    EquipmentCalibrationResult,
    EquipmentMaintenance,
    EquipmentMaintenanceType,
    EquipmentMaintenanceResult,
    BatchEquipmentUsage,
    EquipmentAlert,
    EquipmentHistory,
    OperationalAlertRole,
    OperationalAlert,
    WeeklyComplianceReportFile,
    ControlledDocument,
    DocumentProcess,
    TechnovigilanceCase,
    TechnovigilanceCaseType,
    TechnovigilanceCausality,
    TechnovigilanceSeverity,
    TechnovigilanceStatus,
    RecallCase,
    RecallNotification,
    RecallStatus,
    RegulatoryLabel,
    RegulatoryLabelScopeType,
    RegulatoryLabelStatus,
    DispatchValidationResult,
    ComplianceKpiDashboard,
    ComplianceExportFile,
    QualityRiskControl,
    QualityRiskControlStatus,
    QualityTrainingEvidence,
    IncomingInspection,
    IncomingInspectionStatus,
    BatchRelease,
    BatchReleaseStatus,
    InvimaRegistration,
    InvimaRegistrationStatus,
    Customer,
    Shipment,
    RecallAffectedCustomer,
    DmrTemplate,
    BatchDhrExpedient,
    BatchDhrExportFile,
    PurchaseOrderStatus,
    PurchaseOrder,
    PurchaseOrderListResponse,
    PurchaseRequisition,
    PurchaseRequisitionListResponse,
    PurchaseRequisitionStatus,
    UpsertProductionBatchPackagingFormPayload,
} from '@scaffold/types';
import type {
    CreatePurchaseOrderDto,
    CreateProductionOrderDto,
    CreateProductVariantDto,
    UpdateProductVariantDto,
    CreateProductionBatchPayload,
    CreateNonConformityPayload,
    UpdateNonConformityPayload,
    CreateCapaPayload,
    UpdateCapaPayload,
    CreateProcessDeviationPayload,
    UpdateProcessDeviationPayload,
    ListProcessDeviationsFilters,
    CreateOosCasePayload,
    UpdateOosCasePayload,
    ListOosCasesFilters,
    CreateChangeControlPayload,
    UpdateChangeControlPayload,
    ListChangeControlsFilters,
    CreateChangeControlApprovalPayload,
    CreateEquipmentPayload,
    UpdateEquipmentPayload,
    CreateEquipmentCalibrationPayload,
    CreateEquipmentMaintenancePayload,
    RegisterBatchEquipmentUsagePayload,
    ListOperationalAlertsPayload,
    ExportWeeklyComplianceReportPayload,
    CreateControlledDocumentPayload,
    UploadControlledDocumentSourcePayload,
    ListControlledDocumentsFilters,
    CreateTechnovigilanceCasePayload,
    UpdateTechnovigilanceCasePayload,
    ReportTechnovigilanceCasePayload,
    CreateRecallCasePayload,
    UpdateRecallProgressPayload,
    CreateRecallNotificationPayload,
    UpdateRecallNotificationPayload,
    CloseRecallCasePayload,
    CreateCustomerPayload,
    CreateShipmentPayload,
    CreateDmrTemplatePayload,
    UpsertRegulatoryLabelPayload,
    ValidateDispatchReadinessPayload,
    CreateQualityRiskControlPayload,
    CreateQualityTrainingEvidencePayload,
    ResolveIncomingInspectionPayload,
    CorrectIncomingInspectionCostPayload,
    UploadIncomingInspectionEvidencePayload,
    UpsertBatchReleaseChecklistPayload,
    SignBatchReleasePayload,
    ApproveControlledDocumentPayload,
    CreateInvimaRegistrationPayload,
    UpdateInvimaRegistrationPayload,
    CreatePurchaseRequisitionPayload,
    CreatePurchaseRequisitionFromProductionOrderPayload,
} from '@scaffold/schemas';

export interface MaterialRequirement {
    material: {
        id: string;
        name: string;
        sku: string;
        unit: string;
    };
    required: number;
    available: number;
    potentialSuppliers: {
        supplier: { id: string; name: string; email?: string; phone?: string };
        lastPrice: number;
        lastDate: string;
        isCheapest: boolean;
    }[];
    pepsLots?: {
        lotId: string;
        lotCode: string;
        warehouseId: string;
        warehouseName: string;
        available: number;
        receivedAt: string;
        suggestedUse: number;
    }[];
}

export interface RawMaterialSupplier {
    supplier: Supplier;
    lastPurchasePrice: number;
    lastPurchaseDate: string;
}

export type IncomingInspectionEvidenceType = 'invoice' | 'certificate';

export interface ListResponse<T> {
    [key: string]: T[] | number; // Dynamic key based on return type (products, materials, etc)
    total: number;
}

export const mrpApi = {
    // Products
    getProducts: async (page = 1, limit = 10) => {
        const response = await api.get<{ products: Product[], total: number }>(`/mrp/products?page=${page}&limit=${limit}`);
        return response.data;
    },
    getProduct: async (id: string) => {
        const response = await api.get<Product>(`/mrp/products/${id}`);
        return response.data;
    },
    createProduct: async (data: Partial<Product>): Promise<Product> => {
        const response = await api.post('/mrp/products', data);
        return response.data;
    },
    updateProduct: async (id: string, data: Partial<Product>): Promise<Product> => {
        const response = await api.put(`/mrp/products/${id}`, data);
        return response.data;
    },
    deleteProduct: async (id: string): Promise<void> => {
        await api.delete(`/mrp/products/${id}`);
    },

    // Variants
    createVariant: async (productId: string, data: CreateProductVariantDto): Promise<ProductVariant> => {
        const response = await api.post<ProductVariant>(`/mrp/products/${productId}/variants`, data);
        return response.data;
    },
    updateVariant: async (variantId: string, data: UpdateProductVariantDto): Promise<ProductVariant> => {
        const response = await api.put<ProductVariant>(`/mrp/variants/${variantId}`, data);
        return response.data;
    },
    deleteVariant: async (variantId: string): Promise<void> => {
        await api.delete(`/mrp/variants/${variantId}`);
    },
    createInvimaRegistration: async (data: CreateInvimaRegistrationPayload): Promise<InvimaRegistration> => {
        const response = await api.post<InvimaRegistration>('/mrp/invima-registrations', data);
        return response.data;
    },
    listInvimaRegistrations: async (filters?: { status?: InvimaRegistrationStatus }): Promise<InvimaRegistration[]> => {
        const response = await api.get<InvimaRegistration[]>('/mrp/invima-registrations', { params: filters });
        return response.data;
    },
    updateInvimaRegistration: async (id: string, data: UpdateInvimaRegistrationPayload): Promise<InvimaRegistration> => {
        const response = await api.patch<InvimaRegistration>(`/mrp/invima-registrations/${id}`, data);
        return response.data;
    },

    // Purchase Orders
    createPurchaseOrder: async (data: CreatePurchaseOrderDto): Promise<PurchaseOrder> => {
        const response = await api.post<PurchaseOrder>('/mrp/purchase-orders', data);
        return response.data;
    },

    listPurchaseOrders: async (
        page: number = 1,
        limit: number = 10,
        filters?: { status?: PurchaseOrderStatus; supplierId?: string }
    ): Promise<PurchaseOrderListResponse> => {
        const response = await api.get<PurchaseOrderListResponse>('/mrp/purchase-orders', { params: { page, limit, ...filters } });
        return response.data;
    },

    getPurchaseOrder: async (id: string): Promise<PurchaseOrder> => {
        const response = await api.get<PurchaseOrder>(`/mrp/purchase-orders/${id}`);
        return response.data;
    },
    getPurchaseOrderPdf: async (id: string): Promise<Blob> => {
        const response = await api.get(`/mrp/purchase-orders/${id}/pdf`, { responseType: 'blob' });
        return response.data as Blob;
    },

    updatePurchaseOrderStatus: async (id: string, status: PurchaseOrderStatus): Promise<PurchaseOrder> => {
        const response = await api.put<PurchaseOrder>(`/mrp/purchase-orders/${id}/status`, { status });
        return response.data;
    },

    receivePurchaseOrder: async (id: string, warehouseId?: string): Promise<PurchaseOrder> => {
        const response = await api.post<PurchaseOrder>(`/mrp/purchase-orders/${id}/receive`, { warehouseId });
        return response.data;
    },

    cancelPurchaseOrder: async (id: string): Promise<void> => {
        await api.delete(`/mrp/purchase-orders/${id}`);
    },

    // Purchase Requisitions
    createPurchaseRequisition: async (data: CreatePurchaseRequisitionPayload): Promise<PurchaseRequisition> => {
        const response = await api.post<PurchaseRequisition>('/mrp/purchase-requisitions', data);
        return response.data;
    },
    createPurchaseRequisitionFromProductionOrder: async (
        productionOrderId: string,
        data: CreatePurchaseRequisitionFromProductionOrderPayload
    ): Promise<PurchaseRequisition> => {
        const response = await api.post<PurchaseRequisition>(`/mrp/production-orders/${productionOrderId}/purchase-requisition`, data);
        return response.data;
    },
    listPurchaseRequisitions: async (
        page = 1,
        limit = 20,
        filters?: { status?: PurchaseRequisitionStatus; productionOrderId?: string }
    ): Promise<PurchaseRequisitionListResponse> => {
        const response = await api.get<PurchaseRequisitionListResponse>('/mrp/purchase-requisitions', {
            params: { page, limit, ...filters },
        });
        return response.data;
    },
    getPurchaseRequisition: async (id: string): Promise<PurchaseRequisition> => {
        const response = await api.get<PurchaseRequisition>(`/mrp/purchase-requisitions/${id}`);
        return response.data;
    },
    updatePurchaseRequisitionStatus: async (id: string, status: PurchaseRequisitionStatus): Promise<PurchaseRequisition> => {
        const response = await api.patch<PurchaseRequisition>(`/mrp/purchase-requisitions/${id}/status`, { status });
        return response.data;
    },
    markPurchaseRequisitionConverted: async (id: string, purchaseOrderId: string): Promise<PurchaseRequisition> => {
        const response = await api.post<PurchaseRequisition>(`/mrp/purchase-requisitions/${id}/mark-converted`, { purchaseOrderId });
        return response.data;
    },

    // Warehouses
    getWarehouses: async () => {
        const response = await api.get<Warehouse[]>('/mrp/warehouses');
        return response.data;
    },
    getWarehouse: async (id: string) => {
        const response = await api.get<Warehouse>(`/mrp/warehouses/${id}`);
        return response.data;
    },
    createWarehouse: async (data: Partial<Warehouse>): Promise<Warehouse> => {
        const response = await api.post('/mrp/warehouses', data);
        return response.data;
    },
    updateWarehouse: async (id: string, data: Partial<Warehouse>): Promise<Warehouse> => {
        const response = await api.put(`/mrp/warehouses/${id}`, data);
        return response.data;
    },
    deleteWarehouse: async (id: string): Promise<void> => {
        await api.delete(`/mrp/warehouses/${id}`);
    },

    // Suppliers
    getSuppliers: async (page = 1, limit = 10) => {
        const response = await api.get<{ suppliers: Supplier[], total: number }>(`/mrp/suppliers?page=${page}&limit=${limit}`);
        return response.data;
    },
    getSupplier: async (id: string) => {
        const response = await api.get<Supplier>(`/mrp/suppliers/${id}`);
        return response.data;
    },
    createSupplier: async (data: Partial<Supplier>): Promise<Supplier> => {
        const response = await api.post('/mrp/suppliers', data);
        return response.data;
    },
    updateSupplier: async (id: string, data: Partial<Supplier>): Promise<Supplier> => {
        const response = await api.put(`/mrp/suppliers/${id}`, data);
        return response.data;
    },
    getSupplierMaterials: async (id: string): Promise<{ rawMaterial: RawMaterial; lastPurchasePrice: number; lastPurchaseDate: string }[]> => {
        const response = await api.get<{ rawMaterial: RawMaterial; lastPurchasePrice: number; lastPurchaseDate: string }[]>(`/mrp/suppliers/${id}/materials`);
        return response.data;
    },
    addSupplierMaterial: async (id: string, data: { rawMaterialId: string; price: number }): Promise<SupplierMaterial> => {
        const response = await api.post<SupplierMaterial>(`/mrp/suppliers/${id}/materials`, data);
        return response.data;
    },

    // Raw Materials
    getRawMaterials: async (page = 1, limit = 10, search = '') => {
        const response = await api.get<{ materials: RawMaterial[], total: number }>(`/mrp/raw-materials?page=${page}&limit=${limit}&search=${search}`);
        return response.data;
    },
    getRawMaterial: async (id: string) => {
        const response = await api.get<RawMaterial>(`/mrp/raw-materials/${id}`);
        return response.data;
    },
    createRawMaterial: async (data: Partial<RawMaterial>): Promise<RawMaterial> => {
        const response = await api.post('/mrp/raw-materials', data);
        return response.data;
    },
    updateRawMaterial: async (id: string, data: Partial<RawMaterial>): Promise<RawMaterial> => {
        const response = await api.patch(`/mrp/raw-materials/${id}`, data);
        return response.data;
    },
    getRawMaterialSuppliers: async (id: string) => {
        const response = await api.get<RawMaterialSupplier[]>(`/mrp/raw-materials/${id}/suppliers`);
        return response.data;
    },

    // BOM
    addBOMItem: async (data: Partial<BOMItem>): Promise<BOMItem> => {
        const response = await api.post('/mrp/bom-items', data);
        return response.data;
    },
    updateBOMItem: async (id: string, data: Partial<BOMItem>): Promise<BOMItem> => {
        const response = await api.put(`/mrp/bom-items/${id}`, data);
        return response.data;
    },
    getBOM: async (variantId: string): Promise<BOMItem[]> => {
        const response = await api.get<BOMItem[]>(`/mrp/variants/${variantId}/bom`);
        return response.data;
    },
    deleteBOMItem: async (id: string): Promise<void> => {
        await api.delete(`/mrp/bom-items/${id}`);
    },

    // Production Orders
    getProductionOrders: async (page = 1, limit = 10) => {
        const response = await api.get<{ orders: ProductionOrder[], total: number }>(`/mrp/production-orders?page=${page}&limit=${limit}`);
        return response.data;
    },
    getProductionOrder: async (id: string): Promise<ProductionOrder> => {
        const response = await api.get<ProductionOrder>(`/mrp/production-orders/${id}`);
        return response.data;
    },
    createProductionOrder: async (data: CreateProductionOrderDto): Promise<ProductionOrder> => {
        const response = await api.post('/mrp/production-orders', data);
        return response.data;
    },
    getMaterialRequirements: async (orderId: string): Promise<MaterialRequirement[]> => {
        const response = await api.get<MaterialRequirement[]>(`/mrp/production-orders/${orderId}/requirements`);
        return response.data;
    },
    updateProductionOrderStatus: async (id: string, status: string, warehouseId?: string): Promise<ProductionOrder> => {
        const response = await api.patch(`/mrp/production-orders/${id}/status`, { status, warehouseId });
        return response.data;
    },
    listProductionBatches: async (orderId: string): Promise<ProductionBatch[]> => {
        const response = await api.get<ProductionBatch[]>(`/mrp/production-orders/${orderId}/batches`);
        return response.data;
    },
    createProductionBatch: async (orderId: string, data: CreateProductionBatchPayload): Promise<ProductionBatch> => {
        const response = await api.post<ProductionBatch>(`/mrp/production-orders/${orderId}/batches`, data);
        return response.data;
    },
    addProductionBatchUnits: async (batchId: string, quantity: number): Promise<ProductionBatch> => {
        const response = await api.post<ProductionBatch>(`/mrp/production-batches/${batchId}/units`, { quantity });
        return response.data;
    },
    updateProductionBatchQc: async (batchId: string, passed: boolean): Promise<ProductionBatch> => {
        const response = await api.patch<ProductionBatch>(`/mrp/production-batches/${batchId}/qc`, { passed });
        return response.data;
    },
    updateProductionBatchPackaging: async (batchId: string, packed: boolean): Promise<ProductionBatch> => {
        const response = await api.patch<ProductionBatch>(`/mrp/production-batches/${batchId}/packaging`, { packed });
        return response.data;
    },
    updateProductionBatchUnitQc: async (unitId: string, passed: boolean): Promise<ProductionBatchUnit> => {
        const response = await api.patch<ProductionBatchUnit>(`/mrp/production-batch-units/${unitId}/qc`, { passed });
        return response.data;
    },
    updateProductionBatchUnitPackaging: async (unitId: string, packaged: boolean): Promise<ProductionBatchUnit> => {
        const response = await api.patch<ProductionBatchUnit>(`/mrp/production-batch-units/${unitId}/packaging`, { packaged });
        return response.data;
    },
    upsertProductionBatchPackagingForm: async (batchId: string, payload: UpsertProductionBatchPackagingFormPayload): Promise<ProductionBatch> => {
        const response = await api.post<ProductionBatch>(`/mrp/production-batches/${batchId}/packaging-form`, payload);
        return response.data;
    },
    getProductionBatchPackagingForm: async (batchId: string): Promise<{
        batchId: string;
        batchCode: string;
        productionOrderCode: string;
        productName: string;
        variantName: string;
        formCompleted: boolean;
        formFilledBy?: string;
        formFilledAt?: string;
        documentControlCode?: string;
        documentControlTitle?: string;
        documentControlVersion?: number;
        documentControlDate?: string;
        data: Record<string, unknown> | null;
    }> => {
        const response = await api.get(`/mrp/production-batches/${batchId}/packaging-form`);
        return response.data;
    },
    getProductionBatchPackagingFormPdf: async (batchId: string): Promise<Blob> => {
        const response = await api.get(`/mrp/production-batches/${batchId}/packaging-form/pdf`, { responseType: 'blob' });
        return response.data as Blob;
    },

    // Quality / INVIMA
    createNonConformity: async (data: CreateNonConformityPayload): Promise<NonConformity> => {
        const response = await api.post<NonConformity>('/mrp/quality/non-conformities', data);
        return response.data;
    },
    listNonConformities: async (filters?: { status?: NonConformityStatus; severity?: QualitySeverity; source?: string }): Promise<NonConformity[]> => {
        const response = await api.get<NonConformity[]>('/mrp/quality/non-conformities', { params: filters });
        return response.data;
    },
    updateNonConformity: async (id: string, data: UpdateNonConformityPayload): Promise<NonConformity> => {
        const response = await api.patch<NonConformity>(`/mrp/quality/non-conformities/${id}`, data);
        return response.data;
    },
    createCapaAction: async (data: CreateCapaPayload): Promise<CapaAction> => {
        const response = await api.post<CapaAction>('/mrp/quality/capa-actions', data);
        return response.data;
    },
    listCapaActions: async (filters?: { status?: CapaStatus; nonConformityId?: string }): Promise<CapaAction[]> => {
        const response = await api.get<CapaAction[]>('/mrp/quality/capa-actions', { params: filters });
        return response.data;
    },
    updateCapaAction: async (id: string, data: UpdateCapaPayload): Promise<CapaAction> => {
        const response = await api.patch<CapaAction>(`/mrp/quality/capa-actions/${id}`, data);
        return response.data;
    },
    createProcessDeviation: async (data: CreateProcessDeviationPayload): Promise<ProcessDeviation> => {
        const response = await api.post<ProcessDeviation>('/mrp/quality/process-deviations', data);
        return response.data;
    },
    listProcessDeviations: async (filters?: ListProcessDeviationsFilters): Promise<ProcessDeviation[]> => {
        const response = await api.get<ProcessDeviation[]>('/mrp/quality/process-deviations', { params: filters });
        return response.data;
    },
    updateProcessDeviation: async (id: string, data: UpdateProcessDeviationPayload): Promise<ProcessDeviation> => {
        const response = await api.patch<ProcessDeviation>(`/mrp/quality/process-deviations/${id}`, data);
        return response.data;
    },
    createOosCase: async (data: CreateOosCasePayload): Promise<OosCase> => {
        const response = await api.post<OosCase>('/mrp/quality/oos-cases', data);
        return response.data;
    },
    listOosCases: async (filters?: ListOosCasesFilters): Promise<OosCase[]> => {
        const response = await api.get<OosCase[]>('/mrp/quality/oos-cases', { params: filters });
        return response.data;
    },
    updateOosCase: async (id: string, data: UpdateOosCasePayload): Promise<OosCase> => {
        const response = await api.patch<OosCase>(`/mrp/quality/oos-cases/${id}`, data);
        return response.data;
    },
    createChangeControl: async (data: CreateChangeControlPayload): Promise<ChangeControl> => {
        const response = await api.post<ChangeControl>('/mrp/quality/change-controls', data);
        return response.data;
    },
    listChangeControls: async (filters?: ListChangeControlsFilters & {
        status?: ChangeControlStatus;
        type?: ChangeControlType;
        impactLevel?: ChangeImpactLevel;
    }): Promise<ChangeControl[]> => {
        const response = await api.get<ChangeControl[]>('/mrp/quality/change-controls', { params: filters });
        return response.data;
    },
    updateChangeControl: async (id: string, data: UpdateChangeControlPayload): Promise<ChangeControl> => {
        const response = await api.patch<ChangeControl>(`/mrp/quality/change-controls/${id}`, data);
        return response.data;
    },
    createChangeControlApproval: async (
        data: CreateChangeControlApprovalPayload & { decision?: ChangeApprovalDecision }
    ): Promise<ChangeControl> => {
        const response = await api.post<ChangeControl>('/mrp/quality/change-controls/approvals', data);
        return response.data;
    },
    createEquipment: async (data: CreateEquipmentPayload): Promise<Equipment> => {
        const response = await api.post<Equipment>('/mrp/quality/equipment', data);
        return response.data;
    },
    listEquipment: async (filters?: { status?: EquipmentStatus; isCritical?: boolean }): Promise<Equipment[]> => {
        const response = await api.get<Equipment[]>('/mrp/quality/equipment', { params: filters });
        return response.data;
    },
    updateEquipment: async (id: string, data: UpdateEquipmentPayload): Promise<Equipment> => {
        const response = await api.patch<Equipment>(`/mrp/quality/equipment/${id}`, data);
        return response.data;
    },
    createEquipmentCalibration: async (
        equipmentId: string,
        data: CreateEquipmentCalibrationPayload & { result?: EquipmentCalibrationResult }
    ): Promise<EquipmentCalibration> => {
        const response = await api.post<EquipmentCalibration>(`/mrp/quality/equipment/${equipmentId}/calibrations`, data);
        return response.data;
    },
    createEquipmentMaintenance: async (
        equipmentId: string,
        data: CreateEquipmentMaintenancePayload & {
            type?: EquipmentMaintenanceType;
            result?: EquipmentMaintenanceResult;
        }
    ): Promise<EquipmentMaintenance> => {
        const response = await api.post<EquipmentMaintenance>(`/mrp/quality/equipment/${equipmentId}/maintenances`, data);
        return response.data;
    },
    registerBatchEquipmentUsage: async (data: RegisterBatchEquipmentUsagePayload): Promise<BatchEquipmentUsage> => {
        const response = await api.post<BatchEquipmentUsage>('/mrp/quality/equipment-usage', data);
        return response.data;
    },
    listBatchEquipmentUsage: async (filters?: { productionBatchId?: string; equipmentId?: string }): Promise<BatchEquipmentUsage[]> => {
        const response = await api.get<BatchEquipmentUsage[]>('/mrp/quality/equipment-usage', { params: filters });
        return response.data;
    },
    getEquipmentHistory: async (equipmentId: string): Promise<EquipmentHistory> => {
        const response = await api.get<EquipmentHistory>(`/mrp/quality/equipment/${equipmentId}/history`);
        return response.data;
    },
    listEquipmentAlerts: async (daysAhead?: number): Promise<EquipmentAlert[]> => {
        const response = await api.get<EquipmentAlert[]>('/mrp/quality/equipment-alerts', { params: { daysAhead } });
        return response.data;
    },
    listQualityAuditEvents: async (filters?: { entityType?: string; entityId?: string }): Promise<AuditEvent[]> => {
        const response = await api.get<AuditEvent[]>('/mrp/quality/audit-events', { params: filters });
        return response.data;
    },
    createTechnovigilanceCase: async (data: CreateTechnovigilanceCasePayload): Promise<TechnovigilanceCase> => {
        const response = await api.post<TechnovigilanceCase>('/mrp/quality/technovigilance-cases', data);
        return response.data;
    },
    listTechnovigilanceCases: async (filters?: {
        status?: TechnovigilanceStatus;
        type?: TechnovigilanceCaseType;
        severity?: TechnovigilanceSeverity;
        causality?: TechnovigilanceCausality;
        reportedToInvima?: boolean;
    }): Promise<TechnovigilanceCase[]> => {
        const response = await api.get<TechnovigilanceCase[]>('/mrp/quality/technovigilance-cases', { params: filters });
        return response.data;
    },
    updateTechnovigilanceCase: async (id: string, data: UpdateTechnovigilanceCasePayload): Promise<TechnovigilanceCase> => {
        const response = await api.patch<TechnovigilanceCase>(`/mrp/quality/technovigilance-cases/${id}`, data);
        return response.data;
    },
    reportTechnovigilanceCase: async (id: string, data: ReportTechnovigilanceCasePayload): Promise<TechnovigilanceCase> => {
        const response = await api.post<TechnovigilanceCase>(`/mrp/quality/technovigilance-cases/${id}/report-invima`, data);
        return response.data;
    },
    createRecallCase: async (data: CreateRecallCasePayload): Promise<RecallCase> => {
        const response = await api.post<RecallCase>('/mrp/quality/recalls', data);
        return response.data;
    },
    listRecallCases: async (filters?: { status?: RecallStatus; isMock?: boolean }): Promise<RecallCase[]> => {
        const response = await api.get<RecallCase[]>('/mrp/quality/recalls', { params: filters });
        return response.data;
    },
    createCustomer: async (data: CreateCustomerPayload): Promise<Customer> => {
        const response = await api.post<Customer>('/mrp/quality/customers', data);
        return response.data;
    },
    listCustomers: async (search?: string): Promise<Customer[]> => {
        const response = await api.get<Customer[]>('/mrp/quality/customers', { params: { search } });
        return response.data;
    },
    createShipment: async (data: CreateShipmentPayload): Promise<Shipment> => {
        const response = await api.post<Shipment>('/mrp/quality/shipments', data);
        return response.data;
    },
    listShipments: async (filters?: {
        customerId?: string;
        productionBatchId?: string;
        serialCode?: string;
        commercialDocument?: string;
    }): Promise<Shipment[]> => {
        const response = await api.get<Shipment[]>('/mrp/quality/shipments', { params: filters });
        return response.data;
    },
    listRecallAffectedCustomers: async (recallCaseId: string): Promise<RecallAffectedCustomer[]> => {
        const response = await api.get<RecallAffectedCustomer[]>(`/mrp/quality/recalls/${recallCaseId}/affected-customers`);
        return response.data;
    },
    createDmrTemplate: async (data: CreateDmrTemplatePayload): Promise<DmrTemplate> => {
        const response = await api.post<DmrTemplate>('/mrp/quality/dmr-templates', data);
        return response.data;
    },
    listDmrTemplates: async (filters?: {
        productId?: string;
        process?: DocumentProcess;
        isActive?: boolean;
    }): Promise<DmrTemplate[]> => {
        const response = await api.get<DmrTemplate[]>('/mrp/quality/dmr-templates', { params: filters });
        return response.data;
    },
    getBatchDhr: async (productionBatchId: string, actor?: string): Promise<BatchDhrExpedient> => {
        const response = await api.get<BatchDhrExpedient>(`/mrp/quality/dhr/${productionBatchId}`, { params: { actor } });
        return response.data;
    },
    exportBatchDhr: async (productionBatchId: string, format: 'csv' | 'json' = 'json', actor?: string): Promise<BatchDhrExportFile> => {
        const response = await api.get<BatchDhrExportFile>(`/mrp/quality/dhr/${productionBatchId}/export`, { params: { format, actor } });
        return response.data;
    },
    updateRecallProgress: async (id: string, data: UpdateRecallProgressPayload): Promise<RecallCase> => {
        const response = await api.patch<RecallCase>(`/mrp/quality/recalls/${id}/progress`, data);
        return response.data;
    },
    createRecallNotification: async (id: string, data: CreateRecallNotificationPayload): Promise<RecallNotification> => {
        const response = await api.post<RecallNotification>(`/mrp/quality/recalls/${id}/notifications`, data);
        return response.data;
    },
    updateRecallNotification: async (notificationId: string, data: UpdateRecallNotificationPayload): Promise<RecallNotification> => {
        const response = await api.patch<RecallNotification>(`/mrp/quality/recall-notifications/${notificationId}`, data);
        return response.data;
    },
    closeRecallCase: async (id: string, data: CloseRecallCasePayload): Promise<RecallCase> => {
        const response = await api.post<RecallCase>(`/mrp/quality/recalls/${id}/close`, data);
        return response.data;
    },
    upsertRegulatoryLabel: async (data: UpsertRegulatoryLabelPayload): Promise<RegulatoryLabel> => {
        const response = await api.post<RegulatoryLabel>('/mrp/quality/regulatory-labels', data);
        return response.data;
    },
    listRegulatoryLabels: async (filters?: {
        productionBatchId?: string;
        scopeType?: RegulatoryLabelScopeType;
        status?: RegulatoryLabelStatus;
    }): Promise<RegulatoryLabel[]> => {
        const response = await api.get<RegulatoryLabel[]>('/mrp/quality/regulatory-labels', { params: filters });
        return response.data;
    },
    getRegulatoryLabelPdf: async (productionBatchId: string): Promise<Blob> => {
        const response = await api.get(`/mrp/quality/regulatory-labels/${productionBatchId}/pdf`, { responseType: 'blob' });
        return response.data as Blob;
    },
    validateDispatchReadiness: async (data: ValidateDispatchReadinessPayload): Promise<DispatchValidationResult> => {
        const response = await api.post<DispatchValidationResult>('/mrp/quality/regulatory-labels/validate-dispatch', data);
        return response.data;
    },
    getComplianceDashboard: async (): Promise<ComplianceKpiDashboard> => {
        const response = await api.get<ComplianceKpiDashboard>('/mrp/quality/compliance-dashboard');
        return response.data;
    },
    exportCompliance: async (format: 'csv' | 'json' = 'csv'): Promise<ComplianceExportFile> => {
        const response = await api.get<ComplianceExportFile>('/mrp/quality/compliance-export', { params: { format } });
        return response.data;
    },
    listOperationalAlerts: async (filters?: ListOperationalAlertsPayload & { role?: OperationalAlertRole }): Promise<OperationalAlert[]> => {
        const response = await api.get<OperationalAlert[]>('/mrp/quality/operational-alerts', { params: filters });
        return response.data;
    },
    exportWeeklyComplianceReport: async (
        filters?: ExportWeeklyComplianceReportPayload & { role?: OperationalAlertRole; format?: 'csv' | 'json' }
    ): Promise<WeeklyComplianceReportFile> => {
        const response = await api.get<WeeklyComplianceReportFile>('/mrp/quality/weekly-compliance-report', { params: filters });
        return response.data;
    },
    createQualityRiskControl: async (data: CreateQualityRiskControlPayload): Promise<QualityRiskControl> => {
        const response = await api.post<QualityRiskControl>('/mrp/quality/risk-controls', data);
        return response.data;
    },
    listQualityRiskControls: async (filters?: {
        process?: DocumentProcess;
        status?: QualityRiskControlStatus;
    }): Promise<QualityRiskControl[]> => {
        const response = await api.get<QualityRiskControl[]>('/mrp/quality/risk-controls', { params: filters });
        return response.data;
    },
    createQualityTrainingEvidence: async (data: CreateQualityTrainingEvidencePayload): Promise<QualityTrainingEvidence> => {
        const response = await api.post<QualityTrainingEvidence>('/mrp/quality/training-evidence', data);
        return response.data;
    },
    listQualityTrainingEvidence: async (filters?: { role?: string }): Promise<QualityTrainingEvidence[]> => {
        const response = await api.get<QualityTrainingEvidence[]>('/mrp/quality/training-evidence', { params: filters });
        return response.data;
    },
    listIncomingInspections: async (filters?: {
        status?: IncomingInspectionStatus;
        rawMaterialId?: string;
        purchaseOrderId?: string;
    }): Promise<IncomingInspection[]> => {
        const response = await api.get<IncomingInspection[]>('/mrp/quality/incoming-inspections', { params: filters });
        return response.data;
    },
    getIncomingInspectionPdf: async (id: string): Promise<Blob> => {
        const response = await api.get(`/mrp/quality/incoming-inspections/${id}/pdf`, { responseType: 'blob' });
        return response.data as Blob;
    },
    uploadIncomingInspectionEvidence: async (
        id: string,
        evidenceType: IncomingInspectionEvidenceType,
        payload: UploadIncomingInspectionEvidencePayload
    ): Promise<IncomingInspection> => {
        const response = await api.post<IncomingInspection>(`/mrp/quality/incoming-inspections/${id}/evidence/${evidenceType}`, payload);
        return response.data;
    },
    downloadIncomingInspectionEvidence: async (id: string, evidenceType: IncomingInspectionEvidenceType): Promise<Blob> => {
        const response = await api.get(`/mrp/quality/incoming-inspections/${id}/evidence/${evidenceType}`, { responseType: 'blob' });
        return response.data as Blob;
    },
    resolveIncomingInspection: async (id: string, data: ResolveIncomingInspectionPayload): Promise<IncomingInspection> => {
        const response = await api.patch<IncomingInspection>(`/mrp/quality/incoming-inspections/${id}/resolve`, data);
        return response.data;
    },
    correctIncomingInspectionCost: async (id: string, data: CorrectIncomingInspectionCostPayload): Promise<IncomingInspection> => {
        const response = await api.patch<IncomingInspection>(`/mrp/quality/incoming-inspections/${id}/correct-cost`, data);
        return response.data;
    },
    upsertBatchReleaseChecklist: async (data: UpsertBatchReleaseChecklistPayload): Promise<BatchRelease> => {
        const response = await api.post<BatchRelease>('/mrp/quality/batch-releases', data);
        return response.data;
    },
    listBatchReleases: async (filters?: { productionBatchId?: string; status?: BatchReleaseStatus }): Promise<BatchRelease[]> => {
        const response = await api.get<BatchRelease[]>('/mrp/quality/batch-releases', { params: filters });
        return response.data;
    },
    getBatchReleasePdf: async (productionBatchId: string): Promise<Blob> => {
        const response = await api.get(`/mrp/quality/batch-releases/${productionBatchId}/pdf`, { responseType: 'blob' });
        return response.data as Blob;
    },
    signBatchRelease: async (
        productionBatchId: string,
        payload: SignBatchReleasePayload
    ): Promise<BatchRelease> => {
        const response = await api.post<BatchRelease>(`/mrp/quality/batch-releases/${productionBatchId}/sign`, payload);
        return response.data;
    },
    createControlledDocument: async (data: CreateControlledDocumentPayload): Promise<ControlledDocument> => {
        const response = await api.post<ControlledDocument>('/mrp/quality/documents', data);
        return response.data;
    },
    listControlledDocuments: async (filters?: ListControlledDocumentsFilters): Promise<ControlledDocument[]> => {
        const response = await api.get<ControlledDocument[]>('/mrp/quality/documents', { params: filters });
        return response.data;
    },
    submitControlledDocument: async (id: string, actor?: string): Promise<ControlledDocument> => {
        const response = await api.post<ControlledDocument>(`/mrp/quality/documents/${id}/submit-review`, { actor });
        return response.data;
    },
    approveControlledDocument: async (
        id: string,
        payload: ApproveControlledDocumentPayload
    ): Promise<ControlledDocument> => {
        const response = await api.post<ControlledDocument>(`/mrp/quality/documents/${id}/approve`, payload);
        return response.data;
    },
    uploadControlledDocumentSource: async (
        id: string,
        payload: UploadControlledDocumentSourcePayload
    ): Promise<ControlledDocument> => {
        const response = await api.post<ControlledDocument>(`/mrp/quality/documents/${id}/source-file`, payload);
        return response.data;
    },
    downloadControlledDocumentSource: async (id: string): Promise<Blob> => {
        const response = await api.get(`/mrp/quality/documents/${id}/source-file`, {
            responseType: 'blob',
        });
        return response.data as Blob;
    },
    getControlledDocumentPrintableHtml: async (id: string): Promise<string> => {
        const response = await api.get<string>(`/mrp/quality/documents/${id}/print`, {
            responseType: 'text',
        });
        return response.data;
    },
    listActiveControlledDocumentsByProcess: async (process: DocumentProcess): Promise<ControlledDocument[]> => {
        const response = await api.get<ControlledDocument[]>(`/mrp/quality/documents/active/${process}`);
        return response.data;
    },

    // Inventory
    getInventory: async (page = 1, limit = 10, warehouseId?: string) => {
        const response = await api.get<{ items: InventoryItem[], total: number }>(`/mrp/inventory`, { params: { page, limit, warehouseId } });
        return response.data;
    },
    addManualStock: async (data: { rawMaterialId: string; quantity: number; unitCost: number; warehouseId?: string }): Promise<InventoryItem> => {
        const response = await api.post<InventoryItem>('/mrp/inventory/manual-add', data);
        return response.data;
    },

    // Operational Config
    getOperationalConfig: async (): Promise<OperationalConfig> => {
        const response = await api.get<OperationalConfig>('/mrp/operational-config');
        return response.data;
    },
    updateOperationalConfig: async (data: Partial<OperationalConfig>): Promise<OperationalConfig> => {
        const response = await api.put('/mrp/operational-config', data);
        return response.data;
    },

    // Supplier Materials
    removeSupplierMaterial: async (id: string, materialId: string): Promise<void> => {
        await api.delete(`/mrp/suppliers/${id}/materials/${materialId}`);
    },
};
