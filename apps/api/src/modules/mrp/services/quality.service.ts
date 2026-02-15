import { EntityManager, EntityRepository, FilterQuery } from '@mikro-orm/core';
import {
    CapaStatus,
    ComplianceExportFile,
    ComplianceKpiDashboard,
    DispatchValidationResult,
    DocumentApprovalMethod,
    DocumentProcess,
    DocumentStatus,
    IncomingInspectionResult,
    IncomingInspectionStatus,
    BatchReleaseStatus,
    ProcessDeviationStatus,
    OosCaseStatus,
    OosDisposition,
    ChangeControlStatus,
    ChangeControlType,
    ChangeImpactLevel,
    ChangeApprovalDecision,
    NonConformityStatus,
    QualitySeverity,
    QualityRiskControlStatus,
    RecallNotificationChannel,
    RecallNotificationStatus,
    RecallScopeType,
    RecallStatus,
    RegulatoryCodingStandard,
    RegulatoryDeviceType,
    RegulatoryLabelScopeType,
    RegulatoryLabelStatus,
    TechnovigilanceCaseType,
    TechnovigilanceCausality,
    TechnovigilanceSeverity,
    TechnovigilanceStatus,
    TechnovigilanceReportChannel,
} from '@scaffold/types';
import { AppError } from '../../../shared/utils/response';
import { CapaAction } from '../entities/capa-action.entity';
import { NonConformity } from '../entities/non-conformity.entity';
import { ProductionBatch } from '../entities/production-batch.entity';
import { ProductionBatchUnit } from '../entities/production-batch-unit.entity';
import { ProductionOrder } from '../entities/production-order.entity';
import { ControlledDocument } from '../entities/controlled-document.entity';
import { QualityAuditEvent } from '../entities/quality-audit-event.entity';
import { RecallCase } from '../entities/recall-case.entity';
import { QualityRiskControl } from '../entities/quality-risk-control.entity';
import { QualityTrainingEvidence } from '../entities/quality-training-evidence.entity';
import { TechnovigilanceCase } from '../entities/technovigilance-case.entity';
import { ProcessDeviation } from '../entities/process-deviation.entity';
import { OosCase } from '../entities/oos-case.entity';
import { ChangeControl } from '../entities/change-control.entity';
import { QualityDhrService } from './quality-dhr.service';
import { QualityPostmarketService } from './quality-postmarket.service';
import { QualityLabelingService } from './quality-labeling.service';
import { QualityIncomingService } from './quality-incoming.service';
import { QualityBatchReleaseService } from './quality-batch-release.service';
import { QualityDeviationOosService } from './quality-deviation-oos.service';
import { QualityChangeControlService } from './quality-change-control.service';

export class QualityService {
    private readonly em: EntityManager;
    private readonly ncRepo: EntityRepository<NonConformity>;
    private readonly capaRepo: EntityRepository<CapaAction>;
    private readonly auditRepo: EntityRepository<QualityAuditEvent>;
    private readonly technoRepo: EntityRepository<TechnovigilanceCase>;
    private readonly recallRepo: EntityRepository<RecallCase>;
    private readonly riskControlRepo: EntityRepository<QualityRiskControl>;
    private readonly trainingEvidenceRepo: EntityRepository<QualityTrainingEvidence>;
    private readonly controlledDocumentRepo: EntityRepository<ControlledDocument>;
    private readonly processDeviationRepo: EntityRepository<ProcessDeviation>;
    private readonly oosRepo: EntityRepository<OosCase>;
    private readonly changeControlRepo: EntityRepository<ChangeControl>;
    private readonly dhrService: QualityDhrService;
    private readonly postmarketService: QualityPostmarketService;
    private readonly labelingService: QualityLabelingService;
    private readonly incomingService: QualityIncomingService;
    private readonly batchReleaseService: QualityBatchReleaseService;
    private readonly deviationOosService: QualityDeviationOosService;
    private readonly changeControlService: QualityChangeControlService;

