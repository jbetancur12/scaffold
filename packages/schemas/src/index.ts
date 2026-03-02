import { z } from 'zod';
import {
    UserRole,
    UnitType,
    WarehouseType,
    ProductionOrderStatus,
    PurchaseOrderStatus,
    PurchaseRequisitionStatus,
    CapaStatus,
    DocumentProcess,
    DocumentCategory,
    DocumentProcessAreaCode,
    DocumentStatus,
    DocumentApprovalMethod,
    NonConformityStatus,
    QualitySeverity,
    TechnovigilanceCaseType,
    TechnovigilanceCausality,
    TechnovigilanceSeverity,
    TechnovigilanceStatus,
    TechnovigilanceReportChannel,
    RecallScopeType,
    RecallStatus,
    RecallNotificationChannel,
    RecallNotificationStatus,
    RegulatoryLabelScopeType,
    RegulatoryDeviceType,
    RegulatoryCodingStandard,
    RegulatoryLabelStatus,
    InvimaRegistrationStatus,
    QualityRiskControlStatus,
    IncomingInspectionResult,
    IncomingInspectionStatus,
    BatchReleaseStatus,
    ProcessDeviationStatus,
    OosCaseStatus,
    OosDisposition,
    ChangeControlType,
    ChangeControlStatus,
    ChangeImpactLevel,
    ChangeApprovalDecision,
    EquipmentStatus,
    EquipmentCalibrationResult,
    EquipmentMaintenanceType,
    EquipmentMaintenanceResult,
    OperationalAlertRole,
    SalesOrderStatus,
} from '@scaffold/types';

export const LoginSchema = z.object({
    email: z.string().email('Correo electrónico inválido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export const RegisterSchema = z.object({
    email: z.string().email('Correo electrónico inválido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    role: z.nativeEnum(UserRole).default(UserRole.USER),
});

export const CreateUserSchema = z.object({
    email: z.string().email('Correo electrónico inválido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    role: z.nativeEnum(UserRole),
});

export const UpdateUserSchema = z.object({
    email: z.string().email('Correo electrónico inválido').optional(),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').optional(),
    role: z.nativeEnum(UserRole).optional(),
});

// MRP Schemas

export const SupplierSchema = z.object({
    name: z.string().min(1, 'El nombre es obligatorio'),
    contactName: z.string().optional(),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    department: z.string().optional(),
    bankDetails: z.string().optional(),
    paymentConditions: z.string().optional(),
    notes: z.string().optional(),
});

export const CustomerSchema = z.object({
    name: z.string().min(2, 'El nombre es obligatorio'),
    documentType: z.string().optional(),
    documentNumber: z.string().optional(),
    contactName: z.string().optional(),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
});

export const ListCustomersQuerySchema = z.object({
    search: z.string().optional(),
});

export const ProductCsvImportSchema = z.object({
    csvText: z.string().min(1, 'El contenido CSV es obligatorio'),
    actor: z.string().optional(),
});

export const SupplierCsvImportSchema = z.object({
    csvText: z.string().min(1, 'El contenido CSV es obligatorio'),
    actor: z.string().optional(),
});

export const CustomerCsvImportSchema = z.object({
    csvText: z.string().min(1, 'El contenido CSV es obligatorio'),
    actor: z.string().optional(),
});

export const RawMaterialSchema = z.object({
    name: z.string().min(1, 'El nombre es obligatorio'),
    sku: z.string().min(1, 'SKU es obligatorio'),
    unit: z.nativeEnum(UnitType),
    cost: z.number().min(0),
    minStockLevel: z.number().min(0).optional(),
    supplierId: z.string().uuid().optional(),
});

export const PurchaseRecordSchema = z.object({
    rawMaterialId: z.string().uuid(),
    supplierId: z.string().uuid(),
    price: z.number().min(0),
    date: z.string().or(z.date()),
});

const ProductBaseSchema = z.object({
    name: z.string().min(1, 'El nombre es obligatorio'),
    description: z.string().optional(),
    sku: z.string().min(1, 'SKU es obligatorio'),
    categoryId: z.string().uuid().optional(),
    requiresInvima: z.boolean().default(false),
    productReference: z.string().min(2).optional(),
    invimaRegistrationId: z.string().uuid().optional(),
});

const validateProductInvima = (
    data: { requiresInvima?: boolean; invimaRegistrationId?: string; productReference?: string },
    ctx: z.RefinementCtx
) => {
    if (data.requiresInvima && !data.invimaRegistrationId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['invimaRegistrationId'],
            message: 'Debes seleccionar un registro INVIMA para producto regulado',
        });
    }
    if (data.requiresInvima && !data.productReference) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['productReference'],
            message: 'Debes indicar la referencia del producto regulado',
        });
    }
};

export const ProductSchema = ProductBaseSchema.superRefine(validateProductInvima);
export const UpdateProductSchema = ProductBaseSchema.partial().superRefine(validateProductInvima);

export const ProductVariantSchema = z.object({
    productId: z.string().uuid(),
    name: z.string().min(1, 'El nombre es obligatorio'),
    sku: z.string().min(1, 'SKU es obligatorio'),
    price: z.number().min(0),
    cost: z.number().min(0),
    referenceCost: z.number().min(0).optional(),
    laborCost: z.number().min(0),
    indirectCost: z.number().min(0),
    targetMargin: z.number().min(0).max(1).default(0.4),
    productionMinutes: z.number().min(0).optional(),
});

export const CreateProductVariantSchema = z.object({
    name: z.string().min(1, 'El nombre es obligatorio'),
    sku: z.string().min(1, 'SKU es obligatorio'),
    price: z.number().min(0),
    targetMargin: z.number().min(0).max(1).default(0.4),
    productionMinutes: z.number().min(0).optional(),
});

export const UpdateProductVariantSchema = CreateProductVariantSchema.partial();

export const BOMItemSchema = z.object({
    variantId: z.string().uuid(),
    rawMaterialId: z.string().uuid(),
    quantity: z.number().min(0),
    fabricationParams: z.object({
        calculationType: z.enum(['area', 'linear']).default('area'),
        quantityPerUnit: z.number().default(1),
        rollWidth: z.number(), // Used as "Material Length" in linear mode if needed, or specific field
        pieceWidth: z.number(),
        pieceLength: z.number(),
        orientation: z.enum(['normal', 'rotated'])
    }).optional(),
});

