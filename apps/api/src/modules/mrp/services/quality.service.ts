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
    ProductionBatchPackagingStatus,
    ProductionBatchQcStatus,
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
    InvimaRegistrationStatus,
    TechnovigilanceCaseType,
    TechnovigilanceCausality,
    TechnovigilanceSeverity,
    TechnovigilanceStatus,
    TechnovigilanceReportChannel,
    WarehouseType,
} from '@scaffold/types';
import { AppError } from '../../../shared/utils/response';
import { CapaAction } from '../entities/capa-action.entity';
import { NonConformity } from '../entities/non-conformity.entity';
import { ProductionBatch } from '../entities/production-batch.entity';
import { ProductionBatchUnit } from '../entities/production-batch-unit.entity';
import { ProductionOrder } from '../entities/production-order.entity';
import { IncomingInspection } from '../entities/incoming-inspection.entity';
import { BatchRelease } from '../entities/batch-release.entity';
import { ControlledDocument } from '../entities/controlled-document.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { QualityAuditEvent } from '../entities/quality-audit-event.entity';
import { RecallCase } from '../entities/recall-case.entity';
import { RecallNotification } from '../entities/recall-notification.entity';
import { QualityRiskControl } from '../entities/quality-risk-control.entity';
import { QualityTrainingEvidence } from '../entities/quality-training-evidence.entity';
import { RegulatoryLabel } from '../entities/regulatory-label.entity';
import { TechnovigilanceCase } from '../entities/technovigilance-case.entity';
import { Warehouse } from '../entities/warehouse.entity';
import { MrpService } from './mrp.service';
import { DocumentControlService } from './document-control.service';

export class QualityService {
    private readonly em: EntityManager;
    private readonly ncRepo: EntityRepository<NonConformity>;
    private readonly capaRepo: EntityRepository<CapaAction>;
    private readonly auditRepo: EntityRepository<QualityAuditEvent>;
    private readonly technoRepo: EntityRepository<TechnovigilanceCase>;
    private readonly recallRepo: EntityRepository<RecallCase>;
    private readonly recallNotificationRepo: EntityRepository<RecallNotification>;
    private readonly regulatoryLabelRepo: EntityRepository<RegulatoryLabel>;
    private readonly riskControlRepo: EntityRepository<QualityRiskControl>;
    private readonly trainingEvidenceRepo: EntityRepository<QualityTrainingEvidence>;
    private readonly controlledDocumentRepo: EntityRepository<ControlledDocument>;
    private readonly incomingInspectionRepo: EntityRepository<IncomingInspection>;
    private readonly batchReleaseRepo: EntityRepository<BatchRelease>;
    private readonly inventoryRepo: EntityRepository<InventoryItem>;
    private readonly warehouseRepo: EntityRepository<Warehouse>;

    constructor(em: EntityManager) {
        this.em = em;
        this.ncRepo = em.getRepository(NonConformity);
        this.capaRepo = em.getRepository(CapaAction);
        this.auditRepo = em.getRepository(QualityAuditEvent);
        this.technoRepo = em.getRepository(TechnovigilanceCase);
        this.recallRepo = em.getRepository(RecallCase);
        this.recallNotificationRepo = em.getRepository(RecallNotification);
        this.regulatoryLabelRepo = em.getRepository(RegulatoryLabel);
        this.riskControlRepo = em.getRepository(QualityRiskControl);
        this.trainingEvidenceRepo = em.getRepository(QualityTrainingEvidence);
        this.controlledDocumentRepo = em.getRepository(ControlledDocument);
        this.incomingInspectionRepo = em.getRepository(IncomingInspection);
        this.batchReleaseRepo = em.getRepository(BatchRelease);
        this.inventoryRepo = em.getRepository(InventoryItem);
        this.warehouseRepo = em.getRepository(Warehouse);
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
        const row = this.technoRepo.create({
            title: payload.title,
            description: payload.description,
            type: payload.type ?? TechnovigilanceCaseType.QUEJA,
            severity: payload.severity ?? TechnovigilanceSeverity.MODERADA,
            causality: payload.causality,
            status: TechnovigilanceStatus.ABIERTO,
            reportedToInvima: false,
            productionOrder: payload.productionOrderId ? this.em.getReference(ProductionOrder, payload.productionOrderId) : undefined,
            productionBatch: payload.productionBatchId ? this.em.getReference(ProductionBatch, payload.productionBatchId) : undefined,
            productionBatchUnit: payload.productionBatchUnitId ? this.em.getReference(ProductionBatchUnit, payload.productionBatchUnitId) : undefined,
            lotCode: payload.lotCode,
            serialCode: payload.serialCode,
            createdBy: payload.createdBy,
        } as unknown as TechnovigilanceCase);

        await this.em.persistAndFlush(row);
        await this.logEvent({
            entityType: 'technovigilance_case',
            entityId: row.id,
            action: 'created',
            actor: payload.createdBy,
            metadata: { type: row.type, severity: row.severity },
        });

        return this.technoRepo.findOneOrFail(
            { id: row.id },
            { populate: ['productionOrder', 'productionBatch', 'productionBatchUnit'] }
        );
    }

