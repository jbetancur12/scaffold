import { EntityManager, EntityRepository, FilterQuery } from '@mikro-orm/core';
import { CapaStatus, NonConformityStatus, QualitySeverity } from '@scaffold/types';
import { AppError } from '../../../shared/utils/response';
import { CapaAction } from '../entities/capa-action.entity';
import { NonConformity } from '../entities/non-conformity.entity';
import { ProductionBatch } from '../entities/production-batch.entity';
import { ProductionBatchUnit } from '../entities/production-batch-unit.entity';
import { ProductionOrder } from '../entities/production-order.entity';
import { QualityAuditEvent } from '../entities/quality-audit-event.entity';

export class QualityService {
    private readonly em: EntityManager;
    private readonly ncRepo: EntityRepository<NonConformity>;
    private readonly capaRepo: EntityRepository<CapaAction>;
    private readonly auditRepo: EntityRepository<QualityAuditEvent>;

    constructor(em: EntityManager) {
        this.em = em;
        this.ncRepo = em.getRepository(NonConformity);
        this.capaRepo = em.getRepository(CapaAction);
        this.auditRepo = em.getRepository(QualityAuditEvent);
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