export const WarehouseSchema = z.object({
    name: z.string().min(1, 'El nombre es obligatorio'),
    location: z.string().optional(),
    type: z.nativeEnum(WarehouseType),
});

export const InventoryItemSchema = z.object({
    warehouseId: z.string().uuid(),
    rawMaterialId: z.string().uuid().optional(),
    variantId: z.string().uuid().optional(),
    quantity: z.number(),
}).refine(data => data.rawMaterialId || data.variantId, {
    message: "Debe especificar un Material o una Variante",
    path: ["rawMaterialId", "variantId"]
});

export const ProductionOrderSchema = z.object({
    code: z.string().min(1, 'El código es obligatorio'),
    status: z.nativeEnum(ProductionOrderStatus),
    startDate: z.string().or(z.date()).optional(),
    endDate: z.string().or(z.date()).optional(),
    notes: z.string().optional(),
    salesOrderId: z.string().uuid().optional(),
});

export const ProductionOrderItemSchema = z.object({
    productionOrderId: z.string().uuid(),
    variantId: z.string().uuid(),
    quantity: z.number().int().min(1, 'La cantidad debe ser al menos 1'),
});

export const ProductionOrderItemCreateSchema = z.object({
    variantId: z.string().uuid(),
    quantity: z.number().int().min(1, 'La cantidad debe ser al menos 1'),
});

export const CreatePurchaseOrderSchema = z.object({
    supplierId: z.string().uuid(),
    controlledDocumentId: z.string().uuid().optional(),
    expectedDeliveryDate: z.preprocess((val) => (val === '' ? undefined : val), z.coerce.date().optional()),
    notes: z.string().optional(),
    purchaseType: z.string().min(1).optional(),
    paymentMethod: z.string().min(1).optional(),
    currency: z.string().min(1).optional(),
    discountAmount: z.number().min(0).optional(),
    withholdingRate: z.number().min(0).max(100).optional(),
    withholdingAmount: z.number().min(0).optional(),
    otherChargesAmount: z.number().min(0).optional(),
    netTotalAmount: z.number().min(0).optional(),
    warehouseId: z.string().uuid().optional(),
    items: z.array(z.union([
        z.object({
            isCatalogItem: z.literal(true).optional(),
            rawMaterialId: z.string().uuid(),
            quantity: z.number().min(0.01),
            unitPrice: z.number().min(0),
            taxAmount: z.number().min(0).optional(),
            isInventoriable: z.boolean().optional(),
        }),
        z.object({
            isCatalogItem: z.literal(false),
            customDescription: z.string().min(2),
            customUnit: z.string().min(1),
            quantity: z.number().min(0.01),
            unitPrice: z.number().min(0),
            taxAmount: z.number().min(0).optional(),
            isInventoriable: z.boolean().optional(),
        }),
    ])).min(1),
});

export const CreatePurchaseRequisitionSchema = z.object({
    requestedBy: z.string().min(2),
    productionOrderId: z.string().uuid().optional(),
    neededBy: z.preprocess((val) => (val === '' ? undefined : val), z.coerce.date().optional()),
    notes: z.string().optional(),
    items: z.array(z.object({
        rawMaterialId: z.string().uuid(),
        quantity: z.number().min(0.01),
        suggestedSupplierId: z.string().uuid().optional(),
        notes: z.string().optional(),
    })).min(1),
});

export const CreatePurchaseRequisitionFromProductionOrderSchema = z.object({
    requestedBy: z.string().min(2),
    neededBy: z.preprocess((val) => (val === '' ? undefined : val), z.coerce.date().optional()),
    notes: z.string().optional(),
});

export const ManualStockSchema = z.object({
    rawMaterialId: z.string().uuid(),
    quantity: z.number().min(0.01),
    unitCost: z.number().min(0),
    warehouseId: z.string().uuid().optional(),
});

export const CreateProductionOrderSchema = z.object({
    startDate: z.string().or(z.date()).optional(),
    endDate: z.string().or(z.date()).optional(),
    notes: z.string().optional(),
    salesOrderId: z.string().uuid().optional(),
    items: z.array(ProductionOrderItemCreateSchema).min(1, 'Debe agregar al menos un item'),
});

export const CreateProductionBatchSchema = z.object({
    variantId: z.string().uuid(),
    plannedQty: z.number().int().positive(),
    code: z.string().min(3).optional(),
    notes: z.string().optional(),
});

export const AddProductionBatchUnitsSchema = z.object({
    quantity: z.number().int().positive(),
});

export const UpdateProductionBatchQcSchema = z.object({
    passed: z.boolean(),
});

export const UpdateProductionBatchPackagingSchema = z.object({
    packed: z.boolean(),
});

export const UpdateProductionBatchUnitQcSchema = z.object({
    passed: z.boolean(),
});

export const UpdateProductionBatchUnitPackagingSchema = z.object({
    packaged: z.boolean(),
});

export const UpsertProductionBatchPackagingFormSchema = z.object({
    operatorName: z.string().min(2),
    verifierName: z.string().min(2),
    quantityToPack: z.number().positive(),
    quantityPacked: z.number().nonnegative(),
    lotLabel: z.string().min(4),
    hasTechnicalSheet: z.boolean(),
    hasLabels: z.boolean(),
    hasPackagingMaterial: z.boolean(),
    hasTools: z.boolean(),
    inventoryRecorded: z.boolean(),
    observations: z.string().optional(),
    nonConformity: z.string().optional(),
    correctiveAction: z.string().optional(),
    preventiveAction: z.string().optional(),
    controlledDocumentId: z.string().uuid().optional(),
    actor: z.string().optional(),
});

export const ReturnProductionMaterialSchema = z.object({
    rawMaterialId: z.string().uuid(),
    lotId: z.string().uuid(),
    quantity: z.number().positive(),
    notes: z.string().optional(),
    actor: z.string().optional(),
});

export const PaginationQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
});

export const ListRawMaterialsQuerySchema = PaginationQuerySchema.extend({
    search: z.string().optional(),
});

export const ListProductsQuerySchema = PaginationQuerySchema.extend({
    search: z.string().optional(),
});

