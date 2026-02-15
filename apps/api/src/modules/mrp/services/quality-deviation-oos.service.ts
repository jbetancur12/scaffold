import { EntityManager, EntityRepository, FilterQuery } from '@mikro-orm/core';
import { OosCaseStatus, OosDisposition, ProcessDeviationStatus } from '@scaffold/types';
import { AppError } from '../../../shared/utils/response';
import { CapaAction } from '../entities/capa-action.entity';
import { OosCase } from '../entities/oos-case.entity';
import { ProcessDeviation } from '../entities/process-deviation.entity';
import { ProductionBatch } from '../entities/production-batch.entity';
import { ProductionBatchUnit } from '../entities/production-batch-unit.entity';
import { ProductionOrder } from '../entities/production-order.entity';

type QualityAuditLogger = (payload: {
    entityType: string;
    entityId: string;
    action: string;
    actor?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
}) => Promise<unknown>;

export class QualityDeviationOosService {
    private readonly em: EntityManager;
    private readonly processDeviationRepo: EntityRepository<ProcessDeviation>;
    private readonly oosRepo: EntityRepository<OosCase>;
    private readonly logEvent: QualityAuditLogger;

    constructor(em: EntityManager, logEvent: QualityAuditLogger) {
        this.em = em;
        this.logEvent = logEvent;
        this.processDeviationRepo = em.getRepository(ProcessDeviation);
        this.oosRepo = em.getRepository(OosCase);
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
        const code = `DEV-${Date.now().toString(36).toUpperCase()}`;
        const row = this.processDeviationRepo.create({
            code,
            title: payload.title,
            description: payload.description,
            classification: payload.classification || 'general',
            status: ProcessDeviationStatus.ABIERTA,
            containmentAction: payload.containmentAction,
            investigationSummary: payload.investigationSummary,
            closureEvidence: payload.closureEvidence,
            productionOrder: payload.productionOrderId ? this.em.getReference(ProductionOrder, payload.productionOrderId) : undefined,
            productionBatch: payload.productionBatchId ? this.em.getReference(ProductionBatch, payload.productionBatchId) : undefined,
            productionBatchUnit: payload.productionBatchUnitId ? this.em.getReference(ProductionBatchUnit, payload.productionBatchUnitId) : undefined,
            capaAction: payload.capaActionId ? this.em.getReference(CapaAction, payload.capaActionId) : undefined,
            openedBy: payload.actor,
        } as unknown as ProcessDeviation);

        await this.em.persistAndFlush(row);
        await this.logEvent({
            entityType: 'process_deviation',
            entityId: row.id,
            action: 'created',
            actor: payload.actor,
            metadata: {
                code: row.code,
                status: row.status,
                productionBatchId: row.productionBatch?.id,
                productionBatchUnitId: row.productionBatchUnit?.id,
            },
        });

        return this.processDeviationRepo.findOneOrFail(
            { id: row.id },
            { populate: ['productionOrder', 'productionBatch', 'productionBatchUnit', 'capaAction'] }
        );
    }

    async listProcessDeviations(filters: {
        status?: ProcessDeviationStatus;
        productionBatchId?: string;
        productionOrderId?: string;
    }) {
        const query: FilterQuery<ProcessDeviation> = {};
        if (filters.status) query.status = filters.status;
        if (filters.productionBatchId) query.productionBatch = filters.productionBatchId;
        if (filters.productionOrderId) query.productionOrder = filters.productionOrderId;

        return this.processDeviationRepo.find(query, {
            populate: ['productionOrder', 'productionBatch', 'productionBatchUnit', 'capaAction'],
            orderBy: { createdAt: 'DESC' },
        });
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
        const row = await this.processDeviationRepo.findOneOrFail({ id }, { populate: ['capaAction'] });

        if (payload.status === ProcessDeviationStatus.CERRADA) {
            const investigationSummary = payload.investigationSummary ?? row.investigationSummary;
            if (!investigationSummary) {
                throw new AppError('Para cerrar la desviación debes registrar resumen de investigación', 400);
            }
            if (!payload.closureEvidence && !row.closureEvidence) {
                throw new AppError('Para cerrar la desviación debes registrar evidencia de cierre', 400);
            }
            row.closedAt = new Date();
            row.closedBy = actor;
        }

        if (payload.capaActionId !== undefined) {
            row.capaAction = payload.capaActionId ? this.em.getReference(CapaAction, payload.capaActionId) : undefined;
        }

        this.processDeviationRepo.assign(row, {
            title: payload.title,
            description: payload.description,
            classification: payload.classification,
            status: payload.status,
            containmentAction: payload.containmentAction,
            investigationSummary: payload.investigationSummary,
            closureEvidence: payload.closureEvidence,
        });

        await this.em.persistAndFlush(row);
        await this.logEvent({
            entityType: 'process_deviation',
            entityId: row.id,
            action: 'updated',
            actor,
            metadata: payload as Record<string, unknown>,
        });

        return this.processDeviationRepo.findOneOrFail(
            { id: row.id },
            { populate: ['productionOrder', 'productionBatch', 'productionBatchUnit', 'capaAction'] }
        );
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
        const code = `OOS-${Date.now().toString(36).toUpperCase()}`;
        const row = this.oosRepo.create({
            code,
            testName: payload.testName,
            resultValue: payload.resultValue,
            specification: payload.specification,
            status: OosCaseStatus.ABIERTO,
            investigationSummary: payload.investigationSummary,
            disposition: payload.disposition,
            decisionNotes: payload.decisionNotes,
            productionOrder: payload.productionOrderId ? this.em.getReference(ProductionOrder, payload.productionOrderId) : undefined,
            productionBatch: payload.productionBatchId ? this.em.getReference(ProductionBatch, payload.productionBatchId) : undefined,
            productionBatchUnit: payload.productionBatchUnitId ? this.em.getReference(ProductionBatchUnit, payload.productionBatchUnitId) : undefined,
            capaAction: payload.capaActionId ? this.em.getReference(CapaAction, payload.capaActionId) : undefined,
            blockedAt: new Date(),
            openedBy: payload.actor,
        } as unknown as OosCase);

        await this.em.persistAndFlush(row);
        await this.logEvent({
            entityType: 'oos_case',
            entityId: row.id,
            action: 'created',
            actor: payload.actor,
            metadata: {
                code: row.code,
                status: row.status,
                productionBatchId: row.productionBatch?.id,
                productionBatchUnitId: row.productionBatchUnit?.id,
            },
        });

        return this.oosRepo.findOneOrFail(
            { id: row.id },
            { populate: ['productionOrder', 'productionBatch', 'productionBatchUnit', 'capaAction'] }
        );
    }

