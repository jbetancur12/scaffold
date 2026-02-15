import { EntityManager, EntityRepository, FilterQuery } from '@mikro-orm/core';
import { InventoryItem } from '../entities/inventory-item.entity';
import { Warehouse } from '../entities/warehouse.entity';
import { RawMaterial } from '../entities/raw-material.entity';
import { WarehouseSchema, InventoryItemSchema } from '@scaffold/schemas';
import { WarehouseType } from '@scaffold/types';
import { z } from 'zod';

export class InventoryService {
    private readonly em: EntityManager;
    private readonly inventoryRepo: EntityRepository<InventoryItem>;
    private readonly warehouseRepo: EntityRepository<Warehouse>;

    constructor(em: EntityManager) {
        this.em = em;
        this.inventoryRepo = em.getRepository(InventoryItem);
        this.warehouseRepo = em.getRepository(Warehouse);
    }


    async createWarehouse(data: z.infer<typeof WarehouseSchema>): Promise<Warehouse> {
        const warehouse = this.warehouseRepo.create(data as unknown as Warehouse);
        await this.em.persistAndFlush(warehouse);
        return warehouse;
    }

    async listWarehouses(): Promise<Warehouse[]> {
        return this.warehouseRepo.findAll();
    }

    async getWarehouse(id: string): Promise<Warehouse> {
        return this.warehouseRepo.findOneOrFail({ id });
    }

    async updateWarehouse(id: string, data: Partial<z.infer<typeof WarehouseSchema>>): Promise<Warehouse> {
        const warehouse = await this.getWarehouse(id);
        Object.assign(warehouse, data);
        await this.em.persistAndFlush(warehouse);
        return warehouse;
    }

    async deleteWarehouse(id: string): Promise<void> {
        const warehouse = await this.getWarehouse(id);
        await this.em.removeAndFlush(warehouse);
    }

    async updateStock(data: z.infer<typeof InventoryItemSchema>): Promise<InventoryItem> {
        // Build query based on whether it's raw material or variant
        const query: FilterQuery<InventoryItem> = { warehouse: data.warehouseId };
        if (data.rawMaterialId) query.rawMaterial = data.rawMaterialId;
        if (data.variantId) query.variant = data.variantId;

        let inventoryItem = await this.inventoryRepo.findOne(query);

        if (inventoryItem) {
            inventoryItem.quantity = data.quantity; // Or logic to increment/decrement
        } else {
            inventoryItem = this.inventoryRepo.create(data as unknown as InventoryItem);
        }

        await this.em.persistAndFlush(inventoryItem);
        return inventoryItem;
    }

    async addManualStock(data: { rawMaterialId: string; quantity: number; unitCost: number; warehouseId?: string }): Promise<InventoryItem> {
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
            warehouse: { id: warehouse.id },
        });

        if (!inventory) {
            inventory = this.inventoryRepo.create({
                warehouse,
                rawMaterial,
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

        // 6. Save
        await this.em.persistAndFlush([inventory, rawMaterial]);
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
                populate: ['rawMaterial', 'variant', 'variant.product', 'warehouse'],
            }
        );
        return { items, total };
    }
}