export const AddSupplierMaterialSchema = z.object({
    rawMaterialId: z.string().uuid(),
    price: z.number().min(0).optional(),
});

export const UpdateProductionOrderStatusSchema = z.object({
    status: z.nativeEnum(ProductionOrderStatus),
    warehouseId: z.string().uuid().optional(),
});

export const UpsertProductionMaterialAllocationSchema = z.object({
    rawMaterialId: z.string().uuid(),
    lotId: z.string().uuid().optional(),
    quantityRequested: z.number().positive().optional(),
    notes: z.string().optional(),
});

export const InventoryQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    warehouseId: z.string().uuid().optional(),
});

export const InventoryKardexQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    rawMaterialId: z.string().uuid().optional(),
    supplierLotCode: z.string().trim().min(1).optional(),
    referenceId: z.string().trim().min(1).optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
});

export const ListPurchaseOrdersQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    status: z.nativeEnum(PurchaseOrderStatus).optional(),
    supplierId: z.string().uuid().optional(),
});

export const ListPurchaseRequisitionsQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    status: z.nativeEnum(PurchaseRequisitionStatus).optional(),
    productionOrderId: z.string().uuid().optional(),
});

export const UpdatePurchaseRequisitionStatusSchema = z.object({
    status: z.nativeEnum(PurchaseRequisitionStatus),
});

export const MarkPurchaseRequisitionConvertedSchema = z.object({
    purchaseOrderId: z.string().uuid(),
});

export const UpdatePurchaseOrderStatusSchema = z.object({
    status: z.nativeEnum(PurchaseOrderStatus),
});

export const ReceivePurchaseOrderSchema = z.object({
    warehouseId: z.string().uuid().optional(),
});

export const CreateNonConformitySchema = z.object({
    title: z.string().min(3),
    description: z.string().min(5),
    severity: z.nativeEnum(QualitySeverity).optional(),
    source: z.string().optional(),
    productionOrderId: z.string().uuid().optional(),
    productionBatchId: z.string().uuid().optional(),
    productionBatchUnitId: z.string().uuid().optional(),
    incomingInspectionId: z.string().uuid().optional(),
    createdBy: z.string().optional(),
});

export const ListNonConformitiesQuerySchema = z.object({
    status: z.nativeEnum(NonConformityStatus).optional(),
    severity: z.nativeEnum(QualitySeverity).optional(),
    source: z.string().optional(),
});

export const UpdateNonConformitySchema = z.object({
    status: z.nativeEnum(NonConformityStatus).optional(),
    rootCause: z.string().optional(),
    correctiveAction: z.string().optional(),
    severity: z.nativeEnum(QualitySeverity).optional(),
    description: z.string().optional(),
    title: z.string().optional(),
    actor: z.string().optional(),
});

export const CreateCapaSchema = z.object({
    nonConformityId: z.string().uuid(),
    actionPlan: z.string().min(5),
    owner: z.string().optional(),
    dueDate: z.coerce.date().optional(),
    actor: z.string().optional(),
});

export const ListCapasQuerySchema = z.object({
    status: z.nativeEnum(CapaStatus).optional(),
    nonConformityId: z.string().uuid().optional(),
});

export const UpdateCapaSchema = z.object({
    actionPlan: z.string().optional(),
    owner: z.string().optional(),
    dueDate: z.coerce.date().optional(),
    verificationNotes: z.string().optional(),
    status: z.nativeEnum(CapaStatus).optional(),
    actor: z.string().optional(),
});

export const CreateProcessDeviationSchema = z.object({
    title: z.string().min(3),
    description: z.string().min(5),
    classification: z.string().min(2).optional(),
    productionOrderId: z.string().uuid().optional(),
    productionBatchId: z.string().uuid().optional(),
    productionBatchUnitId: z.string().uuid().optional(),
    containmentAction: z.string().optional(),
    investigationSummary: z.string().optional(),
    closureEvidence: z.string().optional(),
    capaActionId: z.string().uuid().optional(),
    actor: z.string().optional(),
});

export const UpdateProcessDeviationSchema = z.object({
    title: z.string().min(3).optional(),
    description: z.string().min(5).optional(),
    classification: z.string().min(2).optional(),
    status: z.nativeEnum(ProcessDeviationStatus).optional(),
    containmentAction: z.string().optional(),
    investigationSummary: z.string().optional(),
    closureEvidence: z.string().optional(),
    capaActionId: z.string().uuid().optional(),
    actor: z.string().optional(),
});

export const ListProcessDeviationsQuerySchema = z.object({
    status: z.nativeEnum(ProcessDeviationStatus).optional(),
    productionBatchId: z.string().uuid().optional(),
    productionOrderId: z.string().uuid().optional(),
});

export const CreateOosCaseSchema = z.object({
    testName: z.string().min(2),
    resultValue: z.string().min(1),
    specification: z.string().min(2),
    productionOrderId: z.string().uuid().optional(),
    productionBatchId: z.string().uuid().optional(),
    productionBatchUnitId: z.string().uuid().optional(),
    investigationSummary: z.string().optional(),
    disposition: z.nativeEnum(OosDisposition).optional(),
    decisionNotes: z.string().optional(),
    capaActionId: z.string().uuid().optional(),
    actor: z.string().optional(),
});

export const UpdateOosCaseSchema = z.object({
    testName: z.string().min(2).optional(),
    resultValue: z.string().min(1).optional(),
    specification: z.string().min(2).optional(),
    status: z.nativeEnum(OosCaseStatus).optional(),
    investigationSummary: z.string().optional(),
    disposition: z.nativeEnum(OosDisposition).optional(),
    decisionNotes: z.string().optional(),
    capaActionId: z.string().uuid().optional(),
    actor: z.string().optional(),
});

export const ListOosCasesQuerySchema = z.object({
    status: z.nativeEnum(OosCaseStatus).optional(),
    productionBatchId: z.string().uuid().optional(),
    productionOrderId: z.string().uuid().optional(),
});

