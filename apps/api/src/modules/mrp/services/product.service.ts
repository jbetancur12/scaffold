import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { Product } from '../entities/product.entity';
import { ProductVariant } from '../entities/product-variant.entity';
import { ProductSchema } from '@scaffold/schemas';
import { z } from 'zod';

export class ProductService {
    private readonly em: EntityManager;
    private readonly productRepo: EntityRepository<Product>;
    private readonly variantRepo: EntityRepository<ProductVariant>;

    constructor(em: EntityManager) {
        this.em = em;
        this.productRepo = em.getRepository(Product);
        this.variantRepo = em.getRepository(ProductVariant);
    }

    async createProduct(data: z.infer<typeof ProductSchema>): Promise<Product> {
        const product = this.productRepo.create(data as unknown as Product);
        await this.em.persistAndFlush(product);
        return product;
    }

    async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
        const product = await this.productRepo.findOneOrFail({ id });
        this.productRepo.assign(product, data);
        await this.em.persistAndFlush(product);
        return product;
    }

    async deleteProduct(id: string): Promise<void> {
        const product = await this.productRepo.findOneOrFail({ id });
        await this.em.removeAndFlush(product);
    }

    async createVariant(productId: string, data: Partial<ProductVariant>): Promise<ProductVariant> {
        const product = await this.productRepo.findOneOrFail({ id: productId });
        const variant = this.variantRepo.create({ ...data, product } as unknown as ProductVariant);
        await this.em.persistAndFlush(variant);
        return variant;
    }

    async updateVariant(variantId: string, data: Partial<ProductVariant>): Promise<ProductVariant> {
        const variant = await this.variantRepo.findOneOrFail({ id: variantId });
        this.variantRepo.assign(variant, data);
        await this.em.persistAndFlush(variant);
        return variant;
    }

    async deleteVariant(variantId: string): Promise<void> {
        const variant = await this.variantRepo.findOneOrFail({ id: variantId });
        await this.em.removeAndFlush(variant);
    }

    async getProduct(id: string): Promise<Product | null> {
        return this.productRepo.findOne({ id }, { populate: ['variants'] });
    }

    async listProducts(page = 1, limit = 10): Promise<{ products: Product[]; total: number }> {
        const [products, total] = await this.productRepo.findAndCount(
            {},
            {
                limit,
                offset: (page - 1) * limit,
                populate: ['variants'],
            }
        );
        return { products, total };
    }

    // Logic to update product cost based on variants will be here or in MrpService
}
