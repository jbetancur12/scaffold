import { EntityManager, EntityRepository, FilterQuery } from '@mikro-orm/core';
import {
    ChangeApprovalDecision,
    ChangeControlStatus,
    ChangeControlType,
    ChangeImpactLevel,
} from '@scaffold/types';
import { AppError } from '../../../shared/utils/response';
import { ChangeControlApproval } from '../entities/change-control-approval.entity';
import { ChangeControl } from '../entities/change-control.entity';
import { ControlledDocument } from '../entities/controlled-document.entity';
import { ProductionBatch } from '../entities/production-batch.entity';
import { ProductionOrder } from '../entities/production-order.entity';

type QualityAuditLogger = (payload: {
    entityType: string;
    entityId: string;
    action: string;
    actor?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
}) => Promise<unknown>;

export class QualityChangeControlService {
    private readonly em: EntityManager;
    private readonly changeControlRepo: EntityRepository<ChangeControl>;
    private readonly changeApprovalRepo: EntityRepository<ChangeControlApproval>;
    private readonly logEvent: QualityAuditLogger;

    constructor(em: EntityManager, logEvent: QualityAuditLogger) {
        this.em = em;
        this.logEvent = logEvent;
        this.changeControlRepo = em.getRepository(ChangeControl);
        this.changeApprovalRepo = em.getRepository(ChangeControlApproval);
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
        const code = `CHG-${Date.now().toString(36).toUpperCase()}`;
        const row = this.changeControlRepo.create({
            code,
            title: payload.title,
            description: payload.description,
            type: payload.type,
            impactLevel: payload.impactLevel ?? ChangeImpactLevel.MEDIO,
            status: ChangeControlStatus.BORRADOR,
            evaluationSummary: payload.evaluationSummary,
            requestedBy: payload.requestedBy ?? payload.actor,
            effectiveDate: payload.effectiveDate,
            linkedDocument: payload.linkedDocumentId ? this.em.getReference(ControlledDocument, payload.linkedDocumentId) : undefined,
            affectedProductionOrder: payload.affectedProductionOrderId ? this.em.getReference(ProductionOrder, payload.affectedProductionOrderId) : undefined,
            affectedProductionBatch: payload.affectedProductionBatchId ? this.em.getReference(ProductionBatch, payload.affectedProductionBatchId) : undefined,
            beforeChangeBatchCode: payload.beforeChangeBatchCode,
            afterChangeBatchCode: payload.afterChangeBatchCode,
        } as unknown as ChangeControl);

        await this.em.persistAndFlush(row);
        await this.logEvent({
            entityType: 'change_control',
            entityId: row.id,
            action: 'created',
            actor: payload.actor,
            metadata: {
                code: row.code,
                type: row.type,
                impactLevel: row.impactLevel,
                status: row.status,
            },
        });

        return this.changeControlRepo.findOneOrFail(
            { id: row.id },
            { populate: ['linkedDocument', 'affectedProductionOrder', 'affectedProductionBatch', 'approvalRows'] }
        );
    }

    async listChangeControls(filters: {
        status?: ChangeControlStatus;
        type?: ChangeControlType;
        impactLevel?: ChangeImpactLevel;
        affectedProductionBatchId?: string;
        affectedProductionOrderId?: string;
    }) {
        const query: FilterQuery<ChangeControl> = {};
        if (filters.status) query.status = filters.status;
        if (filters.type) query.type = filters.type;
        if (filters.impactLevel) query.impactLevel = filters.impactLevel;
        if (filters.affectedProductionBatchId) query.affectedProductionBatch = filters.affectedProductionBatchId;
        if (filters.affectedProductionOrderId) query.affectedProductionOrder = filters.affectedProductionOrderId;

        return this.changeControlRepo.find(query, {
            populate: ['linkedDocument', 'affectedProductionOrder', 'affectedProductionBatch', 'approvalRows'],
            orderBy: { createdAt: 'DESC' },
        });
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
        const row = await this.changeControlRepo.findOneOrFail({ id }, { populate: ['approvalRows'] });

        if (payload.status === ChangeControlStatus.APROBADO) {
            await this.assertApprovalRequirements(row);
        }

        if (payload.linkedDocumentId !== undefined) {
            row.linkedDocument = payload.linkedDocumentId ? this.em.getReference(ControlledDocument, payload.linkedDocumentId) : undefined;
        }
        if (payload.affectedProductionOrderId !== undefined) {
            row.affectedProductionOrder = payload.affectedProductionOrderId ? this.em.getReference(ProductionOrder, payload.affectedProductionOrderId) : undefined;
        }
        if (payload.affectedProductionBatchId !== undefined) {
            row.affectedProductionBatch = payload.affectedProductionBatchId ? this.em.getReference(ProductionBatch, payload.affectedProductionBatchId) : undefined;
        }

        this.changeControlRepo.assign(row, {
            title: payload.title,
            description: payload.description,
            type: payload.type,
            impactLevel: payload.impactLevel,
            status: payload.status,
            evaluationSummary: payload.evaluationSummary,
            requestedBy: payload.requestedBy,
            effectiveDate: payload.effectiveDate,
            beforeChangeBatchCode: payload.beforeChangeBatchCode,
            afterChangeBatchCode: payload.afterChangeBatchCode,
        });

        await this.em.persistAndFlush(row);
        await this.logEvent({
            entityType: 'change_control',
            entityId: row.id,
            action: 'updated',
            actor,
            metadata: payload as Record<string, unknown>,
        });

        return this.changeControlRepo.findOneOrFail(
            { id: row.id },
            { populate: ['linkedDocument', 'affectedProductionOrder', 'affectedProductionBatch', 'approvalRows'] }
        );
    }

