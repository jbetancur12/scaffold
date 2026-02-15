export enum UserRole {
    USER = 'user',
    ADMIN = 'admin',
    SUPERADMIN = 'superadmin',
}

export interface User {
    id: string;
    email: string;
    role: UserRole;
    createdAt: string | Date;
    updatedAt: string | Date;
}

// MRP Enums
export enum UnitType {
    UNIT = 'unidad',
    KG = 'kg',
    LITER = 'litro',
    METER = 'metro',
}

export enum WarehouseType {
    RAW_MATERIALS = 'raw_materials',
    FINISHED_GOODS = 'finished_goods',
    QUARANTINE = 'quarantine',
    OTHER = 'other',
}

export enum ProductionOrderStatus {
    DRAFT = 'draft',
    PLANNED = 'planned',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

export enum PurchaseOrderStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    RECEIVED = 'RECEIVED',
    CANCELLED = 'CANCELLED',
}

export enum ProductionBatchQcStatus {
    PENDING = 'pending',
    PASSED = 'passed',
    FAILED = 'failed',
}

export enum ProductionBatchPackagingStatus {
    PENDING = 'pending',
    PACKED = 'packed',
}

export enum ProductionBatchStatus {
    IN_PROGRESS = 'in_progress',
    QC_PENDING = 'qc_pending',
    QC_PASSED = 'qc_passed',
    PACKING = 'packing',
    READY = 'ready',
}

export enum QualitySeverity {
    BAJA = 'baja',
    MEDIA = 'media',
    ALTA = 'alta',
    CRITICA = 'critica',
}

export enum NonConformityStatus {
    ABIERTA = 'abierta',
    EN_ANALISIS = 'en_analisis',
    EN_CORRECCION = 'en_correccion',
    CERRADA = 'cerrada',
}

export enum CapaStatus {
    ABIERTA = 'abierta',
    EN_PROGRESO = 'en_progreso',
    VERIFICACION = 'verificacion',
    CERRADA = 'cerrada',
}

export enum DocumentProcess {
    PRODUCCION = 'produccion',
    CONTROL_CALIDAD = 'control_calidad',
    EMPAQUE = 'empaque',
}

export enum DocumentStatus {
    BORRADOR = 'borrador',
    EN_REVISION = 'en_revision',
    APROBADO = 'aprobado',
    OBSOLETO = 'obsoleto',
}

export enum DocumentApprovalMethod {
    FIRMA_MANUAL = 'firma_manual',
    FIRMA_DIGITAL = 'firma_digital',
}

export enum TechnovigilanceCaseType {
    QUEJA = 'queja',
    EVENTO_ADVERSO = 'evento_adverso',
}

export enum TechnovigilanceSeverity {
    LEVE = 'leve',
    MODERADA = 'moderada',
    SEVERA = 'severa',
    CRITICA = 'critica',
}

export enum TechnovigilanceCausality {
    NO_RELACIONADO = 'no_relacionado',
    POSIBLE = 'posible',
    PROBABLE = 'probable',
    CONFIRMADO = 'confirmado',
}

export enum TechnovigilanceStatus {
    ABIERTO = 'abierto',
    EN_INVESTIGACION = 'en_investigacion',
    REPORTADO = 'reportado',
    CERRADO = 'cerrado',
}

export enum TechnovigilanceReportChannel {
    INVIMA_PORTAL = 'invima_portal',
    EMAIL_OFICIAL = 'email_oficial',
    OTRO = 'otro',
}

export enum RecallScopeType {
    LOTE = 'lote',
    SERIAL = 'serial',
}

export enum RecallStatus {
    ABIERTO = 'abierto',
    EN_EJECUCION = 'en_ejecucion',
    CERRADO = 'cerrado',
}

export enum RecallNotificationChannel {
    EMAIL = 'email',
    TELEFONO = 'telefono',
    WHATSAPP = 'whatsapp',
    OTRO = 'otro',
}

export enum RecallNotificationStatus {
    PENDIENTE = 'pendiente',
    ENVIADA = 'enviada',
    CONFIRMADA = 'confirmada',
    FALLIDA = 'fallida',
}

export enum RegulatoryLabelScopeType {
    LOTE = 'lote',
    SERIAL = 'serial',
}

export enum RegulatoryDeviceType {
    CLASE_I = 'clase_i',
    CLASE_IIA = 'clase_iia',
    CLASE_IIB = 'clase_iib',
    CLASE_III = 'clase_iii',
}

export enum RegulatoryCodingStandard {
    GS1 = 'gs1',
    HIBCC = 'hibcc',
    INTERNO = 'interno',
}

export enum RegulatoryLabelStatus {
    BORRADOR = 'borrador',
    VALIDADA = 'validada',
    BLOQUEADA = 'bloqueada',
}

export enum QualityRiskControlStatus {
    ACTIVO = 'activo',
    MITIGADO = 'mitigado',
    OBSOLETO = 'obsoleto',
}

