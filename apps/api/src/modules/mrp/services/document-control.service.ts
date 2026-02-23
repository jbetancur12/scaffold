import { EntityManager, EntityRepository, FilterQuery } from '@mikro-orm/core';
import { ControlledDocument } from '../entities/controlled-document.entity';
import { AppError } from '../../../shared/utils/response';
import { DocumentApprovalMethod, DocumentCategory, DocumentProcess, DocumentProcessAreaCode, DocumentStatus } from '@scaffold/types';
import { QualityAuditEvent } from '../entities/quality-audit-event.entity';
import { ObjectStorageService } from '../../../shared/services/object-storage.service';
import { extname } from 'node:path';

export class DocumentControlService {
    private readonly em: EntityManager;
    private readonly repo: EntityRepository<ControlledDocument>;
    private readonly auditRepo: EntityRepository<QualityAuditEvent>;
    private readonly storageService: ObjectStorageService;
    private static readonly FIRST_DOCUMENT_REQUIRED_TITLE = 'CONTROL DE DOCUMENTOS COLMOR';

    constructor(em: EntityManager) {
        this.em = em;
        this.repo = em.getRepository(ControlledDocument);
        this.auditRepo = em.getRepository(QualityAuditEvent);
        this.storageService = new ObjectStorageService();
    }

    private decodeBase64Data(base64Data: string): Buffer {
        const normalized = base64Data.includes(',')
            ? base64Data.split(',').pop() ?? ''
            : base64Data;
        if (!normalized) {
            throw new AppError('Archivo base64 inválido', 400);
        }
        return Buffer.from(normalized, 'base64');
    }

    private buildDownloadFileName(doc: ControlledDocument, originalFileName: string) {
        const extension = extname(originalFileName) || '';
        const base = `${doc.code} v${doc.version} - ${doc.title}`
            .replace(/[^a-zA-Z0-9 _().-]/g, '_')
            .replace(/\s+/g, ' ')
            .trim();
        return `${base}${extension}`;
    }

    async create(payload: {
        code: string;
        title: string;
        process: DocumentProcess;
        documentCategory: DocumentCategory;
        processAreaCode: DocumentProcessAreaCode;
        version?: number;
        content?: string;
        effectiveDate?: Date;
        expiresAt?: Date;
    }, actor?: string) {
        const existingDocuments = await this.repo.count();
        if (existingDocuments === 0) {
            const normalizedTitle = payload.title.trim().toUpperCase();
            if (normalizedTitle !== DocumentControlService.FIRST_DOCUMENT_REQUIRED_TITLE) {
                throw new AppError(
                    `El primer documento debe ser "${DocumentControlService.FIRST_DOCUMENT_REQUIRED_TITLE}"`,
                    400
                );
            }
        }

        const doc = this.repo.create({
            ...payload,
            version: payload.version ?? 1,
            status: DocumentStatus.BORRADOR,
        } as unknown as ControlledDocument);
        await this.em.persistAndFlush(doc);
        await this.log('controlled_document', doc.id, 'created', actor, { code: doc.code, version: doc.version });
        return doc;
    }