    constructor(em: EntityManager) {
        this.em = em;
        this.ncRepo = em.getRepository(NonConformity);
        this.capaRepo = em.getRepository(CapaAction);
        this.auditRepo = em.getRepository(QualityAuditEvent);
        this.technoRepo = em.getRepository(TechnovigilanceCase);
        this.recallRepo = em.getRepository(RecallCase);
        this.riskControlRepo = em.getRepository(QualityRiskControl);
        this.trainingEvidenceRepo = em.getRepository(QualityTrainingEvidence);
        this.controlledDocumentRepo = em.getRepository(ControlledDocument);
        this.processDeviationRepo = em.getRepository(ProcessDeviation);
        this.oosRepo = em.getRepository(OosCase);
        this.changeControlRepo = em.getRepository(ChangeControl);
        this.dhrService = new QualityDhrService(em, this.logEvent.bind(this));
        this.labelingService = new QualityLabelingService(em, this.logEvent.bind(this));
        this.incomingService = new QualityIncomingService(em, this.logEvent.bind(this));
        this.deviationOosService = new QualityDeviationOosService(em, this.logEvent.bind(this));
        this.changeControlService = new QualityChangeControlService(em, this.logEvent.bind(this));
        this.batchReleaseService = new QualityBatchReleaseService(
            em,
            this.logEvent.bind(this),
            this.labelingService.validateDispatchReadiness.bind(this.labelingService),
            this.getBatchOperationalBlockingIssues.bind(this)
        );
        this.postmarketService = new QualityPostmarketService(
            em,
            this.logEvent.bind(this),
            this.labelingService.validateDispatchReadiness.bind(this.labelingService),
            this.getBatchOperationalBlockingIssues.bind(this)
        );
    }

    private async getBatchOperationalBlockingIssues(productionBatchId: string): Promise<string[]> {
        const [deviationAndOos, criticalChanges] = await Promise.all([
            this.deviationOosService.getBatchBlockingIssues(productionBatchId),
            this.changeControlService.getBatchBlockingIssues(productionBatchId),
        ]);
        return [...deviationAndOos, ...criticalChanges];
    }

    async createNonConformity(payload: {
        title: string;
        description: string;
        severity?: QualitySeverity;
        source?: string;
        productionOrderId?: string;
        productionBatchId?: string;
        productionBatchUnitId?: string;
        createdBy?: string;
    }) {
        const nc = this.ncRepo.create({
            title: payload.title,
            description: payload.description,
            severity: payload.severity ?? QualitySeverity.MEDIA,
            source: payload.source ?? 'produccion',
            status: NonConformityStatus.ABIERTA,
            createdBy: payload.createdBy,
            productionOrder: payload.productionOrderId ? this.em.getReference(ProductionOrder, payload.productionOrderId) : undefined,
            productionBatch: payload.productionBatchId ? this.em.getReference(ProductionBatch, payload.productionBatchId) : undefined,
            productionBatchUnit: payload.productionBatchUnitId ? this.em.getReference(ProductionBatchUnit, payload.productionBatchUnitId) : undefined,
        } as unknown as NonConformity);

        await this.em.persistAndFlush(nc);
        await this.logEvent({
            entityType: 'non_conformity',
            entityId: nc.id,
            action: 'created',
            actor: payload.createdBy,
            metadata: { severity: nc.severity, source: nc.source },
        });

        return this.ncRepo.findOneOrFail(
            { id: nc.id },
            { populate: ['productionOrder', 'productionBatch', 'productionBatchUnit'] }
        );
    }

    async listNonConformities(filters: { status?: NonConformityStatus; severity?: QualitySeverity; source?: string }) {
        const query: FilterQuery<NonConformity> = {};
        if (filters.status) query.status = filters.status;
        if (filters.severity) query.severity = filters.severity;
        if (filters.source) query.source = filters.source;

        return this.ncRepo.find(query, {
            populate: ['productionOrder', 'productionBatch', 'productionBatchUnit'],
            orderBy: { createdAt: 'DESC' },
        });
    }

    async updateNonConformity(id: string, payload: Partial<{
        status: NonConformityStatus;
        rootCause: string;
        correctiveAction: string;
        severity: QualitySeverity;
        description: string;
        title: string;
    }>, actor?: string) {
        const nc = await this.ncRepo.findOneOrFail({ id });
        this.ncRepo.assign(nc, payload);
        await this.em.persistAndFlush(nc);

        await this.logEvent({
            entityType: 'non_conformity',
            entityId: nc.id,
            action: 'updated',
            actor,
            metadata: payload as Record<string, unknown>,
        });

        return nc;
    }

