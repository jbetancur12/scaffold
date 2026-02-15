import { EntityManager, EntityRepository } from '@mikro-orm/core';
import {
    ProductionBatchPackagingStatus,
    ProductionBatchQcStatus,
    ProductionBatchStatus,
    ProductionOrderStatus,
    WarehouseType,
} from '@scaffold/types';
import { ProductionOrder } from '../entities/production-order.entity';
import { Warehouse } from '../entities/warehouse.entity';
import { ProductionOrderItem } from '../entities/production-order-item.entity';
import { ProductVariant } from '../entities/product-variant.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { RawMaterial } from '../entities/raw-material.entity';
import { SupplierMaterial } from '../entities/supplier-material.entity';
import { Supplier } from '../entities/supplier.entity';
import { ProductionBatch } from '../entities/production-batch.entity';
import { ProductionBatchUnit } from '../entities/production-batch-unit.entity';
import { ProductionOrderSchema, ProductionOrderItemCreateSchema } from '@scaffold/schemas';
import { z } from 'zod';
import { AppError } from '../../../shared/utils/response';

export class ProductionService {
    private readonly em: EntityManager;
    private readonly productionOrderRepo: EntityRepository<ProductionOrder>;
    private readonly inventoryRepo: EntityRepository<InventoryItem>;
    private readonly batchRepo: EntityRepository<ProductionBatch>;
    private readonly batchUnitRepo: EntityRepository<ProductionBatchUnit>;

    constructor(em: EntityManager) {
        this.em = em;
        this.productionOrderRepo = em.getRepository(ProductionOrder);
        this.inventoryRepo = em.getRepository(InventoryItem);
        this.batchRepo = em.getRepository(ProductionBatch);
        this.batchUnitRepo = em.getRepository(ProductionBatchUnit);
    }

    async createOrder(data: z.infer<typeof ProductionOrderSchema>, itemsData: z.infer<typeof ProductionOrderItemCreateSchema>[]): Promise<ProductionOrder> {
        // Ensure dates are properly instantiated as Date objects and handle potential string inputs
        const orderData = { ...data };

        if (orderData.startDate && typeof orderData.startDate === 'string') {
            const date = new Date(orderData.startDate);
            // Validate date
            if (!isNaN(date.getTime())) {
                orderData.startDate = date;
            } else {
                // Should throw or handle error, but let's try to default or leave as is (which will fail later)
                // Actually throwing a specific error is better
                throw new AppError(`Fecha de inicio inválida: ${orderData.startDate}`, 400);
            }
        }

        if (orderData.endDate && typeof orderData.endDate === 'string') {
            const date = new Date(orderData.endDate);
            if (!isNaN(date.getTime())) {
                orderData.endDate = date;
            } else {
                throw new AppError(`Fecha de fin inválida: ${orderData.endDate}`, 400);
            }
        }

        const order = this.productionOrderRepo.create(orderData as unknown as ProductionOrder);

        for (const itemData of itemsData) {
            const item = new ProductionOrderItem();
            item.variant = this.em.getReference(ProductVariant, itemData.variantId);
            item.quantity = itemData.quantity;
            order.items.add(item);
        }

        await this.em.persistAndFlush(order);
        return order;
    }

    async listOrders(page: number = 1, limit: number = 10): Promise<{ orders: ProductionOrder[], total: number }> {
        const [orders, total] = await this.productionOrderRepo.findAndCount(
            {},
            {
                populate: ['items', 'items.variant', 'items.variant.product'],
                limit,
                offset: (page - 1) * limit,
                orderBy: { createdAt: 'DESC' }
            }
        );
        return { orders, total };
    }

    async getOrder(id: string): Promise<ProductionOrder> {
        return await this.productionOrderRepo.findOneOrFail(
            { id },
            {
                populate: [
                    'items',
                    'items.variant',
                    'items.variant.product',
                    'items.variant.bomItems',
                    'items.variant.bomItems.rawMaterial',
                    'batches',
                    'batches.variant',
                    'batches.units',
                ],
            }
        );
    }

