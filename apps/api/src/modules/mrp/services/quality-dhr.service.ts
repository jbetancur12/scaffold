import { EntityManager, EntityRepository, FilterQuery } from '@mikro-orm/core';
import {
    BatchDhrExpedient,
    BatchDhrExportFile,
    DocumentProcess,
    IncomingInspectionStatus,
} from '@scaffold/types';
import { BatchRelease } from '../entities/batch-release.entity';
import { BOMItem } from '../entities/bom-item.entity';
import { CapaAction } from '../entities/capa-action.entity';
import { DmrTemplate } from '../entities/dmr-template.entity';
import { IncomingInspection } from '../entities/incoming-inspection.entity';
import { NonConformity } from '../entities/non-conformity.entity';
import { ProductionBatch } from '../entities/production-batch.entity';
import { Product } from '../entities/product.entity';
import { RecallCase } from '../entities/recall-case.entity';
import { RegulatoryLabel } from '../entities/regulatory-label.entity';
import { Shipment } from '../entities/shipment.entity';
import { TechnovigilanceCase } from '../entities/technovigilance-case.entity';
import { ProcessDeviation } from '../entities/process-deviation.entity';
import { OosCase } from '../entities/oos-case.entity';

type QualityAuditLogger = (payload: {
    entityType: string;
    entityId: string;
    action: string;
    actor?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
}) => Promise<unknown>;

export class QualityDhrService {
    private readonly em: EntityManager;
    private readonly dmrTemplateRepo: EntityRepository<DmrTemplate>;
    private readonly batchRepo: EntityRepository<ProductionBatch>;
    private readonly bomItemRepo: EntityRepository<BOMItem>;
    private readonly regulatoryLabelRepo: EntityRepository<RegulatoryLabel>;
    private readonly batchReleaseRepo: EntityRepository<BatchRelease>;
    private readonly shipmentRepo: EntityRepository<Shipment>;
    private readonly ncRepo: EntityRepository<NonConformity>;
    private readonly capaRepo: EntityRepository<CapaAction>;
    private readonly technoRepo: EntityRepository<TechnovigilanceCase>;
    private readonly recallRepo: EntityRepository<RecallCase>;
    private readonly processDeviationRepo: EntityRepository<ProcessDeviation>;
    private readonly oosRepo: EntityRepository<OosCase>;
    private readonly incomingInspectionRepo: EntityRepository<IncomingInspection>;

    constructor(em: EntityManager, private readonly logEvent: QualityAuditLogger) {
        this.em = em;
        this.dmrTemplateRepo = em.getRepository(DmrTemplate);
        this.batchRepo = em.getRepository(ProductionBatch);
        this.bomItemRepo = em.getRepository(BOMItem);
        this.regulatoryLabelRepo = em.getRepository(RegulatoryLabel);
        this.batchReleaseRepo = em.getRepository(BatchRelease);
        this.shipmentRepo = em.getRepository(Shipment);
        this.ncRepo = em.getRepository(NonConformity);
        this.capaRepo = em.getRepository(CapaAction);
        this.technoRepo = em.getRepository(TechnovigilanceCase);
        this.recallRepo = em.getRepository(RecallCase);
        this.processDeviationRepo = em.getRepository(ProcessDeviation);
        this.oosRepo = em.getRepository(OosCase);
        this.incomingInspectionRepo = em.getRepository(IncomingInspection);
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
        const row = this.dmrTemplateRepo.create({
            product: payload.productId ? this.em.getReference(Product, payload.productId) : undefined,
            process: payload.process,
            code: payload.code,
            title: payload.title,
            version: payload.version ?? 1,
            sections: payload.sections,
            requiredEvidence: payload.requiredEvidence ?? [],
            isActive: payload.isActive ?? true,
            createdBy: payload.createdBy,
            approvedBy: payload.approvedBy,
            approvedAt: payload.approvedAt,
        } as unknown as DmrTemplate);

        await this.em.persistAndFlush(row);
        await this.logEvent({
            entityType: 'dmr_template',
            entityId: row.id,
            action: 'created',
            actor: payload.createdBy,
            metadata: {
                productId: row.product?.id,
                process: row.process,
                version: row.version,
            },
        });
        return this.dmrTemplateRepo.findOneOrFail({ id: row.id }, { populate: ['product'] });
    }

