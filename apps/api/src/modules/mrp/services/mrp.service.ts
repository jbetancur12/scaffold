import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { RawMaterial } from '../entities/raw-material.entity';
import { BOMItem } from '../entities/bom-item.entity';
import { ProductVariant } from '../entities/product-variant.entity';
import { RawMaterialSchema, BOMItemSchema } from '@scaffold/schemas';
import { z } from 'zod';

export class MrpService {
    private readonly em: EntityManager;
    private readonly rawMaterialRepo: EntityRepository<RawMaterial>;
    private readonly bomItemRepo: EntityRepository<BOMItem>;
    private readonly variantRepo: EntityRepository<ProductVariant>;

    constructor(em: EntityManager) {
        this.em = em;
        this.rawMaterialRepo = em.getRepository(RawMaterial);
        this.bomItemRepo = em.getRepository(BOMItem);
        this.variantRepo = em.getRepository(ProductVariant);
    }

    async createRawMaterial(data: z.infer<typeof RawMaterialSchema>): Promise<RawMaterial> {
        const material = this.rawMaterialRepo.create(data as unknown as RawMaterial);
        await this.em.persistAndFlush(material);
        return material;
    }

    async listRawMaterials(page = 1, limit = 10): Promise<{ materials: RawMaterial[]; total: number }> {
        const [materials, total] = await this.rawMaterialRepo.findAndCount(
            {},
            {
                limit,
                offset: (page - 1) * limit,
                orderBy: { name: 'ASC' },
                populate: ['supplier']
            }
        );
        return { materials, total };
    }

    async addBOMItem(data: z.infer<typeof BOMItemSchema>): Promise<BOMItem> {
        // Fetch the variant and raw material entities
        const variant = await this.variantRepo.findOneOrFail({ id: data.variantId });
        const rawMaterial = await this.rawMaterialRepo.findOneOrFail({ id: data.rawMaterialId });

        // Create BOM item with proper relations
        const bomItem = this.bomItemRepo.create({
            variant,
            rawMaterial,
            quantity: data.quantity,
        } as unknown as BOMItem);

        await this.em.persistAndFlush(bomItem);

        // Recalculate variant cost
        await this.calculateVariantCost(data.variantId);

        return bomItem;
    }

    async getBOM(variantId: string): Promise<BOMItem[]> {
        return this.bomItemRepo.find(
            { variantId },
            { populate: ['rawMaterial'] }
        );
    }

    async deleteBOMItem(id: string): Promise<void> {
        const item = await this.bomItemRepo.findOneOrFail({ id });
        const variantId = item.variantId;

        await this.em.removeAndFlush(item);

        // Recalculate variant cost
        await this.calculateVariantCost(variantId);
    }

    async calculateVariantCost(variantId: string): Promise<void> {
        const variant = await this.variantRepo.findOneOrFail({ id: variantId }, { populate: ['bomItems', 'bomItems.rawMaterial'] });

        let materialCost = 0;
        for (const item of variant.bomItems) {
            materialCost += item.quantity * item.rawMaterial.cost;
        }

        variant.cost = materialCost + variant.laborCost + variant.indirectCost;
        await this.em.persistAndFlush(variant);
    }
}