    async listTechnovigilanceCases(filters: {
        status?: TechnovigilanceStatus;
        type?: TechnovigilanceCaseType;
        severity?: TechnovigilanceSeverity;
        causality?: TechnovigilanceCausality;
        reportedToInvima?: boolean;
    }) {
        const query: FilterQuery<TechnovigilanceCase> = {};
        if (filters.status) query.status = filters.status;
        if (filters.type) query.type = filters.type;
        if (filters.severity) query.severity = filters.severity;
        if (filters.causality) query.causality = filters.causality;
        if (typeof filters.reportedToInvima === 'boolean') query.reportedToInvima = filters.reportedToInvima;

        return this.technoRepo.find(query, {
            populate: ['productionOrder', 'productionBatch', 'productionBatchUnit'],
            orderBy: { createdAt: 'DESC' },
        });
    }

    async updateTechnovigilanceCase(id: string, payload: Partial<{
        status: TechnovigilanceStatus;
        severity: TechnovigilanceSeverity;
        causality: TechnovigilanceCausality;
        investigationSummary: string;
        resolution: string;
    }>, actor?: string) {
        const row = await this.technoRepo.findOneOrFail({ id });
        this.technoRepo.assign(row, payload);

        await this.em.persistAndFlush(row);
        await this.logEvent({
            entityType: 'technovigilance_case',
            entityId: row.id,
            action: 'updated',
            actor,
            metadata: payload as Record<string, unknown>,
        });
        return row;
    }

    async reportTechnovigilanceCase(id: string, payload: {
        reportNumber: string;
        reportChannel: TechnovigilanceReportChannel;
        reportPayloadRef?: string;
        reportedAt?: Date;
        ackAt?: Date;
    }, actor?: string) {
        const row = await this.technoRepo.findOneOrFail({ id });

        if (row.reportedToInvima || row.invimaReportNumber) {
            throw new AppError('El caso ya fue reportado a INVIMA', 409);
        }

        row.reportedToInvima = true;
        row.reportedAt = payload.reportedAt ?? new Date();
        row.invimaReportNumber = payload.reportNumber;
        row.invimaReportChannel = payload.reportChannel;
        row.invimaReportPayloadRef = payload.reportPayloadRef;
        row.invimaAckAt = payload.ackAt;
        row.reportedBy = actor;
        row.status = row.status === TechnovigilanceStatus.CERRADO
            ? TechnovigilanceStatus.CERRADO
            : TechnovigilanceStatus.REPORTADO;

        await this.em.persistAndFlush(row);
        await this.logEvent({
            entityType: 'technovigilance_case',
            entityId: row.id,
            action: 'reported_invima',
            actor,
            metadata: {
                reportNumber: row.invimaReportNumber,
                reportChannel: row.invimaReportChannel,
                reportPayloadRef: row.invimaReportPayloadRef,
                reportedAt: row.reportedAt,
                ackAt: row.invimaAckAt,
            },
        });
        return row;
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
        const code = `RCL-${Date.now().toString(36).toUpperCase()}`;
        const row = this.recallRepo.create({
            code,
            title: payload.title,
            reason: payload.reason,
            scopeType: payload.scopeType,
            lotCode: payload.lotCode,
            serialCode: payload.serialCode,
            affectedQuantity: payload.affectedQuantity,
            retrievedQuantity: 0,
            coveragePercent: 0,
            status: RecallStatus.ABIERTO,
            isMock: payload.isMock ?? false,
            targetResponseMinutes: payload.targetResponseMinutes,
            startedAt: new Date(),
            createdBy: payload.actor,
        } as unknown as RecallCase);

        await this.em.persistAndFlush(row);
        await this.logEvent({
            entityType: 'recall_case',
            entityId: row.id,
            action: 'created',
            actor: payload.actor,
            metadata: {
                code: row.code,
                scopeType: row.scopeType,
                lotCode: row.lotCode,
                serialCode: row.serialCode,
                isMock: row.isMock,
                affectedQuantity: row.affectedQuantity,
            },
        });
        return this.recallRepo.findOneOrFail({ id: row.id }, { populate: ['notifications'] });
    }

