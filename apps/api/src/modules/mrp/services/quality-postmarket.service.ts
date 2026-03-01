import { EntityManager, EntityRepository, FilterQuery } from '@mikro-orm/core';
import {
    BatchReleaseStatus,
    DispatchValidationResult,
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
import { Customer } from '../entities/customer.entity';
import { ProductionBatch } from '../entities/production-batch.entity';
import { ProductionBatchUnit } from '../entities/production-batch-unit.entity';
import { ProductionOrder } from '../entities/production-order.entity';
import { RecallCase } from '../entities/recall-case.entity';
import { RecallNotification } from '../entities/recall-notification.entity';
import { Shipment } from '../entities/shipment.entity';
import { ShipmentItem } from '../entities/shipment-item.entity';
import { BatchRelease } from '../entities/batch-release.entity';
import { TechnovigilanceCase } from '../entities/technovigilance-case.entity';

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

export class QualityPostmarketService {
    private readonly em: EntityManager;
    private readonly technoRepo: EntityRepository<TechnovigilanceCase>;
    private readonly recallRepo: EntityRepository<RecallCase>;
    private readonly recallNotificationRepo: EntityRepository<RecallNotification>;
    private readonly customerRepo: EntityRepository<Customer>;
    private readonly shipmentRepo: EntityRepository<Shipment>;
    private readonly shipmentItemRepo: EntityRepository<ShipmentItem>;
    private readonly batchReleaseRepo: EntityRepository<BatchRelease>;
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
        this.technoRepo = em.getRepository(TechnovigilanceCase);
        this.recallRepo = em.getRepository(RecallCase);
        this.recallNotificationRepo = em.getRepository(RecallNotification);
        this.customerRepo = em.getRepository(Customer);
        this.shipmentRepo = em.getRepository(Shipment);
        this.shipmentItemRepo = em.getRepository(ShipmentItem);
        this.batchReleaseRepo = em.getRepository(BatchRelease);
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
            throw new AppError('El recall ya esta cerrado', 409);
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
        const row = this.customerRepo.create({
            ...payload,
            email: payload.email || undefined,
        } as unknown as Customer);
        await this.em.persistAndFlush(row);
        await this.logEvent({
            entityType: 'customer',
            entityId: row.id,
            action: 'created',
            actor,
            metadata: { name: row.name, documentNumber: row.documentNumber },
        });
        return row;
    }

    async listCustomers(filters: { search?: string }) {
        const query: FilterQuery<Customer> = {};
        if (filters.search) {
            query.$or = [
                { name: { $ilike: `%${filters.search}%` } },
                { documentNumber: { $ilike: `%${filters.search}%` } },
            ];
        }
        return this.customerRepo.find(query, { orderBy: { name: 'ASC' } });
    }

    async getCustomer(id: string) {
        return this.customerRepo.findOneOrFail({ id });
    }

    async updateCustomer(id: string, payload: Partial<{
        name: string;
        documentType: string;
        documentNumber: string;
        contactName: string;
        email: string;
        phone: string;
        address: string;
        notes: string;
    }>, actor?: string) {
        const customer = await this.customerRepo.findOneOrFail({ id });
        this.customerRepo.assign(customer, payload);

        await this.em.persistAndFlush(customer);
        await this.logEvent({
            entityType: 'customer',
            entityId: customer.id,
            action: 'updated',
            actor,
            metadata: payload as Record<string, unknown>,
        });
        return customer;
    }

    async deleteCustomer(id: string, actor?: string) {
        const customer = await this.customerRepo.findOneOrFail({ id });

        // We shouldn't delete customers with active shipments or sales orders,
        // but for now we'll allow soft deletion or just try-catch EM removal
        await this.em.removeAndFlush(customer);

        await this.logEvent({
            entityType: 'customer',
            entityId: id,
            action: 'deleted',
            actor,
        });

        return { success: true };
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
        const customer = await this.customerRepo.findOneOrFail({ id: payload.customerId });
        const shipment = this.shipmentRepo.create({
            customer,
            commercialDocument: payload.commercialDocument,
            shippedAt: payload.shippedAt ?? new Date(),
            dispatchedBy: payload.dispatchedBy,
            notes: payload.notes,
        } as unknown as Shipment);

        for (const item of payload.items) {
            const batch = await this.em.findOneOrFail(ProductionBatch, { id: item.productionBatchId }, { populate: ['units'] });
            const release = await this.batchReleaseRepo.findOne({ productionBatch: batch.id });
            if (!release || release.status !== BatchReleaseStatus.LIBERADO_QA) {
                throw new AppError(`No puedes despachar: el lote ${batch.code} no esta liberado por QA`, 400);
            }
            const dispatchValidation = await this.validateDispatchReadiness(batch.id, actor);
            if (!dispatchValidation.eligible) {
                throw new AppError(`No puedes despachar lote ${batch.code}: ${dispatchValidation.errors.join(' | ')}`, 400);
            }
            const blockingIssues = await this.getBatchBlockingIssues(batch.id);
            if (blockingIssues.length > 0) {
                throw new AppError(`No puedes despachar lote ${batch.code}: ${blockingIssues.join(' | ')}`, 400);
            }

            let batchUnit: ProductionBatchUnit | undefined;
            if (item.productionBatchUnitId) {
                batchUnit = await this.em.findOneOrFail(ProductionBatchUnit, { id: item.productionBatchUnitId }, { populate: ['batch'] });
                if (batchUnit.batch.id !== batch.id) {
                    throw new AppError('La unidad serial no pertenece al lote indicado', 400);
                }
                const alreadyDispatched = await this.shipmentItemRepo.count({ productionBatchUnit: batchUnit.id });
                if (alreadyDispatched > 0) {
                    throw new AppError(`La unidad serial ${batchUnit.serialCode} ya fue despachada`, 409);
                }
            }

            const shipmentItem = this.shipmentItemRepo.create({
                shipment,
                productionBatch: batch,
                productionBatchUnit: batchUnit,
                quantity: item.quantity,
            } as unknown as ShipmentItem);
            shipment.items.add(shipmentItem);
        }

        await this.em.persistAndFlush(shipment);
        await this.logEvent({
            entityType: 'shipment',
            entityId: shipment.id,
            action: 'created',
            actor: actor || payload.dispatchedBy,
            metadata: {
                customerId: customer.id,
                commercialDocument: shipment.commercialDocument,
                items: payload.items.length,
            },
        });

        return this.shipmentRepo.findOneOrFail(
            { id: shipment.id },
            { populate: ['customer', 'items', 'items.productionBatch', 'items.productionBatchUnit'] }
        );
    }

    async listShipments(filters: {
        customerId?: string;
        productionBatchId?: string;
        serialCode?: string;
        commercialDocument?: string;
    }) {
        const query: FilterQuery<Shipment> = {};
        if (filters.customerId) query.customer = filters.customerId;
        if (filters.commercialDocument) query.commercialDocument = { $ilike: `%${filters.commercialDocument}%` };
        if (filters.productionBatchId && filters.serialCode) {
            query.items = {
                productionBatch: filters.productionBatchId,
                productionBatchUnit: { serialCode: { $ilike: `%${filters.serialCode}%` } },
            };
        } else if (filters.productionBatchId) {
            query.items = { productionBatch: filters.productionBatchId };
        } else if (filters.serialCode) {
            query.items = { productionBatchUnit: { serialCode: { $ilike: `%${filters.serialCode}%` } } };
        }

        return this.shipmentRepo.find(query, {
            populate: ['customer', 'items', 'items.productionBatch', 'items.productionBatchUnit'],
            orderBy: { shippedAt: 'DESC' },
        });
    }

    async listRecallAffectedCustomers(recallCaseId: string) {
        const recallCase = await this.recallRepo.findOneOrFail({ id: recallCaseId });
        const shipments = await this.shipmentRepo.find(
            {},
            { populate: ['customer', 'items', 'items.productionBatch', 'items.productionBatchUnit'] }
        );

        const filtered = shipments.filter((shipment) =>
            shipment.items.getItems().some((item) => {
                if (recallCase.scopeType === RecallScopeType.LOTE) {
                    return Boolean(recallCase.lotCode) && item.productionBatch.code === recallCase.lotCode;
                }
                if (recallCase.scopeType === RecallScopeType.SERIAL) {
                    return Boolean(recallCase.serialCode) && item.productionBatchUnit?.serialCode === recallCase.serialCode;
                }
                return false;
            })
        );

        const grouped = new Map<string, {
            customerId: string;
            customerName: string;
            customerContact?: string;
            shipments: Array<{ shipmentId: string; commercialDocument: string; shippedAt: Date }>;
        }>();

        for (const shipment of filtered) {
            const key = shipment.customer.id;
            if (!grouped.has(key)) {
                grouped.set(key, {
                    customerId: shipment.customer.id,
                    customerName: shipment.customer.name,
                    customerContact: shipment.customer.email || shipment.customer.phone,
                    shipments: [],
                });
            }
            grouped.get(key)!.shipments.push({
                shipmentId: shipment.id,
                commercialDocument: shipment.commercialDocument,
                shippedAt: shipment.shippedAt,
            });
        }

        return Array.from(grouped.values());
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
}
