import { EntityManager, EntityRepository, FilterQuery } from '@mikro-orm/core';
import { ControlledDocument } from '../entities/controlled-document.entity';
import { AppError } from '../../../shared/utils/response';
import { DocumentProcess, DocumentStatus } from '@scaffold/types';
import { QualityAuditEvent } from '../entities/quality-audit-event.entity';

export class DocumentControlService {
    private readonly em: EntityManager;
    private readonly repo: EntityRepository<ControlledDocument>;
    private readonly auditRepo: EntityRepository<QualityAuditEvent>;

    constructor(em: EntityManager) {
        this.em = em;
        this.repo = em.getRepository(ControlledDocument);
        this.auditRepo = em.getRepository(QualityAuditEvent);
    }

    async create(payload: {
        code: string;
        title: string;
        process: DocumentProcess;
        version?: number;
        content?: string;
        effectiveDate?: Date;
        expiresAt?: Date;
    }, actor?: string) {
        const doc = this.repo.create({
            ...payload,
            version: payload.version ?? 1,
            status: DocumentStatus.BORRADOR,
        } as unknown as ControlledDocument);
        await this.em.persistAndFlush(doc);
        await this.log('controlled_document', doc.id, 'created', actor, { code: doc.code, version: doc.version });
        return doc;
    }

    async list(filters: { process?: DocumentProcess; status?: DocumentStatus }) {
        const query: FilterQuery<ControlledDocument> = {};
        if (filters.process) query.process = filters.process;
        if (filters.status) query.status = filters.status;
        return this.repo.find(query, { orderBy: [{ code: 'ASC' }, { version: 'DESC' }] });
    }

    async submitForReview(id: string, actor?: string) {
        const doc = await this.repo.findOneOrFail({ id });
        if (doc.status !== DocumentStatus.BORRADOR) {
            throw new AppError('Solo puedes enviar a revisión un documento en borrador', 400);
        }
        doc.status = DocumentStatus.EN_REVISION;
        await this.em.persistAndFlush(doc);
        await this.log('controlled_document', doc.id, 'submitted_for_review', actor);
        return doc;
    }

    async approve(id: string, actor?: string) {
        const doc = await this.repo.findOneOrFail({ id });
        if (doc.status !== DocumentStatus.EN_REVISION && doc.status !== DocumentStatus.BORRADOR) {
            throw new AppError('El documento no está en estado aprobable', 400);
        }

        const now = new Date();
        doc.status = DocumentStatus.APROBADO;
        doc.approvedBy = actor;
        doc.approvedAt = now;
        doc.effectiveDate = doc.effectiveDate ?? now;
        await this.em.persistAndFlush(doc);

        // Mark older approved versions as obsolete for same code.
        const previous = await this.repo.find({
            code: doc.code,
            id: { $ne: doc.id },
            status: DocumentStatus.APROBADO,
        });
        for (const older of previous) {
            older.status = DocumentStatus.OBSOLETO;
            await this.em.persist(older);
        }
        await this.em.flush();

        await this.log('controlled_document', doc.id, 'approved', actor, { code: doc.code, version: doc.version });
        return doc;
    }

    async getActiveByProcess(process: DocumentProcess) {
        const now = new Date();
        const docs = await this.repo.find(
            {
                process,
                status: DocumentStatus.APROBADO,
                $or: [
                    { expiresAt: null },
                    { expiresAt: { $gt: now } },
                ],
                $and: [
                    {
                        $or: [
                            { effectiveDate: null },
                            { effectiveDate: { $lte: now } },
                        ],
                    },
                ],
            },
            { orderBy: [{ code: 'ASC' }, { version: 'DESC' }] }
        );
        return docs;
    }

    async assertActiveProcessDocument(process: DocumentProcess) {
        const docs = await this.getActiveByProcess(process);
        if (docs.length === 0) {
            throw new AppError(`No existe documento aprobado vigente para el proceso ${process}`, 400);
        }
    }

    private async log(entityType: string, entityId: string, action: string, actor?: string, metadata?: Record<string, unknown>) {
        const evt = this.auditRepo.create({
            entityType,
            entityId,
            action,
            actor,
            metadata,
        } as unknown as QualityAuditEvent);
        await this.em.persistAndFlush(evt);
    }
}