    async createCapa(payload: {
        nonConformityId: string;
        actionPlan: string;
        owner?: string;
        dueDate?: Date;
    }, actor?: string) {
        const nc = await this.ncRepo.findOneOrFail({ id: payload.nonConformityId });
        if (nc.status === NonConformityStatus.CERRADA) {
            throw new AppError('No puedes crear CAPA sobre una no conformidad cerrada', 400);
        }

        const capa = this.capaRepo.create({
            nonConformity: nc,
            actionPlan: payload.actionPlan,
            owner: payload.owner,
            dueDate: payload.dueDate,
            status: CapaStatus.ABIERTA,
        } as unknown as CapaAction);

        await this.em.persistAndFlush(capa);
        await this.logEvent({
            entityType: 'capa',
            entityId: capa.id,
            action: 'created',
            actor,
            metadata: { nonConformityId: payload.nonConformityId, owner: payload.owner },
        });
        return this.capaRepo.findOneOrFail({ id: capa.id }, { populate: ['nonConformity'] });
    }

    async listCapas(filters: { status?: CapaStatus; nonConformityId?: string }) {
        const query: FilterQuery<CapaAction> = {};
        if (filters.status) query.status = filters.status;
        if (filters.nonConformityId) query.nonConformity = filters.nonConformityId;
        return this.capaRepo.find(query, { populate: ['nonConformity'], orderBy: { createdAt: 'DESC' } });
    }

    async updateCapa(id: string, payload: Partial<{
        actionPlan: string;
        owner: string;
        dueDate: Date;
        verificationNotes: string;
        status: CapaStatus;
    }>, actor?: string) {
        const capa = await this.capaRepo.findOneOrFail({ id });
        this.capaRepo.assign(capa, payload);
        await this.em.persistAndFlush(capa);
        await this.logEvent({
            entityType: 'capa',
            entityId: capa.id,
            action: 'updated',
            actor,
            metadata: payload as Record<string, unknown>,
        });
        return capa;
    }

    async listAuditEvents(entityType?: string, entityId?: string) {
        const query: FilterQuery<QualityAuditEvent> = {};
        if (entityType) query.entityType = entityType;
        if (entityId) query.entityId = entityId;
        return this.auditRepo.find(query, { orderBy: { createdAt: 'DESC' }, limit: 200 });
    }

    async createTechnovigilanceCase(payload: {
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
    }) {
        return this.postmarketService.createTechnovigilanceCase(payload);
    }

    async listTechnovigilanceCases(filters: {
        status?: TechnovigilanceStatus;
        type?: TechnovigilanceCaseType;
        severity?: TechnovigilanceSeverity;
        causality?: TechnovigilanceCausality;
        reportedToInvima?: boolean;
    }) {
        return this.postmarketService.listTechnovigilanceCases(filters);
    }

    async updateTechnovigilanceCase(id: string, payload: Partial<{
        status: TechnovigilanceStatus;
        severity: TechnovigilanceSeverity;
        causality: TechnovigilanceCausality;
        investigationSummary: string;
        resolution: string;
    }>, actor?: string) {
        return this.postmarketService.updateTechnovigilanceCase(id, payload, actor);
    }

    async reportTechnovigilanceCase(id: string, payload: {
        reportNumber: string;
        reportChannel: TechnovigilanceReportChannel;
        reportPayloadRef?: string;
        reportedAt?: Date;
        ackAt?: Date;
    }, actor?: string) {
        return this.postmarketService.reportTechnovigilanceCase(id, payload, actor);
    }

    async createRecallCase(payload: {
        title: string;
        reason: string;
        scopeType: RecallScopeType;
        lotCode?: string;
        serialCode?: string;
        affectedQuantity: number;
        isMock?: boolean;
        targetResponseMinutes?: number;
        actor?: string;
    }) {
        return this.postmarketService.createRecallCase(payload);
    }

    async listRecallCases(filters: { status?: RecallStatus; isMock?: boolean }) {
        return this.postmarketService.listRecallCases(filters);
    }

    async updateRecallProgress(id: string, payload: {
        retrievedQuantity: number;
        actor?: string;
    }) {
        return this.postmarketService.updateRecallProgress(id, payload);
    }

    async addRecallNotification(id: string, payload: {
        recipientName: string;
        recipientContact: string;
        channel: RecallNotificationChannel;
        evidenceNotes?: string;
        actor?: string;
    }) {
        return this.postmarketService.addRecallNotification(id, payload);
    }

    async updateRecallNotification(notificationId: string, payload: {
        status: RecallNotificationStatus;
        sentAt?: Date;
        acknowledgedAt?: Date;
        evidenceNotes?: string;
        actor?: string;
    }) {
        return this.postmarketService.updateRecallNotification(notificationId, payload);
    }