    async list(filters: {
        process?: DocumentProcess;
        documentCategory?: DocumentCategory;
        processAreaCode?: DocumentProcessAreaCode;
        status?: DocumentStatus;
    }) {
        const query: FilterQuery<ControlledDocument> = {};
        if (filters.process) query.process = filters.process;
        if (filters.documentCategory) query.documentCategory = filters.documentCategory;
        if (filters.processAreaCode) query.processAreaCode = filters.processAreaCode;
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

    async approve(id: string, payload: {
        actor: string;
        approvalMethod: DocumentApprovalMethod;
        approvalSignature: string;
    }) {
        const doc = await this.repo.findOneOrFail({ id });
        if (doc.status !== DocumentStatus.EN_REVISION) {
            throw new AppError('El documento no está en estado aprobable', 400);
        }

        const now = new Date();
        doc.status = DocumentStatus.APROBADO;
        doc.approvedBy = payload.actor;
        doc.approvedAt = now;
        doc.approvalMethod = payload.approvalMethod;
        doc.approvalSignature = payload.approvalSignature;
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

        await this.log('controlled_document', doc.id, 'approved', payload.actor, {
            code: doc.code,
            version: doc.version,
            approvalMethod: doc.approvalMethod,
            hasSignature: Boolean(doc.approvalSignature),
        });
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

    async uploadSourceFile(id: string, payload: {
        fileName: string;
        mimeType: string;
        base64Data: string;
        actor?: string;
    }) {
        const doc = await this.repo.findOneOrFail({ id });
        const buffer = this.decodeBase64Data(payload.base64Data);
        const maxBytes = 8 * 1024 * 1024; // 8 MB
        if (buffer.length === 0 || buffer.length > maxBytes) {
            throw new AppError('El archivo debe tener entre 1 byte y 8 MB', 400);
        }

        await this.storageService.deleteObject(doc.sourceFilePath);
        const folderPrefix = [doc.documentCategory, doc.processAreaCode]
            .filter(Boolean)
            .map((v) => String(v).toLowerCase())
            .join('/');
        const persisted = await this.storageService.saveObject({
            fileName: payload.fileName,
            mimeType: payload.mimeType,
            buffer,
            folderPrefix,
        });
        doc.sourceFileName = this.buildDownloadFileName(doc, payload.fileName);
        doc.sourceFileMime = payload.mimeType;
        doc.sourceFilePath = persisted.storagePath;

        await this.em.persistAndFlush(doc);
        await this.log('controlled_document', doc.id, 'source_file_uploaded', payload.actor, {
            code: doc.code,
            version: doc.version,
            sourceFileName: doc.sourceFileName,
            sourceFileMime: doc.sourceFileMime,
            size: buffer.length,
        });
        return doc;
    }

    async readSourceFile(id: string) {
        const doc = await this.repo.findOneOrFail({ id });
        if (!doc.sourceFilePath || !doc.sourceFileName) {
            throw new AppError('El documento no tiene archivo fuente adjunto', 404);
        }
        const buffer = await this.storageService.readObject(doc.sourceFilePath);
        return {
            fileName: doc.sourceFileName,
            mimeType: doc.sourceFileMime || 'application/octet-stream',
            buffer,
        };
    }

    async getPrintableHtml(id: string) {
        const doc = await this.repo.findOneOrFail({ id });
        const approvedAt = doc.approvedAt ? new Date(doc.approvedAt).toLocaleString('es-CO') : 'N/A';
        const effectiveDate = doc.effectiveDate ? new Date(doc.effectiveDate).toLocaleDateString('es-CO') : 'N/A';
        const expiresAt = doc.expiresAt ? new Date(doc.expiresAt).toLocaleDateString('es-CO') : 'Sin fecha';

        return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${doc.code} v${doc.version}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 24px; }
    h1,h2 { margin: 0; }
    .header { border: 1px solid #0f172a; padding: 12px; margin-bottom: 16px; }
    .meta { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    .meta th,.meta td { border: 1px solid #0f172a; padding: 8px; text-align: left; font-size: 12px; }
    .content { border: 1px solid #0f172a; padding: 12px; min-height: 180px; white-space: pre-wrap; }
    .footer { margin-top: 20px; font-size: 11px; color: #334155; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Control de Documento</h1>
    <h2>${doc.title}</h2>
  </div>
  <table class="meta">
    <tr><th>Código</th><td>${doc.code}</td><th>Versión</th><td>${doc.version}</td></tr>
    <tr><th>Proceso</th><td>${doc.process}</td><th>Estado</th><td>${doc.status}</td></tr>
    <tr><th>Aprobado por</th><td>${doc.approvedBy || 'N/A'}</td><th>Fecha aprobación</th><td>${approvedAt}</td></tr>
    <tr><th>Vigencia desde</th><td>${effectiveDate}</td><th>Vigencia hasta</th><td>${expiresAt}</td></tr>
  </table>
  <div class="content">${doc.content || 'Sin contenido textual. Consulte archivo fuente adjunto.'}</div>
  <div class="footer">
    Generado por el sistema de calidad. Puedes usar Imprimir y guardar como PDF.
  </div>
</body>
</html>`;
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
