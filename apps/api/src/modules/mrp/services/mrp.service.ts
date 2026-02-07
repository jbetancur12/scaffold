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

    async getRawMaterial(id: string): Promise<RawMaterial> {
        return this.rawMaterialRepo.findOneOrFail({ id }, { populate: ['supplier'] });
    }

    async updateRawMaterial(id: string, data: Partial<z.infer<typeof RawMaterialSchema>>): Promise<RawMaterial> {
        const material = await this.getRawMaterial(id);
        const oldCost = material.cost;

        Object.assign(material, data);

        await this.em.persistAndFlush(material);

        // If cost changed, recalculate affected variants
        if (data.cost !== undefined && data.cost !== oldCost) {
            await this.recalculateVariantsByMaterial(id);
        }

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
            fabricationParams: data.fabricationParams,
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

        let actualMaterialCost = 0;
        let referenceMaterialCost = 0;

        for (const item of variant.bomItems) {
            // Actual cost uses averageCost if available
            const actualUnitCost = (item.rawMaterial.averageCost && item.rawMaterial.averageCost > 0)
                ? item.rawMaterial.averageCost
                : item.rawMaterial.cost;
            actualMaterialCost += item.quantity * actualUnitCost;

            // Reference cost always uses the standard cost
            const referenceUnitCost = item.rawMaterial.cost;
            referenceMaterialCost += item.quantity * referenceUnitCost;
        }

        const labor = variant.laborCost || 0;
        const indirect = variant.indirectCost || 0;

        variant.cost = actualMaterialCost + labor + indirect;
        variant.referenceCost = referenceMaterialCost + labor + indirect;

        await this.em.persistAndFlush(variant);
    }

    async recalculateVariantsByMaterial(materialId: string): Promise<void> {
        // Find all BOM items that use this material
        const bomItems = await this.bomItemRepo.find({ rawMaterial: { id: materialId } });

        // Get unique variant IDs
        const variantIds = [...new Set(bomItems.map(item => item.variant.id))];

        // Recalculate each variant
        for (const variantId of variantIds) {
            await this.calculateVariantCost(variantId);
        }
    }
}
