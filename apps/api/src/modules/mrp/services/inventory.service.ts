import { EntityManager, EntityRepository, FilterQuery } from '@mikro-orm/core';
import { InventoryItem } from '../entities/inventory-item.entity';
import { Warehouse } from '../entities/warehouse.entity';
import { RawMaterial } from '../entities/raw-material.entity';
import { RawMaterialLot } from '../entities/raw-material-lot.entity';
import { RawMaterialKardex } from '../entities/raw-material-kardex.entity';
import { FinishedGoodsLotInventory } from '../entities/finished-goods-lot-inventory.entity';
import { QualityAuditEvent } from '../entities/quality-audit-event.entity';
import { WarehouseSchema, InventoryItemSchema } from '@scaffold/schemas';
import { WarehouseType } from '@scaffold/types';
import { z } from 'zod';
import { ProductVariant } from '../entities/product-variant.entity';

export class InventoryService {
    private readonly em: EntityManager;
    private readonly inventoryRepo: EntityRepository<InventoryItem>;
    private readonly warehouseRepo: EntityRepository<Warehouse>;
    private readonly rawMaterialLotRepo: EntityRepository<RawMaterialLot>;
    private readonly rawMaterialKardexRepo: EntityRepository<RawMaterialKardex>;
    private readonly rawMaterialRepo: EntityRepository<RawMaterial>;
    private readonly variantRepo: EntityRepository<ProductVariant>;
    private readonly auditRepo: EntityRepository<QualityAuditEvent>;

    constructor(em: EntityManager) {
        this.em = em;
        this.inventoryRepo = em.getRepository(InventoryItem);
        this.warehouseRepo = em.getRepository(Warehouse);
        this.rawMaterialLotRepo = em.getRepository(RawMaterialLot);
        this.rawMaterialKardexRepo = em.getRepository(RawMaterialKardex);
        this.rawMaterialRepo = em.getRepository(RawMaterial);
        this.variantRepo = em.getRepository(ProductVariant);
        this.auditRepo = em.getRepository(QualityAuditEvent);
    }

    private async logAudit(entityType: string, entityId: string, action: string, metadata?: Record<string, unknown>, actor?: string) {
        const event = this.auditRepo.create({
            entityType,
            entityId,
            action,
            actor,
            metadata,
        } as unknown as QualityAuditEvent);
        await this.em.persistAndFlush(event);
    }


    async createWarehouse(data: z.infer<typeof WarehouseSchema>, actor?: string): Promise<Warehouse> {
        const warehouse = this.warehouseRepo.create(data as unknown as Warehouse);
        await this.em.persistAndFlush(warehouse);
        await this.logAudit('warehouse', warehouse.id, 'created', {
            name: warehouse.name,
            type: warehouse.type,
            location: warehouse.location,
        }, actor);
        return warehouse;
    }

    async listWarehouses(): Promise<Warehouse[]> {
        return this.warehouseRepo.findAll();
    }

    async getWarehouse(id: string): Promise<Warehouse> {
        return this.warehouseRepo.findOneOrFail({ id });
    }

    async updateWarehouse(id: string, data: Partial<z.infer<typeof WarehouseSchema>>, actor?: string): Promise<Warehouse> {
        const warehouse = await this.getWarehouse(id);
        const before = { name: warehouse.name, type: warehouse.type, location: warehouse.location };
        Object.assign(warehouse, data);
        await this.em.persistAndFlush(warehouse);
        const after = { name: warehouse.name, type: warehouse.type, location: warehouse.location };
        await this.logAudit('warehouse', warehouse.id, 'updated', { before, after }, actor);
        return warehouse;
    }

    async deleteWarehouse(id: string, actor?: string): Promise<void> {
        const warehouse = await this.getWarehouse(id);
        await this.em.removeAndFlush(warehouse);
        await this.logAudit('warehouse', id, 'deleted', {
            name: warehouse.name,
            type: warehouse.type,
            location: warehouse.location,
        }, actor);
    }