export const CreateChangeControlSchema = z.object({
    title: z.string().min(3),
    description: z.string().min(5),
    type: z.nativeEnum(ChangeControlType),
    impactLevel: z.nativeEnum(ChangeImpactLevel).optional(),
    evaluationSummary: z.string().optional(),
    requestedBy: z.string().optional(),
    effectiveDate: z.coerce.date().optional(),
    linkedDocumentId: z.string().uuid().optional(),
    affectedProductionOrderId: z.string().uuid().optional(),
    affectedProductionBatchId: z.string().uuid().optional(),
    beforeChangeBatchCode: z.string().optional(),
    afterChangeBatchCode: z.string().optional(),
    actor: z.string().optional(),
});

export const UpdateChangeControlSchema = z.object({
    title: z.string().min(3).optional(),
    description: z.string().min(5).optional(),
    type: z.nativeEnum(ChangeControlType).optional(),
    impactLevel: z.nativeEnum(ChangeImpactLevel).optional(),
    status: z.nativeEnum(ChangeControlStatus).optional(),
    evaluationSummary: z.string().optional(),
    requestedBy: z.string().optional(),
    effectiveDate: z.coerce.date().optional(),
    linkedDocumentId: z.string().uuid().optional(),
    affectedProductionOrderId: z.string().uuid().optional(),
    affectedProductionBatchId: z.string().uuid().optional(),
    beforeChangeBatchCode: z.string().optional(),
    afterChangeBatchCode: z.string().optional(),
    actor: z.string().optional(),
});

export const ListChangeControlsQuerySchema = z.object({
    status: z.nativeEnum(ChangeControlStatus).optional(),
    type: z.nativeEnum(ChangeControlType).optional(),
    impactLevel: z.nativeEnum(ChangeImpactLevel).optional(),
    affectedProductionBatchId: z.string().uuid().optional(),
    affectedProductionOrderId: z.string().uuid().optional(),
});

export const CreateChangeControlApprovalSchema = z.object({
    changeControlId: z.string().uuid(),
    role: z.string().min(2),
    approver: z.string().optional(),
    decision: z.nativeEnum(ChangeApprovalDecision),
    decisionNotes: z.string().optional(),
    actor: z.string().optional(),
});

export const ListQualityAuditQuerySchema = z.object({
    entityType: z.string().optional(),
    entityId: z.string().optional(),
});

export const CreateTechnovigilanceCaseSchema = z.object({
    title: z.string().min(3),
    description: z.string().min(5),
    type: z.nativeEnum(TechnovigilanceCaseType).optional(),
    severity: z.nativeEnum(TechnovigilanceSeverity).optional(),
    causality: z.nativeEnum(TechnovigilanceCausality).optional(),
    productionOrderId: z.string().uuid().optional(),
    productionBatchId: z.string().uuid().optional(),
    productionBatchUnitId: z.string().uuid().optional(),
    lotCode: z.string().optional(),
    serialCode: z.string().optional(),
    createdBy: z.string().optional(),
});

export const ListTechnovigilanceCasesQuerySchema = z.object({
    status: z.nativeEnum(TechnovigilanceStatus).optional(),
    type: z.nativeEnum(TechnovigilanceCaseType).optional(),
    severity: z.nativeEnum(TechnovigilanceSeverity).optional(),
    causality: z.nativeEnum(TechnovigilanceCausality).optional(),
    reportedToInvima: z.coerce.boolean().optional(),
});

export const UpdateTechnovigilanceCaseSchema = z.object({
    status: z.nativeEnum(TechnovigilanceStatus).optional(),
    severity: z.nativeEnum(TechnovigilanceSeverity).optional(),
    causality: z.nativeEnum(TechnovigilanceCausality).optional(),
    investigationSummary: z.string().optional(),
    resolution: z.string().optional(),
    actor: z.string().optional(),
});

export const ReportTechnovigilanceCaseSchema = z.object({
    reportNumber: z.string().min(3),
    reportChannel: z.nativeEnum(TechnovigilanceReportChannel),
    reportPayloadRef: z.string().optional(),
    reportedAt: z.coerce.date().optional(),
    ackAt: z.coerce.date().optional(),
    actor: z.string().optional(),
});

export const CreateControlledDocumentSchema = z.object({
    code: z.string().min(2),
    title: z.string().min(3),
    process: z.nativeEnum(DocumentProcess),
    documentCategory: z.nativeEnum(DocumentCategory),
    processAreaCode: z.nativeEnum(DocumentProcessAreaCode),
    version: z.number().int().positive().optional(),
    content: z.string().optional(),
    effectiveDate: z.coerce.date().optional(),
    expiresAt: z.coerce.date().optional(),
    actor: z.string().optional(),
}).superRefine((data, ctx) => {
    const expectedPrefix = `${data.processAreaCode.toUpperCase()}-${data.documentCategory.toUpperCase()}-`;
    if (!data.code.toUpperCase().startsWith(expectedPrefix)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['code'],
            message: `El código debe iniciar por ${expectedPrefix}`,
        });
    }
});

export const UploadControlledDocumentSourceSchema = z.object({
    fileName: z.string().min(1),
    mimeType: z.string().min(3),
    base64Data: z.string().min(8),
    actor: z.string().optional(),
});

export const ListControlledDocumentsQuerySchema = z.object({
    process: z.nativeEnum(DocumentProcess).optional(),
    documentCategory: z.nativeEnum(DocumentCategory).optional(),
    processAreaCode: z.nativeEnum(DocumentProcessAreaCode).optional(),
    status: z.nativeEnum(DocumentStatus).optional(),
});

export const ActorPayloadSchema = z.object({
    actor: z.string().optional(),
});

export const ApproveControlledDocumentSchema = z.object({
    actor: z.string().min(2),
    approvalMethod: z.nativeEnum(DocumentApprovalMethod),
    approvalSignature: z.string().min(4),
});

export const ActiveControlledDocumentsByProcessParamsSchema = z.object({
    process: z.nativeEnum(DocumentProcess),
});

export const CreateRecallCaseSchema = z.object({
    title: z.string().min(3),
    reason: z.string().min(5),
    scopeType: z.nativeEnum(RecallScopeType),
    lotCode: z.string().optional(),
    serialCode: z.string().optional(),
    affectedQuantity: z.number().int().positive(),
    isMock: z.boolean().optional(),
    targetResponseMinutes: z.number().int().positive().optional(),
    actor: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.scopeType === RecallScopeType.LOTE && !data.lotCode) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['lotCode'], message: 'El lote es obligatorio para retiro por lote' });
    }
    if (data.scopeType === RecallScopeType.SERIAL && !data.serialCode) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['serialCode'], message: 'El serial es obligatorio para retiro por serial' });
    }
});