    async listRecallCases(filters: { status?: RecallStatus; isMock?: boolean }) {
        const query: FilterQuery<RecallCase> = {};
        if (filters.status) query.status = filters.status;
        if (typeof filters.isMock === 'boolean') query.isMock = filters.isMock;
        return this.recallRepo.find(query, { populate: ['notifications'], orderBy: { createdAt: 'DESC' } });
    }

    async updateRecallProgress(id: string, payload: {
        retrievedQuantity: number;
        actor?: string;
    }) {
        const row = await this.recallRepo.findOneOrFail({ id });
        if (row.status === RecallStatus.CERRADO) {
            throw new AppError('No puedes actualizar un recall cerrado', 400);
        }
        if (payload.retrievedQuantity > row.affectedQuantity) {
            throw new AppError('La cantidad recuperada no puede exceder la afectada', 400);
        }

        row.retrievedQuantity = payload.retrievedQuantity;
        row.coveragePercent = this.calculateCoverage(row.affectedQuantity, row.retrievedQuantity);
        if (row.status === RecallStatus.ABIERTO) {
            row.status = RecallStatus.EN_EJECUCION;
        }

        await this.em.persistAndFlush(row);
        await this.logEvent({
            entityType: 'recall_case',
            entityId: row.id,
            action: 'progress_updated',
            actor: payload.actor,
            metadata: {
                retrievedQuantity: row.retrievedQuantity,
                coveragePercent: row.coveragePercent,
            },
        });
        return row;
    }

    async addRecallNotification(id: string, payload: {
        recipientName: string;
        recipientContact: string;
        channel: RecallNotificationChannel;
        evidenceNotes?: string;
        actor?: string;
    }) {
        const recallCase = await this.recallRepo.findOneOrFail({ id });
        if (recallCase.status === RecallStatus.CERRADO) {
            throw new AppError('No puedes notificar un recall cerrado', 400);
        }

        const notification = this.recallNotificationRepo.create({
            recallCase,
            recipientName: payload.recipientName,
            recipientContact: payload.recipientContact,
            channel: payload.channel,
            status: RecallNotificationStatus.PENDIENTE,
            evidenceNotes: payload.evidenceNotes,
            createdBy: payload.actor,
        } as unknown as RecallNotification);

        if (recallCase.status === RecallStatus.ABIERTO) {
            recallCase.status = RecallStatus.EN_EJECUCION;
        }

        await this.em.persistAndFlush([notification, recallCase]);
        await this.logEvent({
            entityType: 'recall_notification',
            entityId: notification.id,
            action: 'created',
            actor: payload.actor,
            metadata: {
                recallCaseId: id,
                channel: notification.channel,
                status: notification.status,
            },
        });
        return notification;
    }

    async updateRecallNotification(notificationId: string, payload: {
        status: RecallNotificationStatus;
        sentAt?: Date;
        acknowledgedAt?: Date;
        evidenceNotes?: string;
        actor?: string;
    }) {
        const notification = await this.recallNotificationRepo.findOneOrFail({ id: notificationId }, { populate: ['recallCase'] });
        notification.status = payload.status;
        if (payload.sentAt) notification.sentAt = payload.sentAt;
        if (payload.acknowledgedAt) notification.acknowledgedAt = payload.acknowledgedAt;
        if (payload.evidenceNotes !== undefined) notification.evidenceNotes = payload.evidenceNotes;

        await this.em.persistAndFlush(notification);
        await this.logEvent({
            entityType: 'recall_notification',
            entityId: notification.id,
            action: 'updated',
            actor: payload.actor,
            metadata: {
                recallCaseId: notification.recallCase.id,
                status: notification.status,
                sentAt: notification.sentAt,
                acknowledgedAt: notification.acknowledgedAt,
            },
        });
        return notification;
    }