    async closeRecallCase(id: string, payload: {
        closureEvidence: string;
        endedAt?: Date;
        actualResponseMinutes?: number;
        actor?: string;
    }) {
        return this.postmarketService.closeRecallCase(id, payload);
    }

    async createCustomer(payload: {
        name: string;
        documentType?: string;
        documentNumber?: string;
        contactName?: string;
        email?: string;
        phone?: string;
        address?: string;
        notes?: string;
    }, actor?: string) {
        return this.postmarketService.createCustomer(payload, actor);
    }

    async listCustomers(filters: { search?: string }) {
        return this.postmarketService.listCustomers(filters);
    }

    async createShipment(payload: {
        customerId: string;
        commercialDocument: string;
        shippedAt?: Date;
        dispatchedBy?: string;
        notes?: string;
        items: Array<{
            productionBatchId: string;
            productionBatchUnitId?: string;
            quantity: number;
        }>;
    }, actor?: string) {
        return this.postmarketService.createShipment(payload, actor);
    }

    async listShipments(filters: {
        customerId?: string;
        productionBatchId?: string;
        serialCode?: string;
        commercialDocument?: string;
    }) {
        return this.postmarketService.listShipments(filters);
    }

    async listRecallAffectedCustomers(recallCaseId: string) {
        return this.postmarketService.listRecallAffectedCustomers(recallCaseId);
    }

    async upsertRegulatoryLabel(payload: {
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
        manufactureDate: Date;
        expirationDate?: Date;
        gtin?: string;
        udiDi?: string;
        udiPi?: string;
        internalCode?: string;
        actor?: string;
    }) {
        return this.labelingService.upsertRegulatoryLabel(payload);
    }

    async listRegulatoryLabels(filters: {
        productionBatchId?: string;
        scopeType?: RegulatoryLabelScopeType;
        status?: RegulatoryLabelStatus;
    }) {
        return this.labelingService.listRegulatoryLabels(filters);
    }

    async validateDispatchReadiness(productionBatchId: string, actor?: string): Promise<DispatchValidationResult> {
        return this.labelingService.validateDispatchReadiness(productionBatchId, actor);
    }

    async getComplianceDashboard(): Promise<ComplianceKpiDashboard> {
        const [nonConformitiesOpen, capasOpen, technovigilanceOpen, recallsOpen, deviationsOpen, oosOpen, changeControlsPending] = await Promise.all([
            this.ncRepo.count({ status: { $ne: NonConformityStatus.CERRADA } }),
            this.capaRepo.count({ status: { $ne: CapaStatus.CERRADA } }),
            this.technoRepo.count({ status: { $ne: TechnovigilanceStatus.CERRADO } }),
            this.recallRepo.count({ status: { $ne: RecallStatus.CERRADO } }),
            this.processDeviationRepo.count({ status: { $ne: ProcessDeviationStatus.CERRADA } }),
            this.oosRepo.count({ status: { $ne: OosCaseStatus.CERRADO } }),
            this.changeControlRepo.count({ status: { $in: [ChangeControlStatus.BORRADOR, ChangeControlStatus.EN_EVALUACION] } }),
        ]);

        const recalls = await this.recallRepo.findAll();
        const recallCoverageAverage = recalls.length > 0
            ? Number((recalls.reduce((sum, row) => sum + Number(row.coveragePercent || 0), 0) / recalls.length).toFixed(2))
            : 0;

        const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
        const auditEventsLast30Days = await this.auditRepo.count({ createdAt: { $gte: thirtyDaysAgo } });

        const totalDocuments = await this.controlledDocumentRepo.count();
        const approvedDocuments = await this.controlledDocumentRepo.count({ status: DocumentStatus.APROBADO });
        const documentApprovalRate = totalDocuments > 0
            ? Number(((approvedDocuments / totalDocuments) * 100).toFixed(2))
            : 0;

        return {
            generatedAt: new Date(),
            nonConformitiesOpen,
            capasOpen,
            technovigilanceOpen,
            recallsOpen,
            deviationsOpen,
            oosOpen,
            changeControlsPending,
            recallCoverageAverage,
            auditEventsLast30Days,
            documentApprovalRate,
        };
    }