export const ListRecallCasesQuerySchema = z.object({
    status: z.nativeEnum(RecallStatus).optional(),
    isMock: z.coerce.boolean().optional(),
});

export const ShipmentItemInputSchema = z.object({
    productionBatchId: z.string().uuid(),
    productionBatchUnitId: z.string().uuid().optional(),
    quantity: z.number().positive(),
});

export const CreateShipmentSchema = z.object({
    customerId: z.string().uuid(),
    commercialDocument: z.string().min(3),
    shippedAt: z.coerce.date().optional(),
    dispatchedBy: z.string().optional(),
    notes: z.string().optional(),
    items: z.array(ShipmentItemInputSchema).min(1),
});

export const ListShipmentsQuerySchema = z.object({
    customerId: z.string().uuid().optional(),
    productionBatchId: z.string().uuid().optional(),
    serialCode: z.string().optional(),
    commercialDocument: z.string().optional(),
});

export const CreateDmrTemplateSchema = z.object({
    productId: z.string().uuid().optional(),
    process: z.nativeEnum(DocumentProcess),
    code: z.string().min(2),
    title: z.string().min(3),
    version: z.number().int().positive().default(1),
    sections: z.array(z.string().min(2)).min(1),
    requiredEvidence: z.array(z.string().min(2)).default([]),
    isActive: z.boolean().optional(),
    createdBy: z.string().optional(),
    approvedBy: z.string().optional(),
    approvedAt: z.coerce.date().optional(),
});

export const ListDmrTemplatesQuerySchema = z.object({
    productId: z.string().uuid().optional(),
    process: z.nativeEnum(DocumentProcess).optional(),
    isActive: z.coerce.boolean().optional(),
});

export const ExportBatchDhrQuerySchema = z.object({
    format: z.enum(['csv', 'json']).default('json'),
    actor: z.string().optional(),
});

export const UpdateRecallProgressSchema = z.object({
    retrievedQuantity: z.number().int().nonnegative(),
    actor: z.string().optional(),
});

export const CreateRecallNotificationSchema = z.object({
    recipientName: z.string().min(2),
    recipientContact: z.string().min(3),
    channel: z.nativeEnum(RecallNotificationChannel),
    evidenceNotes: z.string().optional(),
    actor: z.string().optional(),
});

export const UpdateRecallNotificationSchema = z.object({
    status: z.nativeEnum(RecallNotificationStatus),
    sentAt: z.coerce.date().optional(),
    acknowledgedAt: z.coerce.date().optional(),
    evidenceNotes: z.string().optional(),
    actor: z.string().optional(),
});

export const CloseRecallCaseSchema = z.object({
    closureEvidence: z.string().min(10),
    endedAt: z.coerce.date().optional(),
    actualResponseMinutes: z.number().int().positive().optional(),
    actor: z.string().optional(),
});

export const UpsertRegulatoryLabelSchema = z.object({
    productionBatchId: z.string().uuid(),
    productionBatchUnitId: z.string().uuid().optional(),
    scopeType: z.nativeEnum(RegulatoryLabelScopeType),
    deviceType: z.nativeEnum(RegulatoryDeviceType),
    codingStandard: z.nativeEnum(RegulatoryCodingStandard),
    productName: z.string().min(3).optional(),
    manufacturerName: z.string().min(3).optional(),
    invimaRegistration: z.string().min(3).optional(),
    lotCode: z.string().min(2).optional(),
    serialCode: z.string().optional(),
    manufactureDate: z.coerce.date(),
    expirationDate: z.coerce.date().optional(),
    gtin: z.string().optional(),
    udiDi: z.string().optional(),
    udiPi: z.string().optional(),
    internalCode: z.string().optional(),
    actor: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.scopeType === RegulatoryLabelScopeType.SERIAL && !data.productionBatchUnitId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['productionBatchUnitId'],
            message: 'Para etiqueta serial debes enviar productionBatchUnitId',
        });
    }
});

export const CreateInvimaRegistrationSchema = z.object({
    code: z.string().min(5),
    holderName: z.string().min(2),
    manufacturerName: z.string().min(2).optional(),
    validFrom: z.coerce.date().optional(),
    validUntil: z.coerce.date().optional(),
    status: z.nativeEnum(InvimaRegistrationStatus).default(InvimaRegistrationStatus.ACTIVO),
    notes: z.string().optional(),
});

export const UpdateInvimaRegistrationSchema = CreateInvimaRegistrationSchema.partial();

export const ListInvimaRegistrationsQuerySchema = z.object({
    status: z.nativeEnum(InvimaRegistrationStatus).optional(),
});

export const ListRegulatoryLabelsQuerySchema = z.object({
    productionBatchId: z.string().uuid().optional(),
    scopeType: z.nativeEnum(RegulatoryLabelScopeType).optional(),
    status: z.nativeEnum(RegulatoryLabelStatus).optional(),
});

export const ValidateDispatchReadinessSchema = z.object({
    productionBatchId: z.string().uuid(),
    actor: z.string().optional(),
});

export const ComplianceExportQuerySchema = z.object({
    format: z.enum(['csv', 'json']).default('csv'),
});

export const CreateQualityRiskControlSchema = z.object({
    process: z.nativeEnum(DocumentProcess),
    risk: z.string().min(5),
    control: z.string().min(5),
    ownerRole: z.string().min(2),
    status: z.nativeEnum(QualityRiskControlStatus).optional(),
    evidenceRef: z.string().optional(),
    actor: z.string().optional(),
});

export const ListQualityRiskControlsQuerySchema = z.object({
    process: z.nativeEnum(DocumentProcess).optional(),
    status: z.nativeEnum(QualityRiskControlStatus).optional(),
});

export const CreateQualityTrainingEvidenceSchema = z.object({
    role: z.string().min(2),
    personName: z.string().min(2),
    trainingTopic: z.string().min(3),
    completedAt: z.coerce.date(),
    validUntil: z.coerce.date().optional(),
    trainerName: z.string().optional(),
    evidenceRef: z.string().optional(),
    actor: z.string().optional(),
});

