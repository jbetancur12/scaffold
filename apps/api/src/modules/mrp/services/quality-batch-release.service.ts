import { EntityManager, EntityRepository, FilterQuery } from '@mikro-orm/core';
import {
    BatchReleaseStatus,
    DocumentCategory,
    DocumentProcess,
    DocumentStatus,
    DispatchValidationResult,
    DocumentApprovalMethod,
    ProductionBatchPackagingStatus,
    ProductionBatchQcStatus,
} from '@scaffold/types';
import { AppError } from '../../../shared/utils/response';
import { BatchRelease } from '../entities/batch-release.entity';
import { ProductionBatch } from '../entities/production-batch.entity';
import { ControlledDocument } from '../entities/controlled-document.entity';
import { OperationalConfig } from '../entities/operational-config.entity';

type QualityAuditLogger = (payload: {
    entityType: string;
    entityId: string;
    action: string;
    actor?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
}) => Promise<unknown>;

type DispatchValidator = (productionBatchId: string, actor?: string) => Promise<DispatchValidationResult>;
type BatchBlockingValidator = (productionBatchId: string) => Promise<string[]>;

export class QualityBatchReleaseService {
    private readonly em: EntityManager;
    private readonly batchReleaseRepo: EntityRepository<BatchRelease>;
    private readonly operationalConfigRepo: EntityRepository<OperationalConfig>;
    private readonly controlledDocRepo: EntityRepository<ControlledDocument>;
    private readonly logEvent: QualityAuditLogger;
    private readonly validateDispatchReadiness: DispatchValidator;
    private readonly getBatchBlockingIssues: BatchBlockingValidator;

    constructor(
        em: EntityManager,
        logEvent: QualityAuditLogger,
        validateDispatchReadiness: DispatchValidator,
        getBatchBlockingIssues: BatchBlockingValidator
    ) {
        this.em = em;
        this.logEvent = logEvent;
        this.validateDispatchReadiness = validateDispatchReadiness;
        this.getBatchBlockingIssues = getBatchBlockingIssues;
        this.batchReleaseRepo = em.getRepository(BatchRelease);
        this.operationalConfigRepo = em.getRepository(OperationalConfig);
        this.controlledDocRepo = em.getRepository(ControlledDocument);
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
        const controlledDoc = await this.resolveBatchReleaseControlledDocument();
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
        row.documentControlId = controlledDoc.id;
        row.documentControlCode = controlledDoc.code;
        row.documentControlTitle = controlledDoc.title;
        row.documentControlVersion = controlledDoc.version;
        row.documentControlDate = controlledDoc.effectiveDate || controlledDoc.approvedAt || controlledDoc.updatedAt;
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
            throw new AppError('El checklist esta rechazado, corrige antes de firmar', 409);
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

        const dispatchValidation = await this.validateDispatchReadiness(batch.id, payload.actor);
        if (!dispatchValidation.eligible) {
            throw new AppError(`No se puede liberar QA: ${dispatchValidation.errors.join(' | ')}`, 400);
        }

        const blockingIssues = await this.getBatchBlockingIssues(batch.id);
        if (blockingIssues.length > 0) {
            throw new AppError(`No se puede liberar QA: ${blockingIssues.join(' | ')}`, 400);
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

    private async resolveBatchReleaseControlledDocument() {
        const configs = await this.operationalConfigRepo.findAll({ limit: 1, orderBy: { createdAt: 'DESC' } });
        const code = configs[0]?.defaultBatchReleaseControlledDocumentCode?.trim();
        if (!code) {
            throw new AppError('Debes configurar el formato global de liberación QA', 400);
        }
        const now = new Date();
        const doc = await this.controlledDocRepo.findOne({
            code,
            process: DocumentProcess.CONTROL_CALIDAD,
            documentCategory: DocumentCategory.FOR,
            status: DocumentStatus.APROBADO,
            $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
            $and: [{ $or: [{ effectiveDate: null }, { effectiveDate: { $lte: now } }] }],
        }, { orderBy: { version: 'DESC' } });
        if (!doc) {
            throw new AppError(`El formato global de liberación QA (${code}) no está aprobado/vigente`, 400);
        }
        return doc;
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
}