    async createBatch(orderId: string, payload: { variantId: string; plannedQty: number; code?: string; notes?: string }) {
        const order = await this.productionOrderRepo.findOneOrFail(
            { id: orderId },
            { populate: ['items', 'items.variant'] }
        );

        if (order.status === ProductionOrderStatus.COMPLETED || order.status === ProductionOrderStatus.CANCELLED) {
            throw new AppError('No puedes crear lotes en una orden cerrada', 400);
        }

        const hasVariantInOrder = order.items.getItems().some((i) => i.variant.id === payload.variantId);
        if (!hasVariantInOrder) {
            throw new AppError('La variante no pertenece a la orden', 400);
        }

        const code = payload.code || `LOT-${Date.now().toString(36).toUpperCase()}`;
        const exists = await this.batchRepo.findOne({ code });
        if (exists) {
            throw new AppError('El código de lote ya existe', 409);
        }

        const batch = this.batchRepo.create({
            productionOrder: order,
            variant: this.em.getReference(ProductVariant, payload.variantId),
            code,
            plannedQty: payload.plannedQty,
            producedQty: payload.plannedQty,
            notes: payload.notes,
            qcStatus: ProductionBatchQcStatus.PENDING,
            packagingStatus: ProductionBatchPackagingStatus.PENDING,
            status: ProductionBatchStatus.IN_PROGRESS,
        } as unknown as ProductionBatch);

        await this.em.persistAndFlush(batch);
        return this.batchRepo.findOneOrFail(
            { id: batch.id },
            { populate: ['variant', 'variant.product', 'units'] }
        );
    }

    async listBatches(orderId: string) {
        return this.batchRepo.find(
            { productionOrder: orderId },
            { populate: ['variant', 'variant.product', 'units'], orderBy: { createdAt: 'DESC' } }
        );
    }

    async addBatchUnits(batchId: string, quantity: number) {
        const batch = await this.batchRepo.findOneOrFail({ id: batchId }, { populate: ['units'] });
        if (quantity <= 0) {
            throw new AppError('La cantidad debe ser mayor a 0', 400);
        }

        const currentCount = batch.units.length;
        for (let i = 1; i <= quantity; i += 1) {
            const serialCode = `${batch.code}-U${String(currentCount + i).padStart(4, '0')}`;
            const unit = this.batchUnitRepo.create({
                batch,
                serialCode,
                qcPassed: false,
                packaged: false,
                rejected: false,
            } as unknown as ProductionBatchUnit);
            batch.units.add(unit);
        }

        batch.producedQty = Math.max(batch.producedQty, batch.units.length);
        await this.em.persistAndFlush(batch);
        return this.batchRepo.findOneOrFail({ id: batchId }, { populate: ['variant', 'units'] });
    }

    async setBatchQc(batchId: string, passed: boolean) {
        const batch = await this.batchRepo.findOneOrFail({ id: batchId }, { populate: ['units'] });
        batch.qcStatus = passed ? ProductionBatchQcStatus.PASSED : ProductionBatchQcStatus.FAILED;
        batch.status = passed ? ProductionBatchStatus.QC_PASSED : ProductionBatchStatus.QC_PENDING;
        await this.em.persistAndFlush(batch);
        return batch;
    }

    async setBatchPackaging(batchId: string, packed: boolean) {
        const batch = await this.batchRepo.findOneOrFail({ id: batchId }, { populate: ['units'] });
        if (batch.qcStatus !== ProductionBatchQcStatus.PASSED) {
            throw new AppError('Debes aprobar QC antes de empacar', 400);
        }

        if (packed && batch.units.length > 0) {
            const allPacked = batch.units.getItems().every((u) => u.rejected || (u.qcPassed && u.packaged));
            if (!allPacked) {
                throw new AppError('Todas las unidades deben estar aprobadas y empacadas', 400);
            }
        }

        batch.packagingStatus = packed ? ProductionBatchPackagingStatus.PACKED : ProductionBatchPackagingStatus.PENDING;
        batch.status = packed ? ProductionBatchStatus.READY : ProductionBatchStatus.PACKING;
        await this.em.persistAndFlush(batch);
        return batch;
    }