export const ListQualityTrainingEvidenceQuerySchema = z.object({
    role: z.string().optional(),
});

export const ListIncomingInspectionsQuerySchema = z.object({
    status: z.nativeEnum(IncomingInspectionStatus).optional(),
    rawMaterialId: z.string().uuid().optional(),
    purchaseOrderId: z.string().uuid().optional(),
});

export const ResolveIncomingInspectionSchema = z.object({
    inspectionResult: z.nativeEnum(IncomingInspectionResult),
    controlledDocumentId: z.string().uuid().optional(),
    supplierLotCode: z.string().optional(),
    certificateRef: z.string().optional(),
    invoiceNumber: z.string().optional(),
    notes: z.string().optional(),
    quantityAccepted: z.number().nonnegative(),
    quantityRejected: z.number().nonnegative(),
    acceptedUnitCost: z.number().nonnegative().optional(),
    inspectedBy: z.string().min(2),
    approvedBy: z.string().min(2),
    managerApprovedBy: z.string().optional(),
    actor: z.string().optional(),
}).superRefine((data, ctx) => {
    if (
        data.inspectionResult !== IncomingInspectionResult.CONDICIONAL &&
        data.quantityAccepted === 0 &&
        data.quantityRejected === 0
    ) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['quantityAccepted'], message: 'Debes registrar cantidad aceptada o rechazada' });
    }
    if (data.inspectionResult === IncomingInspectionResult.APROBADO && data.quantityRejected > 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['quantityRejected'],
            message: 'Si el resultado es aprobado, la cantidad rechazada debe ser 0',
        });
    }
    if (data.inspectionResult === IncomingInspectionResult.RECHAZADO && data.quantityAccepted > 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['quantityAccepted'],
            message: 'Si el resultado es rechazado, la cantidad aceptada debe ser 0',
        });
    }
    if (data.inspectionResult === IncomingInspectionResult.APROBADO && data.quantityAccepted === 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['quantityAccepted'],
            message: 'Si el resultado es aprobado, la cantidad aceptada debe ser mayor a 0',
        });
    }
    if (data.inspectionResult === IncomingInspectionResult.RECHAZADO && data.quantityRejected === 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['quantityRejected'],
            message: 'Si el resultado es rechazado, la cantidad rechazada debe ser mayor a 0',
        });
    }
    if (
        data.inspectionResult === IncomingInspectionResult.CONDICIONAL &&
        (data.quantityAccepted !== 0 || data.quantityRejected !== 0)
    ) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['quantityAccepted'],
            message: 'Resultado condicional no libera cantidades: registra 0 aceptado y 0 rechazado',
        });
    }
    if (data.quantityAccepted > 0 && !data.supplierLotCode?.trim()) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['supplierLotCode'],
            message: 'Debes registrar el lote del proveedor cuando existe cantidad aceptada',
        });
    }
    if (
        (data.inspectionResult === IncomingInspectionResult.CONDICIONAL ||
            data.inspectionResult === IncomingInspectionResult.RECHAZADO) &&
        (!data.notes || data.notes.trim().length < 10)
    ) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['notes'],
            message: 'Para resultado condicional o rechazado, registra notas de al menos 10 caracteres',
        });
    }
    if (
        (data.inspectionResult === IncomingInspectionResult.CONDICIONAL ||
            data.inspectionResult === IncomingInspectionResult.RECHAZADO) &&
        !data.managerApprovedBy?.trim()
    ) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['managerApprovedBy'],
            message: 'Para condicional o rechazado debes registrar aprobación del jefe de calidad',
        });
    }
});

export const CorrectIncomingInspectionCostSchema = z.object({
    acceptedUnitCost: z.number().positive(),
    reason: z.string().min(5),
    actor: z.string().optional(),
});

export const IncomingInspectionEvidenceTypeSchema = z.enum(['invoice', 'certificate']);

export const UploadIncomingInspectionEvidenceSchema = z.object({
    fileName: z.string().min(1),
    mimeType: z.string().min(3),
    base64Data: z.string().min(8),
    actor: z.string().optional(),
});

export const UpsertBatchReleaseChecklistSchema = z.object({
    productionBatchId: z.string().uuid(),
    qcApproved: z.boolean(),
    labelingValidated: z.boolean(),
    documentsCurrent: z.boolean(),
    evidencesComplete: z.boolean(),
    checklistNotes: z.string().optional(),
    rejectedReason: z.string().optional(),
    actor: z.string().optional(),
});

export const SignBatchReleaseSchema = z.object({
    actor: z.string().min(2),
    approvalMethod: z.nativeEnum(DocumentApprovalMethod),
    approvalSignature: z.string().min(4),
});

export const ListBatchReleasesQuerySchema = z.object({
    productionBatchId: z.string().uuid().optional(),
    status: z.nativeEnum(BatchReleaseStatus).optional(),
});

export const CreateEquipmentSchema = z.object({
    code: z.string().min(2),
    name: z.string().min(3),
    area: z.string().optional(),
    isCritical: z.boolean().optional(),
    status: z.nativeEnum(EquipmentStatus).optional(),
    calibrationFrequencyDays: z.number().int().positive().optional(),
    maintenanceFrequencyDays: z.number().int().positive().optional(),
    notes: z.string().optional(),
    actor: z.string().optional(),
});

export const UpdateEquipmentSchema = CreateEquipmentSchema.partial();

export const ListEquipmentQuerySchema = z.object({
    status: z.nativeEnum(EquipmentStatus).optional(),
    isCritical: z.coerce.boolean().optional(),
});

export const CreateEquipmentCalibrationSchema = z.object({
    executedAt: z.coerce.date().optional(),
    dueAt: z.coerce.date().optional(),
    result: z.nativeEnum(EquipmentCalibrationResult).optional(),
    certificateRef: z.string().optional(),
    evidenceRef: z.string().optional(),
    performedBy: z.string().optional(),
    notes: z.string().optional(),
    actor: z.string().optional(),
});