    async updateStock(data: z.infer<typeof InventoryItemSchema>, actor?: string): Promise<InventoryItem> {
        // Build query based on whether it's raw material or variant
        const query: FilterQuery<InventoryItem> = { warehouse: data.warehouseId };
        if (data.rawMaterialId) query.rawMaterial = data.rawMaterialId;
        if (data.rawMaterialSpecificationId) query.rawMaterialSpecification = data.rawMaterialSpecificationId;
        if (data.variantId) query.variant = data.variantId;

        let inventoryItem = await this.inventoryRepo.findOne(query);
        const previousQuantity = inventoryItem ? Number(inventoryItem.quantity || 0) : undefined;

        if (inventoryItem) {
            inventoryItem.quantity = data.quantity; // Or logic to increment/decrement
        } else {
            inventoryItem = this.inventoryRepo.create(data as unknown as InventoryItem);
        }

        await this.em.persistAndFlush(inventoryItem);
        const [warehouse, rawMaterial, variant] = await Promise.all([
            data.warehouseId ? this.warehouseRepo.findOne({ id: data.warehouseId }) : Promise.resolve(null),
            data.rawMaterialId ? this.rawMaterialRepo.findOne({ id: data.rawMaterialId }) : Promise.resolve(null),
            data.variantId ? this.variantRepo.findOne({ id: data.variantId }) : Promise.resolve(null),
        ]);
        const label = rawMaterial?.name || variant?.name || warehouse?.name;
        await this.logAudit('inventory', inventoryItem.id, 'stock_updated', {
            warehouseId: data.warehouseId,
            warehouseName: warehouse?.name,
            rawMaterialId: data.rawMaterialId,
            rawMaterialName: rawMaterial?.name,
            rawMaterialSku: rawMaterial?.sku,
            rawMaterialSpecificationId: data.rawMaterialSpecificationId,
            variantId: data.variantId,
            variantName: variant?.name,
            variantSku: variant?.sku,
            previousQuantity,
            quantity: inventoryItem.quantity,
            label,
        }, actor);
        return inventoryItem;
    }

    async getFinishedGoodsLotInventory(
        page = 1,
        limit = 100,
        warehouseId?: string,
        search?: string,
        positiveOnly?: boolean
    ): Promise<{ items: FinishedGoodsLotInventory[]; total: number }> {
        const query: FilterQuery<FinishedGoodsLotInventory> = {};
        if (warehouseId) query.warehouse = warehouseId;
        if (positiveOnly) query.quantity = { $gt: 0 };
        const term = search?.trim();
        if (term) {
            query.$or = [
                { productionBatch: { code: { $ilike: `%${term}%` } } },
                { productionBatch: { variant: { name: { $ilike: `%${term}%` } } } },
                { productionBatch: { variant: { sku: { $ilike: `%${term}%` } } } },
                { productionBatch: { variant: { product: { name: { $ilike: `%${term}%` } } } } },
            ];
        }
        const [items, total] = await this.em.findAndCount(
            FinishedGoodsLotInventory,
            query,
            {
                populate: ['productionBatch', 'productionBatch.variant', 'productionBatch.variant.product', 'warehouse'],
                orderBy: { updatedAt: 'DESC' },
                limit,
                offset: (page - 1) * limit,
            }
        );
        return { items, total };
    }

