import { EntityManager, EntityRepository, FilterQuery } from '@mikro-orm/core';
import {
    CapaStatus,
    NonConformityStatus,
    QualitySeverity,
    RecallNotificationChannel,
    RecallNotificationStatus,
    RecallScopeType,
    RecallStatus,
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
import { QualityAuditEvent } from '../entities/quality-audit-event.entity';
import { RecallCase } from '../entities/recall-case.entity';
import { RecallNotification } from '../entities/recall-notification.entity';
import { TechnovigilanceCase } from '../entities/technovigilance-case.entity';

export class QualityService {
    private readonly em: EntityManager;
    private readonly ncRepo: EntityRepository<NonConformity>;
    private readonly capaRepo: EntityRepository<CapaAction>;
    private readonly auditRepo: EntityRepository<QualityAuditEvent>;
    private readonly technoRepo: EntityRepository<TechnovigilanceCase>;
    private readonly recallRepo: EntityRepository<RecallCase>;
    private readonly recallNotificationRepo: EntityRepository<RecallNotification>;

    constructor(em: EntityManager) {
        this.em = em;
        this.ncRepo = em.getRepository(NonConformity);
        this.capaRepo = em.getRepository(CapaAction);
        this.auditRepo = em.getRepository(QualityAuditEvent);
        this.technoRepo = em.getRepository(TechnovigilanceCase);
        this.recallRepo = em.getRepository(RecallCase);
        this.recallNotificationRepo = em.getRepository(RecallNotification);
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

    private calculateCoverage(affectedQuantity: number, retrievedQuantity: number) {
        if (affectedQuantity <= 0) return 0;
        const value = (retrievedQuantity / affectedQuantity) * 100;
        return Number(value.toFixed(2));
    }

    private calculateMinutes(startedAt: Date, endedAt?: Date) {
        const end = endedAt ?? new Date();
        return Math.max(1, Math.round((end.getTime() - startedAt.getTime()) / 60000));
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