export const CreateEquipmentMaintenanceSchema = z.object({
    executedAt: z.coerce.date().optional(),
    dueAt: z.coerce.date().optional(),
    type: z.nativeEnum(EquipmentMaintenanceType).optional(),
    result: z.nativeEnum(EquipmentMaintenanceResult).optional(),
    evidenceRef: z.string().optional(),
    performedBy: z.string().optional(),
    notes: z.string().optional(),
    actor: z.string().optional(),
});

export const RegisterBatchEquipmentUsageSchema = z.object({
    productionBatchId: z.string().uuid(),
    equipmentId: z.string().uuid(),
    usedAt: z.coerce.date().optional(),
    usedBy: z.string().optional(),
    notes: z.string().optional(),
    actor: z.string().optional(),
});

export const ListEquipmentUsageQuerySchema = z.object({
    productionBatchId: z.string().uuid().optional(),
    equipmentId: z.string().uuid().optional(),
});

export const ListEquipmentAlertsQuerySchema = z.object({
    daysAhead: z.coerce.number().int().positive().max(365).optional(),
});

export const ListOperationalAlertsQuerySchema = z.object({
    role: z.nativeEnum(OperationalAlertRole).optional(),
    daysAhead: z.coerce.number().int().positive().max(90).optional(),
});

export const ExportWeeklyComplianceReportQuerySchema = z.object({
    role: z.nativeEnum(OperationalAlertRole).optional(),
    daysAhead: z.coerce.number().int().positive().max(90).optional(),
    format: z.enum(['csv', 'json']).default('json'),
});

export const OperationalConfigSchema = z.object({
    // MOD
    operatorSalary: z.number().min(0, 'Salario debe ser mayor o igual a 0'),
    operatorLoadFactor: z.number().min(1, 'El factor prestacional debe incluir el salario (min 1.0)'),
    operatorRealMonthlyMinutes: z.number().min(1, 'Minutos reales deben ser mayor a 0'),

    // CIF
    rent: z.number().min(0, 'El arriendo debe ser mayor o igual a 0'),
    utilities: z.number().min(0, 'Servicios deben ser mayor o igual a 0'),
    adminSalaries: z.number().min(0, 'Nómina administrativa debe ser mayor o igual a 0'),
    otherExpenses: z.number().min(0, 'Otros gastos deben ser mayor o igual a 0'),

    numberOfOperators: z.number().min(1, 'Debe haber al menos 1 operario'),
    purchasePaymentMethods: z.array(z.string().min(1, 'Forma de pago inválida')).min(1, 'Debe haber al menos una forma de pago'),
    defaultPurchaseOrderControlledDocumentId: z.string().uuid().nullish(),
    defaultPurchaseOrderControlledDocumentCode: z.string().min(1).nullish(),
    defaultIncomingInspectionControlledDocumentCode: z.string().min(1).nullish(),
    defaultPackagingControlledDocumentCode: z.string().min(1).nullish(),
    defaultLabelingControlledDocumentCode: z.string().min(1).nullish(),
    defaultBatchReleaseControlledDocumentCode: z.string().min(1).nullish(),
    defaultSalesOrderProductionDocCode: z.string().min(1).nullish(),
    defaultSalesOrderBillingDocCode: z.string().min(1).nullish(),
    purchaseOrderPrefix: z.string().nullish(),
    operationMode: z.enum(['lote', 'serial']).nullish(),
    uvtValue: z.number().min(0, 'El valor del UVT debe ser mayor o igual a 0').nullish(),
    purchaseWithholdingRules: z.array(
        z.object({
            key: z.string().min(1),
            label: z.string().min(1),
            rate: z.number().min(0).max(100),
            active: z.boolean().optional().default(true),
            baseUvtLimit: z.number().min(0, 'El límite base debe ser mayor o igual a 0').optional(),
        })
    ).min(1, 'Debe haber al menos una regla de retención'),
});

export const CreateSalesOrderSchema = z.object({
    customerId: z.string().uuid(),
    expectedDeliveryDate: z.preprocess((val) => (val === '' ? undefined : val), z.coerce.date().optional()),
    notes: z.string().optional(),
    items: z.array(z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        quantity: z.number().positive('La cantidad debe ser mayor a 0'),
        unitPrice: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
        taxRate: z.number().min(0).optional()
    })).min(1, 'El pedido debe tener al menos un ítem'),
});

export const UpdateSalesOrderSchema = CreateSalesOrderSchema;

export const ListSalesOrdersQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
    status: z.nativeEnum(SalesOrderStatus).optional(),
});

