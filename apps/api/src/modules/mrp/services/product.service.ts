import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { Product } from '../entities/product.entity';
import { ProductVariant } from '../entities/product-variant.entity';
import { ProductSchema, UpdateProductSchema } from '@scaffold/schemas';
import { OperationalConfig } from '../entities/operational-config.entity';
import { InvimaRegistrationStatus } from '@scaffold/types';
import { AppError } from '../../../shared/utils/response';
import { InvimaRegistration } from '../entities/invima-registration.entity';
import { z } from 'zod';

export class ProductService {
    private readonly em: EntityManager;
    private readonly productRepo: EntityRepository<Product>;
    private readonly variantRepo: EntityRepository<ProductVariant>;
    private readonly invimaRepo: EntityRepository<InvimaRegistration>;

    constructor(em: EntityManager) {
        this.em = em;
        this.productRepo = em.getRepository(Product);
        this.variantRepo = em.getRepository(ProductVariant);
        this.invimaRepo = em.getRepository(InvimaRegistration);
    }



    private async calculateVariantCost(variantId: string): Promise<void> {
        const variant = await this.variantRepo.findOneOrFail({ id: variantId }, { populate: ['bomItems', 'bomItems.rawMaterial'] });

        let actualMaterialCost = 0;
        let referenceMaterialCost = 0;

        for (const item of variant.bomItems) {
            if (item.rawMaterial) {
                // Actual cost uses averageCost if available
                const actualUnitCost = (item.rawMaterial.averageCost && item.rawMaterial.averageCost > 0)
                    ? item.rawMaterial.averageCost
                    : item.rawMaterial.cost;
                actualMaterialCost += item.quantity * actualUnitCost;

                // Reference cost always uses the standard cost
                const referenceUnitCost = item.rawMaterial.cost;
                referenceMaterialCost += item.quantity * referenceUnitCost;
            }
        }

        const hasOperationalMinutes = Boolean(variant.productionMinutes && variant.productionMinutes > 0);
        const labor = hasOperationalMinutes ? 0 : (variant.laborCost || 0);
        const indirect = hasOperationalMinutes ? 0 : (variant.indirectCost || 0);

        // Calculate Operational Cost based on time
        let operationalCost = 0;
        if (hasOperationalMinutes) {
            const configRepo = this.em.getRepository(OperationalConfig);
            // Use findOne with an empty object as the first argument
            const [config] = await configRepo.find({}, { orderBy: { createdAt: 'DESC' }, limit: 1 });
            if (config) {
                operationalCost = (variant.productionMinutes || 0) * config.costPerMinute;
            }
        }

        variant.cost = actualMaterialCost + labor + indirect + operationalCost;
        variant.referenceCost = referenceMaterialCost + labor + indirect + operationalCost;

        await this.em.persistAndFlush(variant);
    }

    async createProduct(data: z.infer<typeof ProductSchema>): Promise<Product> {
        const { invimaRegistrationId, ...productData } = data;
        let invimaRegistration: InvimaRegistration | undefined;
        if (invimaRegistrationId) {
            invimaRegistration = await this.invimaRepo.findOneOrFail({ id: invimaRegistrationId });
            if (invimaRegistration.status !== InvimaRegistrationStatus.ACTIVO) {
                throw new AppError('El registro INVIMA seleccionado no está activo', 400);
            }
        }

        if (productData.requiresInvima && !invimaRegistration) {
            throw new AppError('Debes seleccionar un registro INVIMA para productos regulados', 400);
        }

        const product = this.productRepo.create({
            ...productData,
            invimaRegistration,
        } as unknown as Product);
        await this.em.persistAndFlush(product);
        return this.productRepo.findOneOrFail({ id: product.id }, { populate: ['invimaRegistration', 'variants'] });
    }