    async createChangeControlApproval(payload: {
        changeControlId: string;
        role: string;
        approver?: string;
        decision: ChangeApprovalDecision;
        decisionNotes?: string;
        actor?: string;
    }) {
        const change = await this.changeControlRepo.findOneOrFail({ id: payload.changeControlId }, { populate: ['approvalRows'] });
        if (change.status === ChangeControlStatus.IMPLEMENTADO || change.status === ChangeControlStatus.CANCELADO) {
            throw new AppError('No puedes registrar aprobaciones sobre cambios implementados/cancelados', 409);
        }

        const existing = change.approvalRows.getItems().find((row) => row.role.toLowerCase() === payload.role.toLowerCase());
        if (existing) {
            existing.approver = payload.approver ?? payload.actor;
            existing.decision = payload.decision;
            existing.decisionNotes = payload.decisionNotes;
            existing.decidedAt = payload.decision === ChangeApprovalDecision.PENDIENTE ? undefined : new Date();
            await this.em.persistAndFlush(existing);

            await this.logEvent({
                entityType: 'change_control_approval',
                entityId: existing.id,
                action: 'updated',
                actor: payload.actor,
                metadata: {
                    changeControlId: change.id,
                    role: existing.role,
                    decision: existing.decision,
                },
            });
        } else {
            const approval = this.changeApprovalRepo.create({
                changeControl: change,
                role: payload.role,
                approver: payload.approver ?? payload.actor,
                decision: payload.decision,
                decisionNotes: payload.decisionNotes,
                decidedAt: payload.decision === ChangeApprovalDecision.PENDIENTE ? undefined : new Date(),
            } as unknown as ChangeControlApproval);

            await this.em.persistAndFlush(approval);
            await this.logEvent({
                entityType: 'change_control_approval',
                entityId: approval.id,
                action: 'created',
                actor: payload.actor,
                metadata: {
                    changeControlId: change.id,
                    role: approval.role,
                    decision: approval.decision,
                },
            });
        }

        if (change.status === ChangeControlStatus.BORRADOR) {
            change.status = ChangeControlStatus.EN_EVALUACION;
            await this.em.persistAndFlush(change);
        }

        return this.changeControlRepo.findOneOrFail(
            { id: change.id },
            { populate: ['linkedDocument', 'affectedProductionOrder', 'affectedProductionBatch', 'approvalRows'] }
        );
    }

    private async assertApprovalRequirements(row: ChangeControl) {
        await this.em.populate(row, ['approvalRows']);
        const approvals = row.approvalRows.getItems();
        const approved = approvals.filter((item) => item.decision === ChangeApprovalDecision.APROBADO);
        const rejected = approvals.filter((item) => item.decision === ChangeApprovalDecision.RECHAZADO);

        if (rejected.length > 0) {
            throw new AppError('No se puede aprobar el cambio: existe aprobación rechazada', 400);
        }

        if (row.impactLevel === ChangeImpactLevel.CRITICO) {
            if (approved.length < 2) {
                throw new AppError('Cambio crítico requiere al menos 2 aprobaciones', 400);
            }
            return;
        }

        if (approved.length < 1) {
            throw new AppError('Debes registrar al menos una aprobación para aprobar el cambio', 400);
        }
    }
}
