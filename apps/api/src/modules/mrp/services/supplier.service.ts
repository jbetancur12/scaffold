import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { Supplier } from '../entities/supplier.entity';
import { SupplierMaterial } from '../entities/supplier-material.entity';
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

    async getSupplier(id: string): Promise<Supplier | null> {
        return this.supplierRepo.findOne({ id });
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

    async getSuppliersForMaterial(materialId: string) {
        // We need to access SupplierMaterial repo. Best to do it via EM to avoid circular deps or just simple usage.
        const supplierMaterialRepo = this.em.getRepository(SupplierMaterial);
        return supplierMaterialRepo.find(
            { rawMaterial: materialId },
            {
                populate: ['supplier'],
                orderBy: { lastPurchaseDate: 'DESC' }
            }
        );
    }
}