    async closeRecallCase(id: string, payload: {
        closureEvidence: string;
        endedAt?: Date;
        actualResponseMinutes?: number;
        actor?: string;
    }) {
        const row = await this.recallRepo.findOneOrFail({ id });
        if (row.status === RecallStatus.CERRADO) {
            throw new AppError('El recall ya está cerrado', 409);
        }

        row.status = RecallStatus.CERRADO;
        row.endedAt = payload.endedAt ?? new Date();
        row.closureEvidence = payload.closureEvidence;
        row.actualResponseMinutes = payload.actualResponseMinutes ?? this.calculateMinutes(row.startedAt, row.endedAt);
        row.coveragePercent = this.calculateCoverage(row.affectedQuantity, row.retrievedQuantity);

        await this.em.persistAndFlush(row);
        await this.logEvent({
            entityType: 'recall_case',
            entityId: row.id,
            action: 'closed',
            actor: payload.actor,
            metadata: {
                closureEvidence: row.closureEvidence,
                endedAt: row.endedAt,
                actualResponseMinutes: row.actualResponseMinutes,
                coveragePercent: row.coveragePercent,
            },
        });
        return row;
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
        const batch = await this.em.findOneOrFail(
            ProductionBatch,
            { id: payload.productionBatchId },
            { populate: ['units', 'variant', 'variant.product', 'variant.product.invimaRegistration'] }
        );
        let unit: ProductionBatchUnit | undefined;

        if (payload.productionBatchUnitId) {
            unit = await this.em.findOneOrFail(ProductionBatchUnit, { id: payload.productionBatchUnitId }, { populate: ['batch'] });
            if (unit.batch.id !== batch.id) {
                throw new AppError('La unidad serial no pertenece al lote indicado', 400);
            }
        }

        if (payload.scopeType === RegulatoryLabelScopeType.SERIAL && !unit) {
            throw new AppError('Para etiqueta serial debes indicar productionBatchUnitId', 400);
        }
        if (payload.scopeType === RegulatoryLabelScopeType.LOTE && unit) {
            throw new AppError('Una etiqueta de lote no puede amarrarse a una unidad serial', 400);
        }

        const serialCode = payload.scopeType === RegulatoryLabelScopeType.SERIAL
            ? (unit?.serialCode ?? payload.serialCode)
            : undefined;
        const product = batch.variant.product;
        const linkedRegistration = product.invimaRegistration;
        const lotCode = payload.lotCode || batch.code;
        const productName = payload.productName || product.name;
        const manufacturerName = payload.manufacturerName || linkedRegistration?.manufacturerName || linkedRegistration?.holderName || 'Fabricante no definido';
        let invimaRegistration = payload.invimaRegistration;

        if (product.requiresInvima) {
            if (!invimaRegistration) {
                invimaRegistration = linkedRegistration?.code;
            }
            if (!invimaRegistration) {
                throw new AppError('El producto requiere INVIMA y no tiene registro activo asociado', 400);
            }
            if (linkedRegistration) {
                const now = new Date();
                if (linkedRegistration.status !== InvimaRegistrationStatus.ACTIVO) {
                    throw new AppError('El registro INVIMA asociado no está activo', 400);
                }
                if (linkedRegistration.validFrom && linkedRegistration.validFrom > now) {
                    throw new AppError('El registro INVIMA aún no está vigente', 400);
                }
                if (linkedRegistration.validUntil && linkedRegistration.validUntil < now) {
                    throw new AppError('El registro INVIMA está vencido', 400);
                }
            }
        } else {
            invimaRegistration = invimaRegistration || linkedRegistration?.code || 'NO_REQUIERE_INVIMA';
        }
        const effectiveInternalCode = payload.codingStandard === RegulatoryCodingStandard.INTERNO
            ? (payload.internalCode || (serialCode ? `${lotCode}-${serialCode}` : lotCode))
            : payload.internalCode;

        let row: RegulatoryLabel | null = null;
        if (payload.scopeType === RegulatoryLabelScopeType.SERIAL && unit) {
            row = await this.regulatoryLabelRepo.findOne({ productionBatchUnit: unit.id });
        } else if (payload.scopeType === RegulatoryLabelScopeType.LOTE) {
            row = await this.regulatoryLabelRepo.findOne({
                productionBatch: batch.id,
                scopeType: RegulatoryLabelScopeType.LOTE,
                productionBatchUnit: null,
            });
        }

        if (!row) {
            row = this.regulatoryLabelRepo.create({
                productionBatch: batch,
                productionBatchUnit: unit,
                scopeType: payload.scopeType,
                createdBy: payload.actor,
            } as unknown as RegulatoryLabel);
        }

        this.regulatoryLabelRepo.assign(row, {
            productionBatch: batch,
            productionBatchUnit: unit,
            scopeType: payload.scopeType,
            deviceType: payload.deviceType,
            codingStandard: payload.codingStandard,
            productName,
            manufacturerName,
            invimaRegistration,
            lotCode,
            serialCode,
            manufactureDate: payload.manufactureDate,
            expirationDate: payload.expirationDate,
            gtin: payload.gtin,
            udiDi: payload.udiDi,
            udiPi: payload.udiPi,
            internalCode: effectiveInternalCode,
            codingValue: this.buildCodingValue({
                codingStandard: payload.codingStandard,
                gtin: payload.gtin,
                lotCode,
                serialCode,
                expirationDate: payload.expirationDate,
                udiDi: payload.udiDi,
                udiPi: payload.udiPi,
                internalCode: effectiveInternalCode,
            }),
        });

        const errors = this.validateRegulatoryLabel({
            scopeType: payload.scopeType,
            deviceType: payload.deviceType,
            codingStandard: payload.codingStandard,
            lotCode,
            serialCode,
            manufactureDate: payload.manufactureDate,
            expirationDate: payload.expirationDate,
            gtin: payload.gtin,
            udiDi: payload.udiDi,
            internalCode: effectiveInternalCode,
        });

        row.validationErrors = errors;
        row.status = errors.length === 0 ? RegulatoryLabelStatus.VALIDADA : RegulatoryLabelStatus.BLOQUEADA;

        await this.em.persistAndFlush(row);
        await this.logEvent({
            entityType: 'regulatory_label',
            entityId: row.id,
            action: 'upserted',
            actor: payload.actor,
            metadata: {
                batchId: batch.id,
                batchUnitId: unit?.id,
                scopeType: row.scopeType,
                status: row.status,
                errors,
            },
        });
        return row;
    }