    async updateProduct(id: string, data: z.infer<typeof UpdateProductSchema>): Promise<Product> {
        const product = await this.productRepo.findOneOrFail({ id }, { populate: ['invimaRegistration'] });
        let invimaRegistration = product.invimaRegistration;
        const { invimaRegistrationId, ...productData } = data;

        if ('invimaRegistrationId' in data) {
            if (invimaRegistrationId) {
                invimaRegistration = await this.invimaRepo.findOneOrFail({ id: invimaRegistrationId });
                if (invimaRegistration.status !== InvimaRegistrationStatus.ACTIVO) {
                    throw new AppError('El registro INVIMA seleccionado no está activo', 400);
                }
            } else {
                invimaRegistration = undefined;
            }
        }

        const requiresInvima = typeof productData.requiresInvima === 'boolean' ? productData.requiresInvima : product.requiresInvima;
        const productReference = productData.productReference !== undefined ? productData.productReference : product.productReference;
        if (requiresInvima && !invimaRegistration) {
            throw new AppError('Debes seleccionar un registro INVIMA para productos regulados', 400);
        }
        if (requiresInvima && !productReference) {
            throw new AppError('Debes registrar la referencia del producto regulado', 400);
        }

        this.productRepo.assign(product, {
            ...productData,
            invimaRegistration,
        });
        await this.em.persistAndFlush(product);
        return this.productRepo.findOneOrFail({ id: product.id }, { populate: ['invimaRegistration', 'variants'] });
    }

    async deleteProduct(id: string): Promise<void> {
        const product = await this.productRepo.findOneOrFail({ id }, { populate: ['variants', 'variants.bomItems'] });
        await this.em.removeAndFlush(product);
    }

    async createVariant(productId: string, data: Partial<ProductVariant>): Promise<ProductVariant> {
        const product = await this.productRepo.findOneOrFail({ id: productId });
        const variant = this.variantRepo.create({ ...data, product } as unknown as ProductVariant);
        await this.em.persistAndFlush(variant);
        await this.calculateVariantCost(variant.id);
        return variant;
    }

    async updateVariant(variantId: string, data: Partial<ProductVariant>): Promise<ProductVariant> {
        const variant = await this.variantRepo.findOneOrFail({ id: variantId });
        this.variantRepo.assign(variant, data);
        await this.em.persistAndFlush(variant);
        await this.calculateVariantCost(variant.id);
        return variant;
    }

    async deleteVariant(variantId: string): Promise<void> {
        const variant = await this.variantRepo.findOneOrFail({ id: variantId }, { populate: ['bomItems'] });
        await this.em.removeAndFlush(variant);
    }

    async getProduct(id: string): Promise<Product | null> {
        return this.productRepo.findOne({ id }, { populate: ['variants', 'invimaRegistration'] });
    }

    async listProducts(page = 1, limit = 10): Promise<{ products: Product[]; total: number }> {
        const [products, total] = await this.productRepo.findAndCount(
            {},
            {
                limit,
                offset: (page - 1) * limit,
                populate: ['variants', 'invimaRegistration'],
            }
        );
        return { products, total };
    }

    async createInvimaRegistration(payload: {
        code: string;
        holderName: string;
        manufacturerName?: string;
        validFrom?: Date;
        validUntil?: Date;
        status?: InvimaRegistrationStatus;
        notes?: string;
    }) {
        const row = this.invimaRepo.create({
            code: payload.code.toUpperCase(),
            holderName: payload.holderName,
            manufacturerName: payload.manufacturerName,
            validFrom: payload.validFrom,
            validUntil: payload.validUntil,
            status: payload.status ?? InvimaRegistrationStatus.ACTIVO,
            notes: payload.notes,
        } as unknown as InvimaRegistration);
        await this.em.persistAndFlush(row);
        return row;
    }

    async updateInvimaRegistration(id: string, payload: Partial<{
        code: string;
        holderName: string;
        manufacturerName?: string;
        validFrom?: Date;
        validUntil?: Date;
        status: InvimaRegistrationStatus;
        notes?: string;
    }>) {
        const row = await this.invimaRepo.findOneOrFail({ id });
        this.invimaRepo.assign(row, {
            ...payload,
            code: payload.code ? payload.code.toUpperCase() : undefined,
        });
        await this.em.persistAndFlush(row);
        return row;
    }

    async listInvimaRegistrations(filters: { status?: InvimaRegistrationStatus }) {
        const query: Record<string, unknown> = {};
        if (filters.status) query.status = filters.status;
        return this.invimaRepo.find(query, { orderBy: [{ status: 'ASC' }, { code: 'ASC' }] });
    }

    // Logic to update product cost based on variants will be here or in MrpService
}
