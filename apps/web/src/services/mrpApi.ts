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
    ControlledDocument,
    DocumentApprovalMethod,
    DocumentProcess,
    DocumentStatus,
    TechnovigilanceCase,
    TechnovigilanceCaseType,
    TechnovigilanceCausality,
    TechnovigilanceSeverity,
    TechnovigilanceStatus,
    TechnovigilanceReportChannel,
    RecallCase,
    RecallNotification,
    RecallNotificationChannel,
    RecallNotificationStatus,
    RecallScopeType,
    RecallStatus,
    RegulatoryCodingStandard,
    RegulatoryDeviceType,
    RegulatoryLabel,
    RegulatoryLabelScopeType,
    RegulatoryLabelStatus,
    DispatchValidationResult,
    ComplianceKpiDashboard,
    ComplianceExportFile,
    QualityRiskControl,
    QualityRiskControlStatus,
    QualityTrainingEvidence,
    PurchaseOrderStatus,
    PurchaseOrder,
    PurchaseOrderListResponse,
} from '@scaffold/types';
import type {
    CreatePurchaseOrderDto,
    CreateProductionOrderDto,
    CreateProductVariantDto,
    UpdateProductVariantDto,
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
}

export interface RawMaterialSupplier {
    supplier: Supplier;
    lastPurchasePrice: number;
    lastPurchaseDate: string;
}

export interface ListResponse<T> {
    [key: string]: T[] | number; // Dynamic key based on return type (products, materials, etc)
    total: number;
}

export interface CreateProductionBatchPayload {
    variantId: string;
    plannedQty: number;
    code?: string;
    notes?: string;
}

export interface CreateNonConformityPayload {
    title: string;
    description: string;
    severity?: QualitySeverity;
    source?: string;
    productionOrderId?: string;
    productionBatchId?: string;
    productionBatchUnitId?: string;
    createdBy?: string;
}

export interface UpdateNonConformityPayload {
    status?: NonConformityStatus;
    rootCause?: string;
    correctiveAction?: string;
    severity?: QualitySeverity;
    description?: string;
    title?: string;
    actor?: string;
}

export interface CreateCapaPayload {
    nonConformityId: string;
    actionPlan: string;
    owner?: string;
    dueDate?: string | Date;
    actor?: string;
}

export interface UpdateCapaPayload {
    actionPlan?: string;
    owner?: string;
    dueDate?: string | Date;
    verificationNotes?: string;
    status?: CapaStatus;
    actor?: string;
}

export interface CreateControlledDocumentPayload {
    code: string;
    title: string;
    process: DocumentProcess;
    version?: number;
    content?: string;
    effectiveDate?: string | Date;
    expiresAt?: string | Date;
    actor?: string;
}

export interface ListControlledDocumentsFilters {
    process?: DocumentProcess;
    status?: DocumentStatus;
}

export interface CreateTechnovigilanceCasePayload {
    title: string;
    description: string;
    type?: TechnovigilanceCaseType;
    severity?: TechnovigilanceSeverity;
    causality?: TechnovigilanceCausality;
    productionOrderId?: string;
    productionBatchId?: string;
    productionBatchUnitId?: string;
    lotCode?: string;
    serialCode?: string;
    createdBy?: string;
}

export interface UpdateTechnovigilanceCasePayload {
    status?: TechnovigilanceStatus;
    severity?: TechnovigilanceSeverity;
    causality?: TechnovigilanceCausality;
    investigationSummary?: string;
    resolution?: string;
    actor?: string;
}

export interface ReportTechnovigilanceCasePayload {
    reportNumber: string;
    reportChannel: TechnovigilanceReportChannel;
    reportPayloadRef?: string;
    reportedAt?: string | Date;
    ackAt?: string | Date;
    actor?: string;
}

export interface CreateRecallCasePayload {
    title: string;
    reason: string;
    scopeType: RecallScopeType;
    lotCode?: string;
    serialCode?: string;
    affectedQuantity: number;
    isMock?: boolean;
    targetResponseMinutes?: number;
    actor?: string;
}

export interface UpdateRecallProgressPayload {
    retrievedQuantity: number;
    actor?: string;
}

export interface CreateRecallNotificationPayload {
    recipientName: string;
    recipientContact: string;
    channel: RecallNotificationChannel;
    evidenceNotes?: string;
    actor?: string;
}

export interface UpdateRecallNotificationPayload {
    status: RecallNotificationStatus;
    sentAt?: string | Date;
    acknowledgedAt?: string | Date;
    evidenceNotes?: string;
    actor?: string;
}

export interface CloseRecallCasePayload {
    closureEvidence: string;
    endedAt?: string | Date;
    actualResponseMinutes?: number;
    actor?: string;
}

export interface UpsertRegulatoryLabelPayload {
    productionBatchId: string;
    productionBatchUnitId?: string;
    scopeType: RegulatoryLabelScopeType;
    deviceType: RegulatoryDeviceType;
    codingStandard: RegulatoryCodingStandard;
    productName: string;
    manufacturerName: string;
    invimaRegistration: string;
    lotCode: string;
    serialCode?: string;
    manufactureDate: string | Date;
    expirationDate?: string | Date;
    gtin?: string;
    udiDi?: string;
    udiPi?: string;
    internalCode?: string;
    actor?: string;
}

export interface ValidateDispatchReadinessPayload {
    productionBatchId: string;
    actor?: string;
}

export interface CreateQualityRiskControlPayload {
    process: DocumentProcess;
    risk: string;
    control: string;
    ownerRole: string;
    status?: QualityRiskControlStatus;
    evidenceRef?: string;
    actor?: string;
}

export interface CreateQualityTrainingEvidencePayload {
    role: string;
    personName: string;
    trainingTopic: string;
    completedAt: string | Date;
    validUntil?: string | Date;
    trainerName?: string;
    evidenceRef?: string;
    actor?: string;
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
        payload: { actor: string; approvalMethod: DocumentApprovalMethod; approvalSignature: string }
    ): Promise<ControlledDocument> => {
        const response = await api.post<ControlledDocument>(`/mrp/quality/documents/${id}/approve`, payload);
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