    async listDmrTemplates(filters: {
        productId?: string;
        process?: DocumentProcess;
        isActive?: boolean;
    }) {
        const query: FilterQuery<DmrTemplate> = {};
        if (filters.productId) query.product = filters.productId;
        if (filters.process) query.process = filters.process;
        if (typeof filters.isActive === 'boolean') query.isActive = filters.isActive;
        return this.dmrTemplateRepo.find(query, {
            populate: ['product'],
            orderBy: { process: 'ASC', code: 'ASC', version: 'DESC' },
        });
    }

    async getBatchDhr(productionBatchId: string, actor?: string): Promise<BatchDhrExpedient> {
        const batch = await this.batchRepo.findOneOrFail(
            { id: productionBatchId },
            { populate: ['productionOrder', 'variant', 'variant.product', 'units'] }
        );
        const bomItems = await this.bomItemRepo.find(
            { variant: batch.variant.id },
            { populate: ['rawMaterial'] }
        );
        const labels = await this.regulatoryLabelRepo.find(
            { productionBatch: batch.id },
            { populate: ['productionBatch', 'productionBatchUnit'] }
        );
        const batchRelease = await this.batchReleaseRepo.findOne(
            { productionBatch: batch.id },
            { populate: ['productionBatch'] }
        );
        const shipmentsRows = await this.shipmentRepo.find(
            { items: { productionBatch: batch.id } },
            { populate: ['customer', 'items', 'items.productionBatch', 'items.productionBatchUnit'] }
        );
        const nonConformities = await this.ncRepo.find(
            { productionBatch: batch.id },
            { orderBy: { createdAt: 'DESC' } }
        );
        const capas = nonConformities.length > 0
            ? await this.capaRepo.find({ nonConformity: { $in: nonConformities.map((item) => item.id) } }, { populate: ['nonConformity'] })
            : [];
        const technovigilanceCases = await this.technoRepo.find(
            { $or: [{ productionBatch: batch.id }, { lotCode: batch.code }] },
            { orderBy: { createdAt: 'DESC' } }
        );
        const recallRows = await this.recallRepo.find(
            { lotCode: batch.code },
            { populate: ['notifications'], orderBy: { createdAt: 'DESC' } }
        );
        const processDeviations = await this.processDeviationRepo.find(
            { productionBatch: batch.id },
            { orderBy: { createdAt: 'DESC' } }
        );
        const oosCases = await this.oosRepo.find(
            { productionBatch: batch.id },
            { orderBy: { createdAt: 'DESC' } }
        );
        const incomingInspections = bomItems.length > 0
            ? await this.incomingInspectionRepo.find(
                {
                    rawMaterial: { $in: bomItems.map((item) => item.rawMaterial.id) },
                    status: IncomingInspectionStatus.LIBERADO,
                },
                { orderBy: { inspectedAt: 'DESC', createdAt: 'DESC' } }
            )
            : [];

        const templateRows = await this.dmrTemplateRepo.find(
            {
                process: DocumentProcess.PRODUCCION,
                isActive: true,
                $or: [
                    { product: batch.variant.product.id },
                    { product: null },
                ],
            },
            { populate: ['product'], orderBy: { version: 'DESC' }, limit: 1 }
        );
        const template = templateRows[0];

        const inspectionsByRawMaterial = new Map<string, IncomingInspection>();
        for (const inspection of incomingInspections) {
            const key = inspection.rawMaterial.id;
            if (!inspectionsByRawMaterial.has(key)) inspectionsByRawMaterial.set(key, inspection);
        }

        const materials = bomItems.map((item) => {
            const plannedQuantity = Number(item.quantity) * Number(batch.producedQty || batch.plannedQty || 0);
            const inspection = inspectionsByRawMaterial.get(item.rawMaterial.id);
            return {
                rawMaterialId: item.rawMaterial.id,
                rawMaterialName: item.rawMaterial.name,
                rawMaterialSku: item.rawMaterial.sku,
                plannedQuantity,
                latestInspection: inspection ? {
                    id: inspection.id,
                    status: inspection.status,
                    inspectionResult: inspection.inspectionResult,
                    inspectedBy: inspection.inspectedBy,
                    inspectedAt: inspection.inspectedAt,
                    certificateRef: inspection.certificateRef,
                } : undefined,
            };
        });

        const units = batch.units.getItems();
        const shipments = shipmentsRows.map((shipment) => ({
            id: shipment.id,
            customerId: shipment.customer.id,
            customer: {
                id: shipment.customer.id,
                name: shipment.customer.name,
                documentNumber: shipment.customer.documentNumber,
            },
            commercialDocument: shipment.commercialDocument,
            shippedAt: shipment.shippedAt,
            dispatchedBy: shipment.dispatchedBy,
            notes: shipment.notes,
            items: shipment.items.getItems().map((item) => ({
                id: item.id,
                shipmentId: shipment.id,
                productionBatchId: item.productionBatch.id,
                productionBatch: {
                    id: item.productionBatch.id,
                    code: item.productionBatch.code,
                },
                productionBatchUnitId: item.productionBatchUnit?.id,
                productionBatchUnit: item.productionBatchUnit ? {
                    id: item.productionBatchUnit.id,
                    serialCode: item.productionBatchUnit.serialCode,
                } : undefined,
                quantity: Number(item.quantity),
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
            })),
            createdAt: shipment.createdAt,
            updatedAt: shipment.updatedAt,
        }));

        const recalls = recallRows.map((row) => ({
            id: row.id,
            code: row.code,
            title: row.title,
            reason: row.reason,
            scopeType: row.scopeType,
            lotCode: row.lotCode,
            serialCode: row.serialCode,
            affectedQuantity: Number(row.affectedQuantity),
            retrievedQuantity: Number(row.retrievedQuantity),
            coveragePercent: Number(row.coveragePercent),
            status: row.status,
            isMock: row.isMock,
            targetResponseMinutes: row.targetResponseMinutes,
            actualResponseMinutes: row.actualResponseMinutes,
            startedAt: row.startedAt,
            endedAt: row.endedAt,
            closureEvidence: row.closureEvidence,
            createdBy: row.createdBy,
            notifications: row.notifications.getItems().map((notification) => ({
                id: notification.id,
                recallCaseId: row.id,
                recipientName: notification.recipientName,
                recipientContact: notification.recipientContact,
                channel: notification.channel,
                status: notification.status,
                sentAt: notification.sentAt,
                acknowledgedAt: notification.acknowledgedAt,
                evidenceNotes: notification.evidenceNotes,
                createdBy: notification.createdBy,
                createdAt: notification.createdAt,
                updatedAt: notification.updatedAt,
            })),
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        }));

        const expedition: BatchDhrExpedient = {
            generatedAt: new Date(),
            generatedBy: actor,
            productionBatch: {
                id: batch.id,
                code: batch.code,
                plannedQty: Number(batch.plannedQty),
                producedQty: Number(batch.producedQty),
                qcStatus: batch.qcStatus,
                packagingStatus: batch.packagingStatus,
                status: batch.status,
                productionOrder: batch.productionOrder ? {
                    id: batch.productionOrder.id,
                    code: batch.productionOrder.code,
                    status: batch.productionOrder.status,
                } : undefined,
                variant: batch.variant ? {
                    id: batch.variant.id,
                    name: batch.variant.name,
                    sku: batch.variant.sku,
                    product: batch.variant.product ? {
                        id: batch.variant.product.id,
                        name: batch.variant.product.name,
                        sku: batch.variant.product.sku,
                    } : undefined,
                } : undefined,
            },
            dmrTemplate: template ? {
                id: template.id,
                code: template.code,
                title: template.title,
                process: template.process,
                version: template.version,
                sections: template.sections,
                requiredEvidence: template.requiredEvidence,
            } : undefined,
            materials,
            productionAndQuality: {
                qcPassedUnits: units.filter((unit) => unit.qcPassed && !unit.rejected).length,
                qcFailedUnits: units.filter((unit) => !unit.qcPassed && !unit.rejected).length,
                packagedUnits: units.filter((unit) => unit.packaged && !unit.rejected).length,
                rejectedUnits: units.filter((unit) => unit.rejected).length,
                lastUpdatedAt: batch.updatedAt,
            },
            regulatoryLabels: labels,
            batchRelease: batchRelease || undefined,
            shipments,
            incidents: {
                nonConformities,
                capas,
                technovigilanceCases,
                recalls,
                processDeviations,
                oosCases,
            },
        };

        await this.logEvent({
            entityType: 'batch_dhr',
            entityId: batch.id,
            action: 'generated',
            actor,
            metadata: {
                batchCode: batch.code,
                hasDmrTemplate: Boolean(template),
                materials: materials.length,
                labels: labels.length,
                shipments: shipments.length,
            },
        });

        return expedition;
    }