    async addManualStock(data: { rawMaterialId: string; quantity: number; unitCost: number; warehouseId?: string }, actor?: string): Promise<InventoryItem> {
        // 1. Get or create warehouse
        let warehouse: Warehouse | null = null;
        if (data.warehouseId) {
            warehouse = await this.warehouseRepo.findOne({ id: data.warehouseId });
        }

        if (!warehouse) {
            warehouse = await this.warehouseRepo.findOne({ name: 'Main Warehouse' });
        }

        if (!warehouse) {
            warehouse = this.warehouseRepo.create({
                name: 'Main Warehouse',
                location: 'Default Location',
                type: WarehouseType.RAW_MATERIALS,
            } as Warehouse);
            await this.em.persist(warehouse);
        }

        // 2. Get Raw Material
        const rawMaterialRepo = this.em.getRepository(RawMaterial);
        const rawMaterial = await rawMaterialRepo.findOneOrFail({ id: data.rawMaterialId });

        // 3. Get or Create Inventory Item
        let inventory = await this.inventoryRepo.findOne({
            rawMaterial: { id: data.rawMaterialId },
            rawMaterialSpecification: null,
            warehouse: { id: warehouse.id },
        });

        if (!inventory) {
            inventory = this.inventoryRepo.create({
                warehouse,
                rawMaterial,
                rawMaterialSpecification: undefined,
                quantity: 0,
            } as InventoryItem);
        }

        // 4. Calculate Weighted Average Cost
        const currentStock = inventory.quantity;
        const currentAvgCost = Number(rawMaterial.averageCost || 0);
        const addedQty = data.quantity;
        const addedCost = data.unitCost;

        let newAvgCost = addedCost;
        if (currentStock + addedQty > 0) {
            const currentTotalValue = currentStock * currentAvgCost;
            const addedTotalValue = addedQty * addedCost;
            newAvgCost = (currentTotalValue + addedTotalValue) / (currentStock + addedQty);
        }

        // 5. Update values
        inventory.quantity += addedQty;
        rawMaterial.averageCost = newAvgCost;

        const supplierLotCode = `MANUAL-${Date.now().toString(36).toUpperCase()}`;
        const lot = this.rawMaterialLotRepo.create({
            rawMaterial,
            rawMaterialSpecification: undefined,
            warehouse,
            supplierLotCode,
            quantityInitial: addedQty,
            quantityAvailable: addedQty,
            unitCost: addedCost,
            receivedAt: new Date(),
            notes: 'Ingreso manual de inventario',
        } as unknown as RawMaterialLot);

        const kardex = this.rawMaterialKardexRepo.create({
            rawMaterial,
            rawMaterialSpecification: undefined,
            warehouse,
            lot,
            movementType: 'ENTRADA_AJUSTE_MANUAL',
            quantity: addedQty,
            balanceAfter: addedQty,
            referenceType: 'manual_stock',
            notes: 'Entrada manual de inventario',
            occurredAt: new Date(),
        } as unknown as RawMaterialKardex);

        // 6. Save
        await this.em.persistAndFlush([inventory, rawMaterial, lot, kardex]);
        const label = rawMaterial.name || warehouse.name;
        await this.logAudit('inventory', inventory.id, 'manual_stock_added', {
            warehouseId: warehouse.id,
            warehouseName: warehouse.name,
            rawMaterialId: rawMaterial.id,
            rawMaterialName: rawMaterial.name,
            rawMaterialSku: rawMaterial.sku,
            previousQuantity: currentStock,
            quantity: inventory.quantity,
            addedQuantity: addedQty,
            unitCost: addedCost,
            averageCost: rawMaterial.averageCost,
            lotId: lot.id,
            label,
        }, actor);
        return inventory;
    }

    async getInventoryItems(page: number, limit: number, warehouseId?: string) {
        const query: FilterQuery<InventoryItem> = {};
        if (warehouseId) {
            query.warehouse = warehouseId;
        }

        const [items, total] = await this.inventoryRepo.findAndCount(
            query,
            {
                limit,
                offset: (page - 1) * limit,
                populate: ['rawMaterial', 'rawMaterialSpecification', 'variant', 'variant.product', 'warehouse'],
            }
        );
        return { items, total };
    }

    async getRawMaterialKardex(filters: {
        page: number;
        limit: number;
        rawMaterialId?: string;
        supplierLotCode?: string;
        referenceId?: string;
        dateFrom?: Date;
        dateTo?: Date;
    }) {
        const query: FilterQuery<RawMaterialKardex> = {};
        if (filters.rawMaterialId) {
            query.rawMaterial = filters.rawMaterialId;
        }
        if (filters.supplierLotCode) {
            query.lot = { supplierLotCode: { $ilike: `%${filters.supplierLotCode}%` } };
        }
        if (filters.referenceId) {
            query.referenceId = { $ilike: `%${filters.referenceId}%` };
        }
        if (filters.dateFrom || filters.dateTo) {
            query.occurredAt = {};
            if (filters.dateFrom) query.occurredAt.$gte = filters.dateFrom;
            if (filters.dateTo) query.occurredAt.$lte = filters.dateTo;
        }

        const [items, total] = await this.rawMaterialKardexRepo.findAndCount(
            query,
            {
                limit: filters.limit,
                offset: (filters.page - 1) * filters.limit,
                populate: ['rawMaterial', 'warehouse', 'lot'],
                orderBy: { occurredAt: 'DESC' },
            }
        );
        return { items, total };
    }
}