    async setBatchUnitQc(unitId: string, passed: boolean) {
        const unit = await this.batchUnitRepo.findOneOrFail({ id: unitId }, { populate: ['batch'] });
        unit.qcPassed = passed;
        if (!passed) {
            unit.packaged = false;
        }
        await this.em.persistAndFlush(unit);
        return unit;
    }

    async setBatchUnitPackaging(unitId: string, packaged: boolean) {
        const unit = await this.batchUnitRepo.findOneOrFail({ id: unitId }, { populate: ['batch'] });
        if (!unit.qcPassed && !unit.rejected) {
            throw new AppError('La unidad debe pasar QC antes de empacar', 400);
        }
        unit.packaged = packaged;
        await this.em.persistAndFlush(unit);
        return unit;
    }


    async calculateMaterialRequirements(orderId: string): Promise<{
        material: RawMaterial,
        required: number,
        available: number,
        potentialSuppliers: { supplier: Supplier, lastPrice: number, lastDate: Date, isCheapest: boolean }[]
    }[]> {
        const order = await this.productionOrderRepo.findOneOrFail({ id: orderId }, { populate: ['items', 'items.variant', 'items.variant.bomItems', 'items.variant.bomItems.rawMaterial'] });

        const requirements = new Map<string, {
            material: RawMaterial,
            required: number,
            available: number,
            potentialSuppliers: { supplier: Supplier, lastPrice: number, lastDate: Date, isCheapest: boolean }[]
        }>();

        // 1. Calculate Required
        for (const item of order.items) {
            const variant = item.variant;
            const productionQty = item.quantity;

            for (const bomItem of variant.bomItems) {
                const rawMaterialId = bomItem.rawMaterial.id;
                const requiredQty = bomItem.quantity * productionQty;

                if (requirements.has(rawMaterialId)) {
                    requirements.get(rawMaterialId)!.required += requiredQty;
                } else {
                    requirements.set(rawMaterialId, {
                        material: bomItem.rawMaterial,
                        required: requiredQty,
                        available: 0, // Will populate next
                        potentialSuppliers: [] // Will populate next
                    });
                }
            }
        }

        // 2. Check Available Stock
        const materialIds = Array.from(requirements.keys());
        if (materialIds.length > 0) {
            const inventoryItems = await this.inventoryRepo.find({ rawMaterial: { $in: materialIds } });

            for (const invItem of inventoryItems) {
                if (invItem.rawMaterial && requirements.has(invItem.rawMaterial.id)) {
                    requirements.get(invItem.rawMaterial.id)!.available += Number(invItem.quantity);
                }
            }

            // 3. Check Potential Suppliers (SupplierMaterial)
            const supplierMaterials = await this.em.find(SupplierMaterial, { rawMaterial: { $in: materialIds } }, { populate: ['supplier'], orderBy: { lastPurchasePrice: 'ASC', lastPurchaseDate: 'DESC' } });

            for (const sm of supplierMaterials) {
                if (requirements.has(sm.rawMaterial.id)) {
                    const req = requirements.get(sm.rawMaterial.id)!;

                    // Check if this is the cheapest (since list is sorted by ASC price, first one per material is cheapest)
                    // But we might have multiple suppliers for same material.
                    // We can mark the first encountered as cheapest or handle logic in frontend.
                    // Since it's sorted by price ASC, the first one added to the array will be the cheapest.

                    // Actually, if we just push all, the frontend can highlight. 
                    // Let's rely on the sort from DB: cheapest checks across all supplier records.

                    req.potentialSuppliers.push({
                        supplier: sm.supplier,
                        lastPrice: Number(sm.lastPurchasePrice),
                        lastDate: sm.lastPurchaseDate,
                        isCheapest: false // Will calculate after population
                    });
                }
            }

            // Post-process to mark cheapest
            for (const req of requirements.values()) {
                if (req.potentialSuppliers.length > 0) {
                    // Sort again just to be sure
                    req.potentialSuppliers.sort((a, b) => a.lastPrice - b.lastPrice);
                    req.potentialSuppliers[0].isCheapest = true;
                }
            }
        }

        return Array.from(requirements.values());
    }