    async exportCompliance(format: 'csv' | 'json'): Promise<ComplianceExportFile> {
        const dashboard = await this.getComplianceDashboard();
        const rows = await this.auditRepo.find({}, { orderBy: { createdAt: 'DESC' }, limit: 500 });

        const generatedAt = new Date();
        if (format === 'json') {
            return {
                generatedAt,
                format,
                fileName: `invima_compliance_${generatedAt.toISOString()}.json`,
                content: JSON.stringify({ dashboard, auditEvents: rows }, null, 2),
            };
        }

        const header = [
            'id',
            'fecha',
            'entidad',
            'entityId',
            'accion',
            'actor',
            'notas',
        ].join(',');
        const lines = rows.map((row) => {
            const parts = [
                row.id,
                new Date(row.createdAt).toISOString(),
                row.entityType,
                row.entityId,
                row.action,
                row.actor || '',
                row.notes || '',
            ].map((part) => `"${String(part).replace(/"/g, '""')}"`);
            return parts.join(',');
        });
        return {
            generatedAt,
            format,
            fileName: `invima_compliance_${generatedAt.toISOString()}.csv`,
            content: [header, ...lines].join('\n'),
        };
    }

    async createDmrTemplate(payload: {
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
        approvedAt?: Date;
    }) {
        return this.dhrService.createDmrTemplate(payload);
    }

    async listDmrTemplates(filters: {
        productId?: string;
        process?: DocumentProcess;
        isActive?: boolean;
    }) {
        return this.dhrService.listDmrTemplates(filters);
    }

    async getBatchDhr(productionBatchId: string, actor?: string) {
        return this.dhrService.getBatchDhr(productionBatchId, actor);
    }

    async exportBatchDhr(productionBatchId: string, format: 'csv' | 'json', actor?: string) {
        return this.dhrService.exportBatchDhr(productionBatchId, format, actor);
    }

    async createRiskControl(payload: {
        process: DocumentProcess;
        risk: string;
        control: string;
        ownerRole: string;
        status?: QualityRiskControlStatus;
        evidenceRef?: string;
        actor?: string;
    }) {
        const row = this.riskControlRepo.create({
            process: payload.process,
            risk: payload.risk,
            control: payload.control,
            ownerRole: payload.ownerRole,
            status: payload.status ?? QualityRiskControlStatus.ACTIVO,
            evidenceRef: payload.evidenceRef,
            createdBy: payload.actor,
        } as unknown as QualityRiskControl);
        await this.em.persistAndFlush(row);
        await this.logEvent({
            entityType: 'quality_risk_control',
            entityId: row.id,
            action: 'created',
            actor: payload.actor,
            metadata: { process: row.process, status: row.status, ownerRole: row.ownerRole },
        });
        return row;
    }

    async listRiskControls(filters: { process?: DocumentProcess; status?: QualityRiskControlStatus }) {
        const query: FilterQuery<QualityRiskControl> = {};
        if (filters.process) query.process = filters.process;
        if (filters.status) query.status = filters.status;
        return this.riskControlRepo.find(query, { orderBy: { createdAt: 'DESC' } });
    }

    async createTrainingEvidence(payload: {
        role: string;
        personName: string;
        trainingTopic: string;
        completedAt: Date;
        validUntil?: Date;
        trainerName?: string;
        evidenceRef?: string;
        actor?: string;
    }) {
        const row = this.trainingEvidenceRepo.create({
            role: payload.role,
            personName: payload.personName,
            trainingTopic: payload.trainingTopic,
            completedAt: payload.completedAt,
            validUntil: payload.validUntil,
            trainerName: payload.trainerName,
            evidenceRef: payload.evidenceRef,
            createdBy: payload.actor,
        } as unknown as QualityTrainingEvidence);
        await this.em.persistAndFlush(row);
        await this.logEvent({
            entityType: 'quality_training_evidence',
            entityId: row.id,
            action: 'created',
            actor: payload.actor,
            metadata: { role: row.role, personName: row.personName, trainingTopic: row.trainingTopic },
        });
        return row;
    }

    async listTrainingEvidence(filters: { role?: string }) {
        const query: FilterQuery<QualityTrainingEvidence> = {};
        if (filters.role) query.role = { $ilike: `%${filters.role}%` };
        return this.trainingEvidenceRepo.find(query, { orderBy: { completedAt: 'DESC' } });
    }

    async listIncomingInspections(filters: {
        status?: IncomingInspectionStatus;
        rawMaterialId?: string;
        purchaseOrderId?: string;
    }) {
        return this.incomingService.listIncomingInspections(filters);
    }

