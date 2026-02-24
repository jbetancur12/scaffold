import { EntityManager, FilterQuery } from '@mikro-orm/core';
import { PurchaseRequisitionStatus } from '@scaffold/types';
import { AppError } from '../../../shared/utils/response';
import { PurchaseRequisition } from '../entities/purchase-requisition.entity';
import { PurchaseRequisitionItem } from '../entities/purchase-requisition-item.entity';
import { RawMaterial } from '../entities/raw-material.entity';
import { Supplier } from '../entities/supplier.entity';

export class PurchaseRequisitionService {
    constructor(private readonly em: EntityManager) {}

    async create(data: {
        requestedBy: string;
        productionOrderId?: string;
        neededBy?: Date;
        notes?: string;
        items: Array<{
            rawMaterialId: string;
            quantity: number;
            suggestedSupplierId?: string;
            notes?: string;
        }>;
    }) {
        const requisition = this.em.create(PurchaseRequisition, {
            requestedBy: data.requestedBy.trim(),
            productionOrderId: data.productionOrderId,
            neededBy: data.neededBy,
            notes: data.notes,
            status: PurchaseRequisitionStatus.PENDIENTE,
        } as unknown as PurchaseRequisition);

        for (const itemData of data.items) {
            const rawMaterial = await this.em.findOneOrFail(RawMaterial, { id: itemData.rawMaterialId });
            const suggestedSupplier = itemData.suggestedSupplierId
                ? await this.em.findOne(Supplier, { id: itemData.suggestedSupplierId })
                : (rawMaterial.supplier
                    ? await this.em.findOne(Supplier, { id: rawMaterial.supplier.id })
                    : undefined);
            const item = this.em.create(PurchaseRequisitionItem, {
                requisition,
                rawMaterial,
                quantity: itemData.quantity,
                suggestedSupplier: suggestedSupplier || undefined,
                notes: itemData.notes,
            } as unknown as PurchaseRequisitionItem);
            requisition.items.add(item);
        }

        await this.em.persistAndFlush(requisition);
        return this.getById(requisition.id);
    }

    async list(page = 1, limit = 20, filters?: { status?: PurchaseRequisitionStatus; productionOrderId?: string }) {
        const where: FilterQuery<PurchaseRequisition> = {};
        if (filters?.status) where.status = filters.status;
        if (filters?.productionOrderId) where.productionOrderId = filters.productionOrderId;

        const [data, total] = await this.em.findAndCount(PurchaseRequisition, where, {
            populate: ['items', 'items.rawMaterial', 'items.suggestedSupplier'],
            orderBy: { createdAt: 'DESC' },
            limit,
            offset: (page - 1) * limit,
        });

        return { data, total, page, limit };
    }

    async getById(id: string) {
        return this.em.findOne(PurchaseRequisition, { id }, {
            populate: ['items', 'items.rawMaterial', 'items.suggestedSupplier'],
        });
    }

    async updateStatus(id: string, status: PurchaseRequisitionStatus) {
        const row = await this.em.findOneOrFail(PurchaseRequisition, { id });
        if (row.status === PurchaseRequisitionStatus.CONVERTIDA && status !== PurchaseRequisitionStatus.CONVERTIDA) {
            throw new AppError('No puedes reabrir una requisición convertida', 409);
        }
        row.status = status;
        await this.em.persistAndFlush(row);
        return this.getById(id);
    }

    async markConverted(id: string, purchaseOrderId: string) {
        const row = await this.em.findOneOrFail(PurchaseRequisition, { id });
        row.status = PurchaseRequisitionStatus.CONVERTIDA;
        row.convertedPurchaseOrderId = purchaseOrderId;
        await this.em.persistAndFlush(row);
        return this.getById(id);
    }
}