    async listRegulatoryLabels(filters: {
        productionBatchId?: string;
        scopeType?: RegulatoryLabelScopeType;
        status?: RegulatoryLabelStatus;
    }) {
        const query: FilterQuery<RegulatoryLabel> = {};
        if (filters.productionBatchId) query.productionBatch = filters.productionBatchId;
        if (filters.scopeType) query.scopeType = filters.scopeType;
        if (filters.status) query.status = filters.status;
        return this.regulatoryLabelRepo.find(query, {
            populate: ['productionBatch', 'productionBatchUnit'],
            orderBy: { createdAt: 'DESC' },
        });
    }

    async validateDispatchReadiness(productionBatchId: string, actor?: string): Promise<DispatchValidationResult> {
        const batch = await this.em.findOneOrFail(ProductionBatch, { id: productionBatchId }, { populate: ['units'] });
        const labels = await this.regulatoryLabelRepo.find({ productionBatch: productionBatchId }, { populate: ['productionBatchUnit'] });
        const errors: string[] = [];

        const lotLabel = labels.find((label) =>
            label.scopeType === RegulatoryLabelScopeType.LOTE &&
            !label.productionBatchUnit &&
            label.status === RegulatoryLabelStatus.VALIDADA
        );
        if (!lotLabel) {
            errors.push('Falta etiqueta regulatoria de lote en estado validada');
        }

        const unitsRequiringLabel = batch.units
            .getItems()
            .filter((unit) => !unit.rejected && unit.qcPassed && unit.packaged);
        const validSerialLabelUnitIds = new Set(
            labels
                .filter((label) =>
                    label.scopeType === RegulatoryLabelScopeType.SERIAL &&
                    label.status === RegulatoryLabelStatus.VALIDADA &&
                    !!label.productionBatchUnit
                )
                .map((label) => label.productionBatchUnit!.id)
        );
        const missingUnits = unitsRequiringLabel.filter((unit) => !validSerialLabelUnitIds.has(unit.id));
        if (missingUnits.length > 0) {
            errors.push(`Faltan etiquetas seriales validadas para ${missingUnits.length} unidad(es) empacada(s)`);
        }

        const result: DispatchValidationResult = {
            batchId: productionBatchId,
            eligible: errors.length === 0,
            validatedAt: new Date(),
            errors,
            requiredSerialLabels: unitsRequiringLabel.length,
            validatedSerialLabels: unitsRequiringLabel.length - missingUnits.length,
        };

        await this.logEvent({
            entityType: 'production_batch',
            entityId: productionBatchId,
            action: 'dispatch_validated',
            actor,
            metadata: result as unknown as Record<string, unknown>,
        });

        return result;
    }