export const UpdateSalesOrderStatusSchema = z.object({
    status: z.nativeEnum(SalesOrderStatus),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
export type CreatePurchaseOrderDto = z.infer<typeof CreatePurchaseOrderSchema>;
export type CreateProductionOrderDto = z.infer<typeof CreateProductionOrderSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type RegisterDto = z.infer<typeof RegisterSchema>;
export type CreateProductVariantDto = z.infer<typeof CreateProductVariantSchema>;
export type UpdateProductVariantDto = z.infer<typeof UpdateProductVariantSchema>;

type DateInputValue<T> = T extends Date
    ? string | Date
    : T extends (infer U)[]
    ? DateInputValue<U>[]
    : T extends object
    ? { [K in keyof T]: DateInputValue<T[K]> }
    : T;

// MRP/Quality API input contracts (schema-driven)
export type CreateProductionBatchPayload = DateInputValue<z.input<typeof CreateProductionBatchSchema>>;
export type UpsertProductionBatchPackagingFormPayload = DateInputValue<z.input<typeof UpsertProductionBatchPackagingFormSchema>>;
export type UpsertProductionMaterialAllocationPayload = DateInputValue<z.input<typeof UpsertProductionMaterialAllocationSchema>>;
export type ReturnProductionMaterialPayload = DateInputValue<z.input<typeof ReturnProductionMaterialSchema>>;
export type CreateNonConformityPayload = DateInputValue<z.input<typeof CreateNonConformitySchema>>;
export type UpdateNonConformityPayload = DateInputValue<z.input<typeof UpdateNonConformitySchema>>;
export type CreateCapaPayload = DateInputValue<z.input<typeof CreateCapaSchema>>;
export type UpdateCapaPayload = DateInputValue<z.input<typeof UpdateCapaSchema>>;
export type CreateProcessDeviationPayload = DateInputValue<z.input<typeof CreateProcessDeviationSchema>>;
export type UpdateProcessDeviationPayload = DateInputValue<z.input<typeof UpdateProcessDeviationSchema>>;
export type ListProcessDeviationsFilters = DateInputValue<z.input<typeof ListProcessDeviationsQuerySchema>>;
export type CreateOosCasePayload = DateInputValue<z.input<typeof CreateOosCaseSchema>>;
export type UpdateOosCasePayload = DateInputValue<z.input<typeof UpdateOosCaseSchema>>;
export type ListOosCasesFilters = DateInputValue<z.input<typeof ListOosCasesQuerySchema>>;
export type CreateChangeControlPayload = DateInputValue<z.input<typeof CreateChangeControlSchema>>;
export type UpdateChangeControlPayload = DateInputValue<z.input<typeof UpdateChangeControlSchema>>;
export type ListChangeControlsFilters = DateInputValue<z.input<typeof ListChangeControlsQuerySchema>>;
export type CreateChangeControlApprovalPayload = DateInputValue<z.input<typeof CreateChangeControlApprovalSchema>>;
export type CreateControlledDocumentPayload = DateInputValue<z.input<typeof CreateControlledDocumentSchema>>;
export type UploadControlledDocumentSourcePayload = DateInputValue<z.input<typeof UploadControlledDocumentSourceSchema>>;
export type ListControlledDocumentsFilters = DateInputValue<z.input<typeof ListControlledDocumentsQuerySchema>>;
export type CreateTechnovigilanceCasePayload = DateInputValue<z.input<typeof CreateTechnovigilanceCaseSchema>>;
export type UpdateTechnovigilanceCasePayload = DateInputValue<z.input<typeof UpdateTechnovigilanceCaseSchema>>;
export type ReportTechnovigilanceCasePayload = DateInputValue<z.input<typeof ReportTechnovigilanceCaseSchema>>;
export type CreateRecallCasePayload = DateInputValue<z.input<typeof CreateRecallCaseSchema>>;
export type UpdateRecallProgressPayload = DateInputValue<z.input<typeof UpdateRecallProgressSchema>>;
export type CreateRecallNotificationPayload = DateInputValue<z.input<typeof CreateRecallNotificationSchema>>;
export type UpdateRecallNotificationPayload = DateInputValue<z.input<typeof UpdateRecallNotificationSchema>>;
export type CloseRecallCasePayload = DateInputValue<z.input<typeof CloseRecallCaseSchema>>;
export type CreateCustomerPayload = DateInputValue<z.input<typeof CustomerSchema>>;
export type CreateShipmentPayload = DateInputValue<z.input<typeof CreateShipmentSchema>>;
export type CreateDmrTemplatePayload = DateInputValue<z.input<typeof CreateDmrTemplateSchema>>;
export type ProductCsvImportPayload = DateInputValue<z.input<typeof ProductCsvImportSchema>>;
export type SupplierCsvImportPayload = DateInputValue<z.input<typeof SupplierCsvImportSchema>>;
export type CustomerCsvImportPayload = DateInputValue<z.input<typeof CustomerCsvImportSchema>>;
export type UpsertRegulatoryLabelPayload = DateInputValue<z.input<typeof UpsertRegulatoryLabelSchema>>;
export type ValidateDispatchReadinessPayload = DateInputValue<z.input<typeof ValidateDispatchReadinessSchema>>;
export type CreateQualityRiskControlPayload = DateInputValue<z.input<typeof CreateQualityRiskControlSchema>>;
export type CreateQualityTrainingEvidencePayload = DateInputValue<z.input<typeof CreateQualityTrainingEvidenceSchema>>;
export type ResolveIncomingInspectionPayload = DateInputValue<z.input<typeof ResolveIncomingInspectionSchema>>;
export type CorrectIncomingInspectionCostPayload = DateInputValue<z.input<typeof CorrectIncomingInspectionCostSchema>>;
export type UploadIncomingInspectionEvidencePayload = DateInputValue<z.input<typeof UploadIncomingInspectionEvidenceSchema>>;
export type UpsertBatchReleaseChecklistPayload = DateInputValue<z.input<typeof UpsertBatchReleaseChecklistSchema>>;
export type SignBatchReleasePayload = DateInputValue<z.input<typeof SignBatchReleaseSchema>>;
export type ApproveControlledDocumentPayload = DateInputValue<z.input<typeof ApproveControlledDocumentSchema>>;
export type CreateInvimaRegistrationPayload = DateInputValue<z.input<typeof CreateInvimaRegistrationSchema>>;
export type UpdateInvimaRegistrationPayload = DateInputValue<z.input<typeof UpdateInvimaRegistrationSchema>>;
export type CreatePurchaseRequisitionPayload = DateInputValue<z.input<typeof CreatePurchaseRequisitionSchema>>;
export type CreatePurchaseRequisitionFromProductionOrderPayload = DateInputValue<z.input<typeof CreatePurchaseRequisitionFromProductionOrderSchema>>;
export type CreateEquipmentPayload = DateInputValue<z.input<typeof CreateEquipmentSchema>>;
export type UpdateEquipmentPayload = DateInputValue<z.input<typeof UpdateEquipmentSchema>>;
export type CreateEquipmentMaintenancePayload = DateInputValue<z.input<typeof CreateEquipmentMaintenanceSchema>>;
export type RegisterBatchEquipmentUsagePayload = DateInputValue<z.input<typeof RegisterBatchEquipmentUsageSchema>>;
export type ListOperationalAlertsPayload = DateInputValue<z.input<typeof ListOperationalAlertsQuerySchema>>;
export type ExportWeeklyComplianceReportPayload = DateInputValue<z.input<typeof ExportWeeklyComplianceReportQuerySchema>>;
export type CreateSalesOrderPayload = DateInputValue<z.input<typeof CreateSalesOrderSchema>>;
export type UpdateSalesOrderPayload = DateInputValue<z.input<typeof UpdateSalesOrderSchema>>;
export type ListSalesOrdersFilters = DateInputValue<z.input<typeof ListSalesOrdersQuerySchema>>;
export type UpdateSalesOrderStatusPayload = DateInputValue<z.input<typeof UpdateSalesOrderStatusSchema>>;