    async updateStatus(id: string, status: ProductionOrderStatus, warehouseId?: string): Promise<ProductionOrder> {
        return this.em.transactional(async (tx) => {
            const productionOrderRepo = tx.getRepository(ProductionOrder);
            const inventoryRepo = tx.getRepository(InventoryItem);
            const warehouseRepo = tx.getRepository(Warehouse);
            const order = await productionOrderRepo.findOneOrFail({ id }, { populate: ['items', 'items.variant', 'batches', 'batches.units'] });

            // Basic transition validation
            if (order.status === ProductionOrderStatus.COMPLETED || order.status === ProductionOrderStatus.CANCELLED) {
                throw new AppError(`No se puede cambiar el estado de una orden que ya está ${order.status}`, 400);
            }

            order.status = status;

            // If status is changed to COMPLETED, update finished goods inventory
            if (status === ProductionOrderStatus.COMPLETED) {
                const batches = order.batches.getItems();
                const itemVariantIds = order.items.getItems().map((i) => i.variant.id);
                const variantQuantities = new Map<string, number>();

                for (const variantId of itemVariantIds) {
                    const related = batches.filter((b) => b.variant.id === variantId);
                    if (related.length === 0) {
                        throw new AppError('Debes registrar lotes para todas las variantes antes de completar', 400);
                    }

                    let totalCompleted = 0;
                    for (const batch of related) {
                        if (batch.qcStatus !== ProductionBatchQcStatus.PASSED || batch.packagingStatus !== ProductionBatchPackagingStatus.PACKED) {
                            throw new AppError(`El lote ${batch.code} no está listo (QC + Empaque)`, 400);
                        }

                        const units = batch.units.getItems();
                        if (units.length > 0) {
                            const allGood = units.every((u) => u.rejected || (u.qcPassed && u.packaged));
                            if (!allGood) {
                                throw new AppError(`El lote ${batch.code} tiene unidades sin liberar`, 400);
                            }
                            totalCompleted += units.filter((u) => !u.rejected && u.packaged).length;
                        } else {
                            totalCompleted += batch.producedQty > 0 ? batch.producedQty : batch.plannedQty;
                        }
                    }
                    variantQuantities.set(variantId, totalCompleted);
                }

                // Get or create warehouse for finished goods
                let warehouse: Warehouse | null = null;
                if (warehouseId) {
                    warehouse = await warehouseRepo.findOne({ id: warehouseId });
                }

                if (!warehouse) {
                    warehouse = await warehouseRepo.findOne({ name: 'Main Warehouse' });
                }

                if (!warehouse) {
                    warehouse = warehouseRepo.create({
                        name: 'Main Warehouse',
                        location: 'Default',
                        type: WarehouseType.FINISHED_GOODS
                    } as Warehouse);
                    tx.persist(warehouse);
                }

                for (const item of order.items) {
                    const completedQty = variantQuantities.get(item.variant.id) ?? item.quantity;
                    let inventoryItem = await inventoryRepo.findOne({
                        variant: item.variant,
                        warehouse
                    });

                    if (inventoryItem) {
                        inventoryItem.quantity = Number(inventoryItem.quantity) + Number(completedQty);
                    } else {
                        inventoryItem = inventoryRepo.create({
                            variant: item.variant,
                            warehouse,
                            quantity: completedQty,
                            lastUpdated: new Date()
                        } as InventoryItem);
                    }
                    tx.persist(inventoryItem);
                }
            }

            await tx.flush();
            return order;
        });
    }
}