    async getComplianceDashboard(): Promise<ComplianceKpiDashboard> {
        const [nonConformitiesOpen, capasOpen, technovigilanceOpen, recallsOpen] = await Promise.all([
            this.ncRepo.count({ status: { $ne: NonConformityStatus.CERRADA } }),
            this.capaRepo.count({ status: { $ne: CapaStatus.CERRADA } }),
            this.technoRepo.count({ status: { $ne: TechnovigilanceStatus.CERRADO } }),
            this.recallRepo.count({ status: { $ne: RecallStatus.CERRADO } }),
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
        const query: FilterQuery<IncomingInspection> = {};
        if (filters.status) query.status = filters.status;
        if (filters.rawMaterialId) query.rawMaterial = filters.rawMaterialId;
        if (filters.purchaseOrderId) query.purchaseOrder = filters.purchaseOrderId;
        return this.incomingInspectionRepo.find(query, {
            populate: ['rawMaterial', 'warehouse', 'purchaseOrder', 'purchaseOrder.supplier', 'purchaseOrderItem', 'purchaseOrderItem.rawMaterial'],
            orderBy: { createdAt: 'DESC' },
        });
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
        const row = await this.incomingInspectionRepo.findOneOrFail(
            { id },
            { populate: ['rawMaterial', 'warehouse'] }
        );
        if (row.status !== IncomingInspectionStatus.PENDIENTE) {
            throw new AppError('La inspección ya fue resuelta', 409);
        }

        const totalResolved = Number(payload.quantityAccepted) + Number(payload.quantityRejected);
        if (totalResolved !== Number(row.quantityReceived)) {
            throw new AppError('La suma aceptada/rechazada debe ser igual a la cantidad recibida', 400);
        }

        const quarantineInventory = await this.inventoryRepo.findOne({
            rawMaterial: row.rawMaterial.id,
            warehouse: row.warehouse.id,
        });
        if (!quarantineInventory || Number(quarantineInventory.quantity) < totalResolved) {
            throw new AppError('No hay stock suficiente en cuarentena para resolver la inspección', 400);
        }

        row.inspectionResult = payload.inspectionResult;
        row.supplierLotCode = payload.supplierLotCode;
        row.certificateRef = payload.certificateRef;
        row.notes = payload.notes;
        row.quantityAccepted = payload.quantityAccepted;
        row.quantityRejected = payload.quantityRejected;
        row.inspectedBy = payload.actor;
        row.inspectedAt = new Date();
        row.releasedBy = payload.actor;
        row.releasedAt = new Date();
        row.status = payload.quantityAccepted > 0
            ? IncomingInspectionStatus.LIBERADO
            : IncomingInspectionStatus.RECHAZADO;

        quarantineInventory.quantity = Number(quarantineInventory.quantity) - totalResolved;

        if (payload.quantityAccepted > 0) {
            let releasedWarehouse = await this.warehouseRepo.findOne({ type: WarehouseType.RAW_MATERIALS });
            if (!releasedWarehouse) {
                releasedWarehouse = this.warehouseRepo.create({
                    name: 'Main Warehouse',
                    location: 'Default Location',
                    type: WarehouseType.RAW_MATERIALS,
                } as Warehouse);
                await this.em.persistAndFlush(releasedWarehouse);
            }

            let releasedInventory = await this.inventoryRepo.findOne({
                rawMaterial: row.rawMaterial.id,
                warehouse: releasedWarehouse.id,
            });
            if (!releasedInventory) {
                releasedInventory = this.inventoryRepo.create({
                    rawMaterial: row.rawMaterial,
                    warehouse: releasedWarehouse,
                    quantity: 0,
                } as InventoryItem);
            }

            const currentStock = Number(releasedInventory.quantity);
            const acceptedQty = Number(payload.quantityAccepted);
            releasedInventory.quantity = currentStock + acceptedQty;

            const purchasePrice = Number(row.rawMaterial.lastPurchasePrice || row.rawMaterial.averageCost || 0);
            const currentAvg = Number(row.rawMaterial.averageCost || 0);
            if (currentStock + acceptedQty > 0 && purchasePrice > 0) {
                row.rawMaterial.averageCost = ((currentStock * currentAvg) + (acceptedQty * purchasePrice)) / (currentStock + acceptedQty);
            }

            await this.em.persistAndFlush([releasedInventory, row.rawMaterial]);
            const mrpService = new MrpService(this.em);
            await mrpService.recalculateVariantsByMaterial(row.rawMaterial.id);
        }

        await this.em.persistAndFlush([row, quarantineInventory]);
        await this.logEvent({
            entityType: 'incoming_inspection',
            entityId: row.id,
            action: 'resolved',
            actor: payload.actor,
            metadata: {
                status: row.status,
                inspectionResult: row.inspectionResult,
                quantityAccepted: row.quantityAccepted,
                quantityRejected: row.quantityRejected,
                rawMaterialId: row.rawMaterial.id,
            },
        });
        return row;
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
        const batch = await this.em.findOneOrFail(ProductionBatch, { id: payload.productionBatchId }, { populate: ['units'] });
        let row = await this.batchReleaseRepo.findOne({ productionBatch: batch.id });
        if (!row) {
            row = this.batchReleaseRepo.create({ productionBatch: batch } as unknown as BatchRelease);
        }

        row.qcApproved = payload.qcApproved;
        row.labelingValidated = payload.labelingValidated;
        row.documentsCurrent = payload.documentsCurrent;
        row.evidencesComplete = payload.evidencesComplete;
        row.checklistNotes = payload.checklistNotes;
        row.rejectedReason = payload.rejectedReason;
        row.reviewedBy = payload.actor;
        row.status = payload.rejectedReason
            ? BatchReleaseStatus.RECHAZADO
            : BatchReleaseStatus.PENDIENTE_LIBERACION;
        row.signedBy = undefined;
        row.approvalMethod = undefined;
        row.approvalSignature = undefined;
        row.signedAt = undefined;

        await this.em.persistAndFlush(row);
        await this.logEvent({
            entityType: 'batch_release',
            entityId: row.id,
            action: 'checklist_updated',
            actor: payload.actor,
            metadata: {
                productionBatchId: batch.id,
                status: row.status,
                qcApproved: row.qcApproved,
                labelingValidated: row.labelingValidated,
                documentsCurrent: row.documentsCurrent,
                evidencesComplete: row.evidencesComplete,
            },
        });
        return row;
    }

    async signBatchRelease(productionBatchId: string, payload: {
        actor: string;
        approvalMethod: DocumentApprovalMethod;
        approvalSignature: string;
    }) {
        const batch = await this.em.findOneOrFail(ProductionBatch, { id: productionBatchId }, { populate: ['units'] });
        const row = await this.batchReleaseRepo.findOneOrFail({ productionBatch: batch.id });
        if (row.status === BatchReleaseStatus.RECHAZADO) {
            throw new AppError('El checklist está rechazado, corrige antes de firmar', 409);
        }
        if (!row.qcApproved || !row.labelingValidated || !row.documentsCurrent || !row.evidencesComplete) {
            throw new AppError('Checklist incompleto, no se puede liberar el lote', 400);
        }
        if (
            batch.qcStatus !== ProductionBatchQcStatus.PASSED ||
            batch.packagingStatus !== ProductionBatchPackagingStatus.PACKED
        ) {
            throw new AppError('El lote debe estar con QC y empaque aprobados', 400);
        }

        const docService = new DocumentControlService(this.em);
        await docService.assertActiveProcessDocument(DocumentProcess.PRODUCCION);
        await docService.assertActiveProcessDocument(DocumentProcess.CONTROL_CALIDAD);
        await docService.assertActiveProcessDocument(DocumentProcess.EMPAQUE);

        const dispatchValidation = await this.validateDispatchReadiness(batch.id, payload.actor);
        if (!dispatchValidation.eligible) {
            throw new AppError(`No se puede liberar QA: ${dispatchValidation.errors.join(' | ')}`, 400);
        }

        row.status = BatchReleaseStatus.LIBERADO_QA;
        row.signedBy = payload.actor;
        row.approvalMethod = payload.approvalMethod;
        row.approvalSignature = payload.approvalSignature;
        row.signedAt = new Date();
        row.documentsCurrent = true;

        await this.em.persistAndFlush(row);
        await this.logEvent({
            entityType: 'batch_release',
            entityId: row.id,
            action: 'signed',
            actor: payload.actor,
            metadata: {
                productionBatchId: batch.id,
                approvalMethod: row.approvalMethod,
                signedAt: row.signedAt,
                status: row.status,
            },
        });
        return row;
    }

    async listBatchReleases(filters: { productionBatchId?: string; status?: BatchReleaseStatus }) {
        const query: FilterQuery<BatchRelease> = {};
        if (filters.productionBatchId) query.productionBatch = filters.productionBatchId;
        if (filters.status) query.status = filters.status;
        return this.batchReleaseRepo.find(query, {
            populate: ['productionBatch'],
            orderBy: { createdAt: 'DESC' },
        });
    }

    private calculateCoverage(affectedQuantity: number, retrievedQuantity: number) {
        if (affectedQuantity <= 0) return 0;
        const value = (retrievedQuantity / affectedQuantity) * 100;
        return Number(value.toFixed(2));
    }

    private calculateMinutes(startedAt: Date, endedAt?: Date) {
        const end = endedAt ?? new Date();
        return Math.max(1, Math.round((end.getTime() - startedAt.getTime()) / 60000));
    }

    private validateRegulatoryLabel(payload: {
        scopeType: RegulatoryLabelScopeType;
        deviceType: RegulatoryDeviceType;
        codingStandard: RegulatoryCodingStandard;
        lotCode: string;
        serialCode?: string;
        manufactureDate: Date;
        expirationDate?: Date;
        gtin?: string;
        udiDi?: string;
        internalCode?: string;
    }) {
        const errors: string[] = [];

        if (!payload.lotCode) errors.push('lotCode es obligatorio');
        if (!payload.manufactureDate) errors.push('manufactureDate es obligatorio');
        if (payload.scopeType === RegulatoryLabelScopeType.SERIAL && !payload.serialCode) {
            errors.push('serialCode es obligatorio para alcance serial');
        }
        if (payload.deviceType !== RegulatoryDeviceType.CLASE_I && !payload.expirationDate) {
            errors.push('expirationDate es obligatorio para dispositivos clase II y III');
        }

        if (payload.codingStandard === RegulatoryCodingStandard.GS1 && !payload.gtin) {
            errors.push('gtin es obligatorio para estándar GS1');
        }
        if (payload.codingStandard === RegulatoryCodingStandard.HIBCC && !payload.udiDi) {
            errors.push('udiDi es obligatorio para estándar HIBCC');
        }
        if (payload.codingStandard === RegulatoryCodingStandard.INTERNO && !payload.internalCode) {
            errors.push('internalCode es obligatorio para estándar interno');
        }

        return errors;
    }

    private buildCodingValue(payload: {
        codingStandard: RegulatoryCodingStandard;
        gtin?: string;
        lotCode: string;
        serialCode?: string;
        expirationDate?: Date;
        udiDi?: string;
        udiPi?: string;
        internalCode?: string;
    }) {
        if (payload.codingStandard === RegulatoryCodingStandard.GS1) {
            const exp = payload.expirationDate ? payload.expirationDate.toISOString().slice(2, 10).replace(/-/g, '') : '';
            return `(01)${payload.gtin || ''}(10)${payload.lotCode}${exp ? `(17)${exp}` : ''}${payload.serialCode ? `(21)${payload.serialCode}` : ''}`;
        }
        if (payload.codingStandard === RegulatoryCodingStandard.HIBCC) {
            return `HIBCC-${payload.udiDi || ''}-${payload.lotCode}${payload.serialCode ? `-${payload.serialCode}` : ''}${payload.udiPi ? `-${payload.udiPi}` : ''}`;
        }
        return payload.internalCode || '';
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
