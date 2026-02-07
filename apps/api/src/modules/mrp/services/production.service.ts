import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { ProductionOrder } from '../entities/production-order.entity';
import { ProductionOrderItem } from '../entities/production-order-item.entity';
import { ProductVariant } from '../entities/product-variant.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { RawMaterial } from '../entities/raw-material.entity';
import { ProductionOrderSchema, ProductionOrderItemSchema } from '@scaffold/schemas';
import { z } from 'zod';

export class ProductionService {
    private readonly em: EntityManager;
    private readonly productionOrderRepo: EntityRepository<ProductionOrder>;
    private readonly inventoryRepo: EntityRepository<InventoryItem>;

    constructor(em: EntityManager) {
        this.em = em;
        this.productionOrderRepo = em.getRepository(ProductionOrder);
        this.inventoryRepo = em.getRepository(InventoryItem);
    }

    async createOrder(data: z.infer<typeof ProductionOrderSchema>, itemsData: z.infer<typeof ProductionOrderItemSchema>[]): Promise<ProductionOrder> {
        const order = this.productionOrderRepo.create(data as unknown as ProductionOrder);

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
            { populate: ['items', 'items.variant', 'items.variant.product', 'items.variant.bomItems', 'items.variant.bomItems.rawMaterial'] }
        );
    }


    async calculateMaterialRequirements(orderId: string): Promise<{ material: RawMaterial, required: number, available: number }[]> {
        const order = await this.productionOrderRepo.findOneOrFail({ id: orderId }, { populate: ['items', 'items.variant', 'items.variant.bomItems', 'items.variant.bomItems.rawMaterial'] });

        const requirements = new Map<string, { material: RawMaterial, required: number, available: number }>();

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
                        available: 0 // Will populate next
                    });
                }
            }
        }

        // 2. Check Available Stock (Sum across all warehouses for now, or specific RawMaterial warehouse)
        // Optimization: Fetch all needed inventory items in one query if possible
        const materialIds = Array.from(requirements.keys());
        const inventoryItems = await this.inventoryRepo.find({ rawMaterial: { $in: materialIds } });

        for (const invItem of inventoryItems) {
            if (invItem.rawMaterial && requirements.has(invItem.rawMaterial.id)) {
                requirements.get(invItem.rawMaterial.id)!.available += invItem.quantity;
            }
        }

        return Array.from(requirements.values());
    }
}