    async exportBatchDhr(productionBatchId: string, format: 'csv' | 'json', actor?: string): Promise<BatchDhrExportFile> {
        const data = await this.getBatchDhr(productionBatchId, actor);
        const generatedAt = new Date();
        const safeCode = data.productionBatch.code.replace(/[^a-zA-Z0-9_-]/g, '_');

        if (format === 'json') {
            return {
                generatedAt,
                format,
                fileName: `dhr_lote_${safeCode}_${generatedAt.toISOString()}.json`,
                content: JSON.stringify(data, null, 2),
            };
        }

        const toCsvRow = (values: Array<string | number | undefined>) => values
            .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
            .join(',');

        const lines: string[] = [];
        lines.push('section,key,value');
        lines.push(toCsvRow(['batch', 'code', data.productionBatch.code]));
        lines.push(toCsvRow(['batch', 'plannedQty', data.productionBatch.plannedQty]));
        lines.push(toCsvRow(['batch', 'producedQty', data.productionBatch.producedQty]));
        lines.push(toCsvRow(['batch', 'qcStatus', data.productionBatch.qcStatus]));
        lines.push(toCsvRow(['batch', 'packagingStatus', data.productionBatch.packagingStatus]));
        lines.push(toCsvRow(['batch', 'status', data.productionBatch.status]));
        lines.push(toCsvRow(['batch', 'generatedAt', new Date(data.generatedAt).toISOString()]));
        lines.push(toCsvRow(['batch', 'generatedBy', data.generatedBy || '']));
        lines.push(toCsvRow(['batch', 'product', data.productionBatch.variant?.product?.name]));
        lines.push(toCsvRow(['batch', 'variant', data.productionBatch.variant?.name]));
        lines.push(toCsvRow(['dmr', 'code', data.dmrTemplate?.code || '']));
        lines.push(toCsvRow(['dmr', 'title', data.dmrTemplate?.title || '']));
        lines.push(toCsvRow(['dmr', 'version', data.dmrTemplate?.version || '']));
        lines.push(toCsvRow(['dmr', 'sections', data.dmrTemplate?.sections.join(' | ') || '']));
        lines.push(toCsvRow(['dmr', 'requiredEvidence', data.dmrTemplate?.requiredEvidence.join(' | ') || '']));
        lines.push(toCsvRow(['quality', 'qcPassedUnits', data.productionAndQuality.qcPassedUnits]));
        lines.push(toCsvRow(['quality', 'qcFailedUnits', data.productionAndQuality.qcFailedUnits]));
        lines.push(toCsvRow(['quality', 'packagedUnits', data.productionAndQuality.packagedUnits]));
        lines.push(toCsvRow(['quality', 'rejectedUnits', data.productionAndQuality.rejectedUnits]));
        lines.push(toCsvRow(['quality', 'lastUpdatedAt', new Date(data.productionAndQuality.lastUpdatedAt).toISOString()]));
        lines.push(toCsvRow(['counts', 'materials', data.materials.length]));
        lines.push(toCsvRow(['counts', 'labels', data.regulatoryLabels.length]));
        lines.push(toCsvRow(['counts', 'shipments', data.shipments.length]));
        lines.push(toCsvRow(['counts', 'nonConformities', data.incidents.nonConformities.length]));
        lines.push(toCsvRow(['counts', 'capas', data.incidents.capas.length]));
        lines.push(toCsvRow(['counts', 'technovigilanceCases', data.incidents.technovigilanceCases.length]));
        lines.push(toCsvRow(['counts', 'recalls', data.incidents.recalls.length]));
        lines.push(toCsvRow(['counts', 'processDeviations', data.incidents.processDeviations.length]));
        lines.push(toCsvRow(['counts', 'oosCases', data.incidents.oosCases.length]));

        return {
            generatedAt,
            format,
            fileName: `dhr_lote_${safeCode}_${generatedAt.toISOString()}.csv`,
            content: lines.join('\n'),
        };
    }
}
