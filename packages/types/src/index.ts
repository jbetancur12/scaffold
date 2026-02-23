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

export enum PurchaseRequisitionStatus {
    PENDIENTE = 'pendiente',
    APROBADA = 'aprobada',
    CONVERTIDA = 'convertida',
    CANCELADA = 'cancelada',
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

export enum DocumentCategory {
    MAN = 'man',
    PRO = 'pro',
    INS = 'ins',
    FOR = 'for',
}

export enum DocumentProcessAreaCode {
    GAF = 'gaf',
    GC = 'gc',
    GP = 'gp',
    GTH = 'gth',
    GS = 'gs',
    GM = 'gm',
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

export enum InvimaRegistrationStatus {
    ACTIVO = 'activo',
    INACTIVO = 'inactivo',
    SUSPENDIDO = 'suspendido',
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

export enum BatchReleaseStatus {
    PENDIENTE_LIBERACION = 'pendiente_liberacion',
    LIBERADO_QA = 'liberado_qa',
    RECHAZADO = 'rechazado',
}

export enum ProcessDeviationStatus {
    ABIERTA = 'abierta',
    EN_CONTENCION = 'en_contencion',
    EN_INVESTIGACION = 'en_investigacion',
    CERRADA = 'cerrada',
}

export enum OosCaseStatus {
    ABIERTO = 'abierto',
    EN_INVESTIGACION = 'en_investigacion',
    DISPUESTO = 'dispuesto',
    CERRADO = 'cerrado',
}

export enum OosDisposition {
    REPROCESAR = 'reprocesar',
    DESCARTAR = 'descartar',
    USO_CONDICIONAL = 'uso_condicional',
    LIBERAR = 'liberar',
}

export enum ChangeControlType {
    MATERIAL = 'material',
    PROCESO = 'proceso',
    DOCUMENTO = 'documento',
    PARAMETRO = 'parametro',
}

export enum ChangeControlStatus {
    BORRADOR = 'borrador',
    EN_EVALUACION = 'en_evaluacion',
    APROBADO = 'aprobado',
    RECHAZADO = 'rechazado',
    IMPLEMENTADO = 'implementado',
    CANCELADO = 'cancelado',
}

export enum ChangeImpactLevel {
    BAJO = 'bajo',
    MEDIO = 'medio',
    ALTO = 'alto',
    CRITICO = 'critico',
}

export enum ChangeApprovalDecision {
    PENDIENTE = 'pendiente',
    APROBADO = 'aprobado',
    RECHAZADO = 'rechazado',
}

export enum EquipmentStatus {
    ACTIVO = 'activo',
    INACTIVO = 'inactivo',
}

export enum EquipmentCalibrationResult {
    APROBADA = 'aprobada',
    RECHAZADA = 'rechazada',
}

export enum EquipmentMaintenanceType {
    PREVENTIVO = 'preventivo',
    CORRECTIVO = 'correctivo',
}

export enum EquipmentMaintenanceResult {
    COMPLETADO = 'completado',
    CON_OBSERVACIONES = 'con_observaciones',
    FALLIDO = 'fallido',
}

export enum OperationalAlertRole {
    QA = 'qa',
    REGULATORIO = 'regulatorio',
    PRODUCCION = 'produccion',
    DIRECCION_TECNICA = 'direccion_tecnica',
}

export enum OperationalAlertType {
    CAPA_VENCIDA = 'capa_vencida',
    CAPACITACION_VENCIDA = 'capacitacion_vencida',
    DOCUMENTO_POR_VENCER = 'documento_por_vencer',
    LOTE_PENDIENTE_LIBERACION = 'lote_pendiente_liberacion',
    RECALL_ABIERTO = 'recall_abierto',
    EQUIPO_CRITICO_VENCIDO = 'equipo_critico_vencido',
}

export enum OperationalAlertSeverity {
    CRITICA = 'critica',
    ALTA = 'alta',
    MEDIA = 'media',
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

export interface PurchaseRequisitionItem {
    id: string;
    rawMaterial: Pick<RawMaterial, 'id' | 'name' | 'sku' | 'unit'>;
    quantity: number;
    suggestedSupplier?: Pick<Supplier, 'id' | 'name'>;
    notes?: string;
}

export interface PurchaseRequisition {
    id: string;
    requestedBy: string;
    productionOrderId?: string;
    neededBy?: string | Date;
    notes?: string;
    status: PurchaseRequisitionStatus;
    convertedPurchaseOrderId?: string;
    items?: PurchaseRequisitionItem[];
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface PurchaseRequisitionListResponse {
    data: PurchaseRequisition[];
    total: number;
    page: number;
    limit: number;
}

export interface InvimaRegistration {
    id: string;
    code: string;
    holderName: string;
    manufacturerName?: string;
    validFrom?: string | Date;
    validUntil?: string | Date;
    status: InvimaRegistrationStatus;
    notes?: string;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface Product {
    id: string;
    name: string;
    description?: string;
    sku: string;
    categoryId?: string;
    requiresInvima: boolean;
    productReference?: string;
    invimaRegistrationId?: string;
    invimaRegistration?: Pick<InvimaRegistration, 'id' | 'code' | 'status' | 'holderName' | 'manufacturerName' | 'validFrom' | 'validUntil'>;
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

export interface ProcessDeviation {
    id: string;
    code: string;
    title: string;
    description: string;
    classification: string;
    status: ProcessDeviationStatus;
    containmentAction?: string;
    investigationSummary?: string;
    closureEvidence?: string;
    productionOrderId?: string;
    productionBatchId?: string;
    productionBatchUnitId?: string;
    capaActionId?: string;
    openedBy?: string;
    closedBy?: string;
    closedAt?: string | Date;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface OosCase {
    id: string;
    code: string;
    testName: string;
    resultValue: string;
    specification: string;
    status: OosCaseStatus;
    investigationSummary?: string;
    disposition?: OosDisposition;
    decisionNotes?: string;
    productionOrderId?: string;
    productionBatchId?: string;
    productionBatchUnitId?: string;
    capaActionId?: string;
    blockedAt: string | Date;
    releasedAt?: string | Date;
    openedBy?: string;
    closedBy?: string;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface ChangeControl {
    id: string;
    code: string;
    title: string;
    description: string;
    type: ChangeControlType;
    impactLevel: ChangeImpactLevel;
    status: ChangeControlStatus;
    evaluationSummary?: string;
    requestedBy?: string;
    effectiveDate?: string | Date;
    linkedDocumentId?: string;
    affectedProductionOrderId?: string;
    affectedProductionBatchId?: string;
    beforeChangeBatchCode?: string;
    afterChangeBatchCode?: string;
    approvals?: ChangeControlApproval[];
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface ChangeControlApproval {
    id: string;
    changeControlId: string;
    role: string;
    approver?: string;
    decision: ChangeApprovalDecision;
    decisionNotes?: string;
    decidedAt?: string | Date;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface Equipment {
    id: string;
    code: string;
    name: string;
    area?: string;
    isCritical: boolean;
    status: EquipmentStatus;
    calibrationFrequencyDays?: number;
    maintenanceFrequencyDays?: number;
    lastCalibrationAt?: string | Date;
    nextCalibrationDueAt?: string | Date;
    lastMaintenanceAt?: string | Date;
    nextMaintenanceDueAt?: string | Date;
    notes?: string;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface EquipmentCalibration {
    id: string;
    equipmentId: string;
    executedAt: string | Date;
    dueAt?: string | Date;
    result: EquipmentCalibrationResult;
    certificateRef?: string;
    evidenceRef?: string;
    performedBy?: string;
    notes?: string;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface EquipmentMaintenance {
    id: string;
    equipmentId: string;
    executedAt: string | Date;
    dueAt?: string | Date;
    type: EquipmentMaintenanceType;
    result: EquipmentMaintenanceResult;
    evidenceRef?: string;
    performedBy?: string;
    notes?: string;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface BatchEquipmentUsage {
    id: string;
    productionBatchId: string;
    equipmentId: string;
    productionBatch?: Pick<ProductionBatch, 'id' | 'code'>;
    equipment?: Pick<Equipment, 'id' | 'code' | 'name' | 'isCritical' | 'status'>;
    usedAt: string | Date;
    usedBy?: string;
    notes?: string;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface EquipmentAlert {
    equipmentId: string;
    equipmentCode: string;
    equipmentName: string;
    isCritical: boolean;
    alertType: 'calibration' | 'maintenance';
    dueAt: string | Date;
    daysRemaining: number;
    severity: 'vencido' | 'proximo';
}

export interface EquipmentHistory {
    equipment: Equipment;
    calibrations: EquipmentCalibration[];
    maintenances: EquipmentMaintenance[];
    usages: BatchEquipmentUsage[];
}

export interface OperationalAlert {
    id: string;
    type: OperationalAlertType;
    severity: OperationalAlertSeverity;
    title: string;
    description: string;
    entityType: string;
    entityId: string;
    entityCode?: string;
    dueAt?: string | Date;
    createdAt?: string | Date;
    roleTargets: OperationalAlertRole[];
    routePath?: string;
}

export interface WeeklyComplianceReport {
    generatedAt: string | Date;
    periodStart: string | Date;
    periodEnd: string | Date;
    role?: OperationalAlertRole;
    totalAlerts: number;
    criticalAlerts: number;
    highAlerts: number;
    mediumAlerts: number;
    alertsByType: Array<{
        type: OperationalAlertType;
        count: number;
    }>;
    auditEventsInPeriod: number;
    alerts: OperationalAlert[];
}

export interface WeeklyComplianceReportFile {
    generatedAt: string | Date;
    periodStart: string | Date;
    periodEnd: string | Date;
    role?: OperationalAlertRole;
    format: 'csv' | 'json';
    fileName: string;
    content: string;
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
    documentCategory?: DocumentCategory;
    processAreaCode?: DocumentProcessAreaCode;
    version: number;
    status: DocumentStatus;
    content?: string;
    effectiveDate?: string | Date;
    expiresAt?: string | Date;
    approvedBy?: string;
    approvedAt?: string | Date;
    approvalMethod?: DocumentApprovalMethod;
    approvalSignature?: string;
    sourceFileName?: string;
    sourceFileMime?: string;
    sourceFilePath?: string;
    isInitialDictionary?: boolean;
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
    deviationsOpen: number;
    oosOpen: number;
    changeControlsPending: number;
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
    purchaseOrder?: Pick<PurchaseOrder, 'id'> & {
        supplier?: Pick<Supplier, 'id' | 'name'>;
    };
    purchaseOrderItemId?: string;
    purchaseOrderItem?: {
        id: string;
        quantity?: number;
        rawMaterial?: Pick<RawMaterial, 'id' | 'name' | 'sku' | 'unit'>;
    };
    rawMaterialId: string;
    rawMaterial?: Pick<RawMaterial, 'id' | 'name' | 'sku' | 'unit'>;
    warehouseId: string;
    status: IncomingInspectionStatus;
    inspectionResult?: IncomingInspectionResult;
    supplierLotCode?: string;
    certificateRef?: string;
    notes?: string;
    quantityReceived: number;
    quantityAccepted: number;
    quantityRejected: number;
    acceptedUnitCost?: number;
    inspectedBy?: string;
    inspectedAt?: string | Date;
    releasedBy?: string;
    releasedAt?: string | Date;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface BatchRelease {
    id: string;
    productionBatchId: string;
    productionBatch?: Pick<ProductionBatch, 'id' | 'code'>;
    status: BatchReleaseStatus;
    qcApproved: boolean;
    labelingValidated: boolean;
    documentsCurrent: boolean;
    evidencesComplete: boolean;
    checklistNotes?: string;
    rejectedReason?: string;
    signedBy?: string;
    approvalMethod?: DocumentApprovalMethod;
    approvalSignature?: string;
    signedAt?: string | Date;
    reviewedBy?: string;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface Customer {
    id: string;
    name: string;
    documentType?: string;
    documentNumber?: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface ShipmentItem {
    id: string;
    shipmentId: string;
    productionBatchId: string;
    productionBatch?: Pick<ProductionBatch, 'id' | 'code'>;
    productionBatchUnitId?: string;
    productionBatchUnit?: Pick<ProductionBatchUnit, 'id' | 'serialCode'>;
    quantity: number;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface Shipment {
    id: string;
    customerId: string;
    customer?: Pick<Customer, 'id' | 'name' | 'documentNumber'>;
    commercialDocument: string;
    shippedAt: string | Date;
    dispatchedBy?: string;
    notes?: string;
    items: ShipmentItem[];
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface RecallAffectedCustomer {
    customerId: string;
    customerName: string;
    customerContact?: string;
    shipments: Array<{
        shipmentId: string;
        commercialDocument: string;
        shippedAt: string | Date;
    }>;
}

export interface DmrTemplate {
    id: string;
    productId?: string;
    product?: Pick<Product, 'id' | 'name' | 'sku'>;
    process: DocumentProcess;
    code: string;
    title: string;
    version: number;
    sections: string[];
    requiredEvidence: string[];
    isActive: boolean;
    createdBy?: string;
    approvedBy?: string;
    approvedAt?: string | Date;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface BatchDhrExpedient {
    generatedAt: string | Date;
    generatedBy?: string;
    productionBatch: {
        id: string;
        code: string;
        plannedQty: number;
        producedQty: number;
        qcStatus: ProductionBatchQcStatus;
        packagingStatus: ProductionBatchPackagingStatus;
        status: ProductionBatchStatus;
        productionOrder?: {
            id: string;
            code: string;
            status: ProductionOrderStatus;
        };
        variant?: {
            id: string;
            name: string;
            sku: string;
            product?: {
                id: string;
                name: string;
                sku: string;
            };
        };
    };
    dmrTemplate?: {
        id: string;
        code: string;
        title: string;
        process: DocumentProcess;
        version: number;
        sections: string[];
        requiredEvidence: string[];
    };
    materials: Array<{
        rawMaterialId: string;
        rawMaterialName: string;
        rawMaterialSku: string;
        plannedQuantity: number;
        latestInspection?: {
            id: string;
            status: IncomingInspectionStatus;
            inspectionResult?: IncomingInspectionResult;
            inspectedBy?: string;
            inspectedAt?: string | Date;
            certificateRef?: string;
        };
    }>;
    productionAndQuality: {
        qcPassedUnits: number;
        qcFailedUnits: number;
        packagedUnits: number;
        rejectedUnits: number;
        lastUpdatedAt: string | Date;
    };
    regulatoryLabels: RegulatoryLabel[];
    batchRelease?: BatchRelease;
    shipments: Shipment[];
    incidents: {
        nonConformities: NonConformity[];
        capas: CapaAction[];
        technovigilanceCases: TechnovigilanceCase[];
        recalls: RecallCase[];
        processDeviations: ProcessDeviation[];
        oosCases: OosCase[];
        changeControls: ChangeControl[];
    };
}

export interface BatchDhrExportFile {
    generatedAt: string | Date;
    format: 'csv' | 'json';
    fileName: string;
    content: string;
}

// MRP API payloads (shared contracts)
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

export interface CreateProcessDeviationPayload {
    title: string;
    description: string;
    classification?: string;
    productionOrderId?: string;
    productionBatchId?: string;
    productionBatchUnitId?: string;
    containmentAction?: string;
    investigationSummary?: string;
    closureEvidence?: string;
    capaActionId?: string;
    actor?: string;
}

export interface UpdateProcessDeviationPayload {
    title?: string;
    description?: string;
    classification?: string;
    status?: ProcessDeviationStatus;
    containmentAction?: string;
    investigationSummary?: string;
    closureEvidence?: string;
    capaActionId?: string;
    actor?: string;
}

export interface CreateOosCasePayload {
    testName: string;
    resultValue: string;
    specification: string;
    productionOrderId?: string;
    productionBatchId?: string;
    productionBatchUnitId?: string;
    investigationSummary?: string;
    disposition?: OosDisposition;
    decisionNotes?: string;
    capaActionId?: string;
    actor?: string;
}

export interface UpdateOosCasePayload {
    testName?: string;
    resultValue?: string;
    specification?: string;
    status?: OosCaseStatus;
    investigationSummary?: string;
    disposition?: OosDisposition;
    decisionNotes?: string;
    capaActionId?: string;
    actor?: string;
}

export interface CreateChangeControlPayload {
    title: string;
    description: string;
    type: ChangeControlType;
    impactLevel?: ChangeImpactLevel;
    evaluationSummary?: string;
    requestedBy?: string;
    effectiveDate?: string | Date;
    linkedDocumentId?: string;
    affectedProductionOrderId?: string;
    affectedProductionBatchId?: string;
    beforeChangeBatchCode?: string;
    afterChangeBatchCode?: string;
    actor?: string;
}

export interface UpdateChangeControlPayload {
    title?: string;
    description?: string;
    type?: ChangeControlType;
    impactLevel?: ChangeImpactLevel;
    status?: ChangeControlStatus;
    evaluationSummary?: string;
    requestedBy?: string;
    effectiveDate?: string | Date;
    linkedDocumentId?: string;
    affectedProductionOrderId?: string;
    affectedProductionBatchId?: string;
    beforeChangeBatchCode?: string;
    afterChangeBatchCode?: string;
    actor?: string;
}

export interface CreateChangeControlApprovalPayload {
    changeControlId: string;
    role: string;
    approver?: string;
    decision: ChangeApprovalDecision;
    decisionNotes?: string;
    actor?: string;
}

export interface CreateEquipmentPayload {
    code: string;
    name: string;
    area?: string;
    isCritical?: boolean;
    status?: EquipmentStatus;
    calibrationFrequencyDays?: number;
    maintenanceFrequencyDays?: number;
    notes?: string;
    actor?: string;
}

export interface CreatePurchaseRequisitionPayload {
    requestedBy: string;
    productionOrderId?: string;
    neededBy?: string | Date;
    notes?: string;
    items: Array<{
        rawMaterialId: string;
        quantity: number;
        suggestedSupplierId?: string;
        notes?: string;
    }>;
}

export interface CreatePurchaseRequisitionFromProductionOrderPayload {
    requestedBy: string;
    neededBy?: string | Date;
    notes?: string;
}

export interface UpdateEquipmentPayload {
    code?: string;
    name?: string;
    area?: string;
    isCritical?: boolean;
    status?: EquipmentStatus;
    calibrationFrequencyDays?: number;
    maintenanceFrequencyDays?: number;
    notes?: string;
    actor?: string;
}

export interface CreateEquipmentCalibrationPayload {
    executedAt?: string | Date;
    dueAt?: string | Date;
    result?: EquipmentCalibrationResult;
    certificateRef?: string;
    evidenceRef?: string;
    performedBy?: string;
    notes?: string;
    actor?: string;
}

export interface CreateEquipmentMaintenancePayload {
    executedAt?: string | Date;
    dueAt?: string | Date;
    type?: EquipmentMaintenanceType;
    result?: EquipmentMaintenanceResult;
    evidenceRef?: string;
    performedBy?: string;
    notes?: string;
    actor?: string;
}

export interface RegisterBatchEquipmentUsagePayload {
    productionBatchId: string;
    equipmentId: string;
    usedAt?: string | Date;
    usedBy?: string;
    notes?: string;
    actor?: string;
}

export interface ListOperationalAlertsPayload {
    role?: OperationalAlertRole;
    daysAhead?: number;
}

export interface ExportWeeklyComplianceReportPayload {
    role?: OperationalAlertRole;
    daysAhead?: number;
    format?: 'csv' | 'json';
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
    documentCategory: DocumentCategory;
    processAreaCode: DocumentProcessAreaCode;
    version?: number;
    content?: string;
    effectiveDate?: string | Date;
    expiresAt?: string | Date;
    actor?: string;
}

export interface ListControlledDocumentsFilters {
    process?: DocumentProcess;
    documentCategory?: DocumentCategory;
    processAreaCode?: DocumentProcessAreaCode;
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

export interface CreateCustomerPayload {
    name: string;
    documentType?: string;
    documentNumber?: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
}

export interface CreateShipmentPayload {
    customerId: string;
    commercialDocument: string;
    shippedAt?: string | Date;
    dispatchedBy?: string;
    notes?: string;
    items: Array<{
        productionBatchId: string;
        productionBatchUnitId?: string;
        quantity: number;
    }>;
}

export interface CreateDmrTemplatePayload {
    productId?: string;
    process: DocumentProcess;
    code: string;
    title: string;
    version?: number;
    sections: string[];
    requiredEvidence?: string[];
    isActive?: boolean;
    createdBy?: string;
    approvedBy?: string;
    approvedAt?: string | Date;
}

export interface UpsertRegulatoryLabelPayload {
    productionBatchId: string;
    productionBatchUnitId?: string;
    scopeType: RegulatoryLabelScopeType;
    deviceType: RegulatoryDeviceType;
    codingStandard: RegulatoryCodingStandard;
    productName?: string;
    manufacturerName?: string;
    invimaRegistration?: string;
    lotCode?: string;
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

export interface ResolveIncomingInspectionPayload {
    inspectionResult: IncomingInspectionResult;
    supplierLotCode?: string;
    certificateRef?: string;
    notes?: string;
    quantityAccepted: number;
    quantityRejected: number;
    acceptedUnitCost?: number;
    inspectedBy: string;
    approvedBy: string;
    managerApprovedBy?: string;
    actor?: string;
}

export interface UpsertBatchReleaseChecklistPayload {
    productionBatchId: string;
    qcApproved: boolean;
    labelingValidated: boolean;
    documentsCurrent: boolean;
    evidencesComplete: boolean;
    checklistNotes?: string;
    rejectedReason?: string;
    actor?: string;
}

export interface SignBatchReleasePayload {
    actor: string;
    approvalMethod: DocumentApprovalMethod;
    approvalSignature: string;
}

export interface ApproveControlledDocumentPayload {
    actor: string;
    approvalMethod: DocumentApprovalMethod;
    approvalSignature: string;
}

export interface CreateInvimaRegistrationPayload {
    code: string;
    holderName: string;
    manufacturerName?: string;
    validFrom?: string | Date;
    validUntil?: string | Date;
    status?: InvimaRegistrationStatus;
    notes?: string;
}

export interface UpdateInvimaRegistrationPayload {
    code?: string;
    holderName?: string;
    manufacturerName?: string;
    validFrom?: string | Date;
    validUntil?: string | Date;
    status?: InvimaRegistrationStatus;
    notes?: string;
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