    async listOosCases(filters: {
        status?: OosCaseStatus;
        productionBatchId?: string;
        productionOrderId?: string;
    }) {
        const query: FilterQuery<OosCase> = {};
        if (filters.status) query.status = filters.status;
        if (filters.productionBatchId) query.productionBatch = filters.productionBatchId;
        if (filters.productionOrderId) query.productionOrder = filters.productionOrderId;

        return this.oosRepo.find(query, {
            populate: ['productionOrder', 'productionBatch', 'productionBatchUnit', 'capaAction'],
            orderBy: { createdAt: 'DESC' },
        });
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
        const row = await this.oosRepo.findOneOrFail({ id }, { populate: ['capaAction'] });

        if (payload.status === OosCaseStatus.CERRADO) {
            const disposition = payload.disposition ?? row.disposition;
            const decisionNotes = payload.decisionNotes ?? row.decisionNotes;
            if (!disposition) {
                throw new AppError('Para cerrar OOS debes registrar disposición QA', 400);
            }
            if (!decisionNotes) {
                throw new AppError('Para cerrar OOS debes registrar notas de decisión', 400);
            }
            row.releasedAt = new Date();
            row.closedBy = actor;
        }

        if (payload.capaActionId !== undefined) {
            row.capaAction = payload.capaActionId ? this.em.getReference(CapaAction, payload.capaActionId) : undefined;
        }

        this.oosRepo.assign(row, {
            testName: payload.testName,
            resultValue: payload.resultValue,
            specification: payload.specification,
            status: payload.status,
            investigationSummary: payload.investigationSummary,
            disposition: payload.disposition,
            decisionNotes: payload.decisionNotes,
        });

        await this.em.persistAndFlush(row);
        await this.logEvent({
            entityType: 'oos_case',
            entityId: row.id,
            action: 'updated',
            actor,
            metadata: payload as Record<string, unknown>,
        });

        return this.oosRepo.findOneOrFail(
            { id: row.id },
            { populate: ['productionOrder', 'productionBatch', 'productionBatchUnit', 'capaAction'] }
        );
    }

    async getBatchBlockingIssues(productionBatchId: string): Promise<string[]> {
        const [openDeviations, openOos] = await Promise.all([
            this.processDeviationRepo.find(
                {
                    productionBatch: productionBatchId,
                    status: { $ne: ProcessDeviationStatus.CERRADA },
                },
                { orderBy: { createdAt: 'DESC' }, limit: 5 }
            ),
            this.oosRepo.find(
                {
                    productionBatch: productionBatchId,
                    status: { $ne: OosCaseStatus.CERRADO },
                },
                { orderBy: { createdAt: 'DESC' }, limit: 5 }
            ),
        ]);

        const issues: string[] = [];
        if (openDeviations.length > 0) {
            issues.push(`Hay ${openDeviations.length} desviación(es) abierta(s) en el lote`);
        }
        if (openOos.length > 0) {
            issues.push(`Hay ${openOos.length} caso(s) OOS abierto(s) en el lote`);
        }

        return issues;
    }
}
