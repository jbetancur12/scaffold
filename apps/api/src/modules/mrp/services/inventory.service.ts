import { EntityManager, EntityRepository, FilterQuery } from '@mikro-orm/core';
import { InventoryItem } from '../entities/inventory-item.entity';
import { Warehouse } from '../entities/warehouse.entity';
import { WarehouseSchema, InventoryItemSchema } from '@scaffold/schemas';
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

    async getInventoryItems(page: number, limit: number) {
        const [items, total] = await this.inventoryRepo.findAndCount(
            {},
            {
                limit,
                offset: (page - 1) * limit,
                populate: ['rawMaterial', 'variant', 'variant.product', 'warehouse'],
            }
        );
        return { items, total };
    }
}