export enum IncomingInspectionStatus {
    PENDIENTE = 'pendiente',
    LIBERADO = 'liberado',
    RECHAZADO = 'rechazado',
}

export enum IncomingInspectionResult {
    APROBADO = 'aprobado',
    CONDICIONAL = 'condicional',
    RECHAZADO = 'rechazado',
}

// MRP Interfaces
export interface Supplier {
    id: string;
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    department?: string;
    bankDetails?: string;
    paymentConditions?: string;
    notes?: string;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface RawMaterial {
    id: string;
    name: string;
    sku: string;
    unit: UnitType;
    cost: number; // Initial standard cost / Reference cost
    averageCost?: number; // Current average cost calculated from purchases
    lastPurchasePrice?: number; // Price of the very last purchase
    lastPurchaseDate?: string | Date; // Date of the very last purchase
    stock?: number; // Virtual field for total stock
    minStockLevel?: number;
    supplierId?: string; // Preferred supplier
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface SupplierMaterial {
    id: string;
    supplierId: string;
    rawMaterialId: string;
    lastPurchasePrice: number;
    lastPurchaseDate: string | Date;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface PurchaseRecord {
    id: string;
    rawMaterialId: string;
    supplierId: string;
    price: number;
    date: string | Date;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface PurchaseOrderItem {
    id: string;
    rawMaterial: Pick<RawMaterial, 'id' | 'name' | 'sku' | 'unit'>;
    quantity: number;
    unitPrice: number;
    taxAmount: number;
    subtotal: number;
}

export interface PurchaseOrder {
    id: string;
    supplier: Pick<Supplier, 'id' | 'name'>;
    orderDate: string | Date;
    expectedDeliveryDate?: string | Date;
    receivedDate?: string | Date;
    status: PurchaseOrderStatus;
    totalAmount: number;
    taxTotal: number;
    subtotalBase: number;
    notes?: string;
    items?: PurchaseOrderItem[];
}

export interface PurchaseOrderListResponse {
    data: PurchaseOrder[];
    total: number;
    page: number;
    limit: number;
}

export interface Product {
    id: string;
    name: string;
    description?: string;
    sku: string;
    categoryId?: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    variants?: ProductVariant[];
}

export interface ProductVariant {
    id: string;
    productId: string;
    name: string; // e.g., "L", "XL", "Red"
    sku: string;
    price: number; // Sale price
    cost: number; // Calculated Actual Cost (Avg)
    referenceCost: number; // Calculated Standard Cost
    laborCost: number;
    indirectCost: number;
    targetMargin: number;
    productionMinutes?: number;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface BOMItem {
    id: string;
    variantId: string;
    rawMaterialId: string;
    quantity: number;
    fabricationParams?: {
        calculationType?: 'area' | 'linear';
        quantityPerUnit?: number;
        rollWidth: number;
        pieceWidth: number;
        pieceLength: number;
        orientation: 'normal' | 'rotated';
    };
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface Warehouse {
    id: string;
    name: string;
    location?: string;
    type: WarehouseType;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface InventoryItem {
    id: string;
    warehouseId: string;
    warehouse?: Warehouse;
    rawMaterialId?: string;
    rawMaterial?: RawMaterial;
    variantId?: string;
    variant?: ProductVariant;
    quantity: number;
    lastUpdated: string | Date;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface ProductionOrder {
    id: string;
    code: string;
    status: ProductionOrderStatus;
    startDate?: string | Date;
    endDate?: string | Date;
    notes?: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    items?: ProductionOrderItem[];
    batches?: ProductionBatch[];
}

export interface ProductionOrderItem {
    id: string;
    productionOrderId: string;
    variantId: string;
    quantity: number;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface ProductionBatch {
    id: string;
    productionOrderId: string;
    variantId: string;
    code: string;
    plannedQty: number;
    producedQty: number;
    qcStatus: ProductionBatchQcStatus;
    packagingStatus: ProductionBatchPackagingStatus;
    status: ProductionBatchStatus;
    notes?: string;
    variant?: ProductVariant & { product?: Product };
    units?: ProductionBatchUnit[];
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface ProductionBatchUnit {
    id: string;
    productionBatchId: string;
    serialCode: string;
    qcPassed: boolean;
    packaged: boolean;
    rejected: boolean;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface NonConformity {
    id: string;
    title: string;
    description: string;
    severity: QualitySeverity;
    status: NonConformityStatus;
    source: string;
    productionOrderId?: string;
    productionBatchId?: string;
    productionBatchUnitId?: string;
    rootCause?: string;
    correctiveAction?: string;
    createdBy?: string;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface CapaAction {
    id: string;
    nonConformityId: string;
    actionPlan: string;
    owner?: string;
    dueDate?: string | Date;
    verificationNotes?: string;
    status: CapaStatus;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface AuditEvent {
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    actor?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface ControlledDocument {
    id: string;
    code: string;
    title: string;
    process: DocumentProcess;
    version: number;
    status: DocumentStatus;
    content?: string;
    effectiveDate?: string | Date;
    expiresAt?: string | Date;
    approvedBy?: string;
    approvedAt?: string | Date;
    approvalMethod?: DocumentApprovalMethod;
    approvalSignature?: string;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface TechnovigilanceCase {
    id: string;
    title: string;
    description: string;
    type: TechnovigilanceCaseType;
    severity: TechnovigilanceSeverity;
    causality?: TechnovigilanceCausality;
    status: TechnovigilanceStatus;
    reportedToInvima: boolean;
    reportedAt?: string | Date;
    invimaReportNumber?: string;
    invimaReportChannel?: TechnovigilanceReportChannel;
    invimaReportPayloadRef?: string;
    invimaAckAt?: string | Date;
    reportedBy?: string;
    investigationSummary?: string;
    resolution?: string;
    productionOrderId?: string;
    productionBatchId?: string;
    productionBatchUnitId?: string;
    lotCode?: string;
    serialCode?: string;
    createdBy?: string;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface RecallNotification {
    id: string;
    recallCaseId: string;
    recipientName: string;
    recipientContact: string;
    channel: RecallNotificationChannel;
    status: RecallNotificationStatus;
    sentAt?: string | Date;
    acknowledgedAt?: string | Date;
    evidenceNotes?: string;
    createdBy?: string;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface RecallCase {
    id: string;
    code: string;
    title: string;
    reason: string;
    scopeType: RecallScopeType;
    lotCode?: string;
    serialCode?: string;
    affectedQuantity: number;
    retrievedQuantity: number;
    coveragePercent: number;
    status: RecallStatus;
    isMock: boolean;
    targetResponseMinutes?: number;
    actualResponseMinutes?: number;
    startedAt: string | Date;
    endedAt?: string | Date;
    closureEvidence?: string;
    createdBy?: string;
    notifications?: RecallNotification[];
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface RegulatoryLabel {
    id: string;
    productionBatchId: string;
    productionBatchUnitId?: string;
    scopeType: RegulatoryLabelScopeType;
    status: RegulatoryLabelStatus;
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
    codingValue?: string;
    validationErrors?: string[];
    createdBy?: string;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface DispatchValidationResult {
    batchId: string;
    eligible: boolean;
    validatedAt: string | Date;
    errors: string[];
    requiredSerialLabels: number;
    validatedSerialLabels: number;
}

export interface ComplianceKpiDashboard {
    generatedAt: string | Date;
    nonConformitiesOpen: number;
    capasOpen: number;
    technovigilanceOpen: number;
    recallsOpen: number;
    recallCoverageAverage: number;
    auditEventsLast30Days: number;
    documentApprovalRate: number;
}

export interface ComplianceExportFile {
    generatedAt: string | Date;
    format: 'csv' | 'json';
    fileName: string;
    content: string;
}

export interface QualityRiskControl {
    id: string;
    process: DocumentProcess;
    risk: string;
    control: string;
    ownerRole: string;
    status: QualityRiskControlStatus;
    evidenceRef?: string;
    createdBy?: string;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface QualityTrainingEvidence {
    id: string;
    role: string;
    personName: string;
    trainingTopic: string;
    completedAt: string | Date;
    validUntil?: string | Date;
    trainerName?: string;
    evidenceRef?: string;
    createdBy?: string;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface IncomingInspection {
    id: string;
    purchaseOrderId?: string;
    purchaseOrderItemId?: string;
    rawMaterialId: string;
    warehouseId: string;
    status: IncomingInspectionStatus;
    inspectionResult?: IncomingInspectionResult;
    supplierLotCode?: string;
    certificateRef?: string;
    notes?: string;
    quantityReceived: number;
    quantityAccepted: number;
    quantityRejected: number;
    inspectedBy?: string;
    inspectedAt?: string | Date;
    releasedBy?: string;
    releasedAt?: string | Date;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface OperationalConfig {
    id: string;
    // MOD (Mano de Obra Directa)
    operatorSalary: number; // Salario base del operario
    operatorLoadFactor: number; // Factor prestacional (e.g., 1.38 para 38%)
    operatorRealMonthlyMinutes: number; // Minutos productivos reales al mes
    // CIF (Costos Indirectos de Fabricación)
    rent: number;
    utilities: number;
    adminSalaries: number;
    otherExpenses: number;

    numberOfOperators: number; // Número de Operarios

    // Computed Values
    modCostPerMinute: number; // (Salary * Load) / RealMinutes
    cifCostPerMinute: number; // (Rent + Utils + Admin + Other) / (RealMinutes * Ops)
    costPerMinute: number; // MO Cost + CIF Cost
    createdAt: string | Date;
    updatedAt: string | Date;
}
