import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { Supplier } from '../entities/supplier.entity';
import { SupplierSchema } from '@scaffold/schemas';
import { z } from 'zod';

export class SupplierService {
    private readonly em: EntityManager;
    private readonly supplierRepo: EntityRepository<Supplier>;

    constructor(em: EntityManager) {
        this.em = em;
        this.supplierRepo = em.getRepository(Supplier);
    }

    async createSupplier(data: z.infer<typeof SupplierSchema>): Promise<Supplier> {
        const supplier = this.supplierRepo.create(data as unknown as Supplier);
        await this.em.persistAndFlush(supplier);
        return supplier;
    }

    async listSuppliers(page = 1, limit = 10): Promise<{ suppliers: Supplier[]; total: number }> {
        const [suppliers, total] = await this.supplierRepo.findAndCount(
            {},
            {
                limit,
                offset: (page - 1) * limit,
                orderBy: { name: 'ASC' }
            }
        );
        return { suppliers, total };
    }

    // Additional methods for purchase history...
}
