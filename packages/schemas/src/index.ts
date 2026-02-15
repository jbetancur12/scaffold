import { z } from 'zod';
import {
    UserRole,
    UnitType,
    WarehouseType,
    ProductionOrderStatus,
    PurchaseOrderStatus,
    CapaStatus,
    DocumentProcess,
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
    QualityRiskControlStatus,
    IncomingInspectionResult,
    IncomingInspectionStatus,
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

export const ProductSchema = z.object({
    name: z.string().min(1, 'El nombre es obligatorio'),
    description: z.string().optional(),
    sku: z.string().min(1, 'SKU es obligatorio'),
    categoryId: z.string().uuid().optional(),
});

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
    expectedDeliveryDate: z.preprocess((val) => (val === '' ? undefined : val), z.coerce.date().optional()),
    notes: z.string().optional(),
    warehouseId: z.string().uuid().optional(),
    items: z.array(z.object({
        rawMaterialId: z.string().uuid(),
        quantity: z.number().min(0.01),
        unitPrice: z.number().min(0),
        taxAmount: z.number().min(0).optional(),
    })),
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

export const PaginationQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
});

export const ListRawMaterialsQuerySchema = PaginationQuerySchema.extend({
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

export const InventoryQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    warehouseId: z.string().uuid().optional(),
});

export const ListPurchaseOrdersQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    status: z.nativeEnum(PurchaseOrderStatus).optional(),
    supplierId: z.string().uuid().optional(),
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
    version: z.number().int().positive().optional(),
    content: z.string().optional(),
    effectiveDate: z.coerce.date().optional(),
    expiresAt: z.coerce.date().optional(),
    actor: z.string().optional(),
});

export const ListControlledDocumentsQuerySchema = z.object({
    process: z.nativeEnum(DocumentProcess).optional(),
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
    productName: z.string().min(3),
    manufacturerName: z.string().min(3),
    invimaRegistration: z.string().min(3),
    lotCode: z.string().min(2),
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
    supplierLotCode: z.string().optional(),
    certificateRef: z.string().optional(),
    notes: z.string().optional(),
    quantityAccepted: z.number().nonnegative(),
    quantityRejected: z.number().nonnegative(),
    actor: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.quantityAccepted === 0 && data.quantityRejected === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['quantityAccepted'], message: 'Debes registrar cantidad aceptada o rechazada' });
    }
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
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
export type CreatePurchaseOrderDto = z.infer<typeof CreatePurchaseOrderSchema>;
export type CreateProductionOrderDto = z.infer<typeof CreateProductionOrderSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type RegisterDto = z.infer<typeof RegisterSchema>;
export type CreateProductVariantDto = z.infer<typeof CreateProductVariantSchema>;
export type UpdateProductVariantDto = z.infer<typeof UpdateProductVariantSchema>;