    async resolveIncomingInspection(id: string, payload: {
        inspectionResult: IncomingInspectionResult;
        supplierLotCode?: string;
        certificateRef?: string;
        notes?: string;
        quantityAccepted: number;
        quantityRejected: number;
        actor?: string;
    }) {
        return this.incomingService.resolveIncomingInspection(id, payload);
    }

    async upsertBatchReleaseChecklist(payload: {
        productionBatchId: string;
        qcApproved: boolean;
        labelingValidated: boolean;
        documentsCurrent: boolean;
        evidencesComplete: boolean;
        checklistNotes?: string;
        rejectedReason?: string;
        actor?: string;
    }) {
        return this.batchReleaseService.upsertBatchReleaseChecklist(payload);
    }

    async signBatchRelease(productionBatchId: string, payload: {
        actor: string;
        approvalMethod: DocumentApprovalMethod;
        approvalSignature: string;
    }) {
        return this.batchReleaseService.signBatchRelease(productionBatchId, payload);
    }

    async listBatchReleases(filters: { productionBatchId?: string; status?: BatchReleaseStatus }) {
        return this.batchReleaseService.listBatchReleases(filters);
    }

    async createProcessDeviation(payload: {
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
    }) {
        return this.deviationOosService.createProcessDeviation(payload);
    }

    async listProcessDeviations(filters: {
        status?: ProcessDeviationStatus;
        productionBatchId?: string;
        productionOrderId?: string;
    }) {
        return this.deviationOosService.listProcessDeviations(filters);
    }

    async updateProcessDeviation(id: string, payload: Partial<{
        title: string;
        description: string;
        classification: string;
        status: ProcessDeviationStatus;
        containmentAction: string;
        investigationSummary: string;
        closureEvidence: string;
        capaActionId: string;
    }>, actor?: string) {
        return this.deviationOosService.updateProcessDeviation(id, payload, actor);
    }

    async createOosCase(payload: {
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
    }) {
        return this.deviationOosService.createOosCase(payload);
    }

    async listOosCases(filters: {
        status?: OosCaseStatus;
        productionBatchId?: string;
        productionOrderId?: string;
    }) {
        return this.deviationOosService.listOosCases(filters);
    }

    async updateOosCase(id: string, payload: Partial<{
        testName: string;
        resultValue: string;
        specification: string;
        status: OosCaseStatus;
        investigationSummary: string;
        disposition: OosDisposition;
        decisionNotes: string;
        capaActionId: string;
    }>, actor?: string) {
        return this.deviationOosService.updateOosCase(id, payload, actor);
    }

    async createChangeControl(payload: {
        title: string;
        description: string;
        type: ChangeControlType;
        impactLevel?: ChangeImpactLevel;
        evaluationSummary?: string;
        requestedBy?: string;
        effectiveDate?: Date;
        linkedDocumentId?: string;
        affectedProductionOrderId?: string;
        affectedProductionBatchId?: string;
        beforeChangeBatchCode?: string;
        afterChangeBatchCode?: string;
        actor?: string;
    }) {
        return this.changeControlService.createChangeControl(payload);
    }

    async listChangeControls(filters: {
        status?: ChangeControlStatus;
        type?: ChangeControlType;
        impactLevel?: ChangeImpactLevel;
        affectedProductionBatchId?: string;
        affectedProductionOrderId?: string;
    }) {
        return this.changeControlService.listChangeControls(filters);
    }

    async updateChangeControl(id: string, payload: Partial<{
        title: string;
        description: string;
        type: ChangeControlType;
        impactLevel: ChangeImpactLevel;
        status: ChangeControlStatus;
        evaluationSummary: string;
        requestedBy: string;
        effectiveDate: Date;
        linkedDocumentId: string;
        affectedProductionOrderId: string;
        affectedProductionBatchId: string;
        beforeChangeBatchCode: string;
        afterChangeBatchCode: string;
    }>, actor?: string) {
        return this.changeControlService.updateChangeControl(id, payload, actor);
    }

    async createChangeControlApproval(payload: {
        changeControlId: string;
        role: string;
        approver?: string;
        decision: ChangeApprovalDecision;
        decisionNotes?: string;
        actor?: string;
    }) {
        return this.changeControlService.createChangeControlApproval(payload);
    }

    async logEvent(payload: {
        entityType: string;
        entityId: string;
        action: string;
        actor?: string;
        notes?: string;
        metadata?: Record<string, unknown>;
    }) {
        const event = this.auditRepo.create(payload as unknown as QualityAuditEvent);
        await this.em.persistAndFlush(event);
        return event;
    }
}
