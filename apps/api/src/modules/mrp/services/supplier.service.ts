import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { Supplier } from '../entities/supplier.entity';
import { SupplierMaterial } from '../entities/supplier-material.entity';
import { RawMaterial } from '../entities/raw-material.entity';
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

    async updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier> {
        const supplier = await this.supplierRepo.findOneOrFail({ id });
        this.supplierRepo.assign(supplier, data);
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

    async getSupplierMaterials(supplierId: string) {
        const supplierMaterialRepo = this.em.getRepository(SupplierMaterial);
        return supplierMaterialRepo.find(
            { supplier: supplierId },
            {
                populate: ['rawMaterial'],
                orderBy: { lastPurchaseDate: 'DESC' }
            }
        );
    }

    async addSupplierMaterial(supplierId: string, materialId: string, price: number = 0) {
        const supplierMaterialRepo = this.em.getRepository(SupplierMaterial);

        let link = await supplierMaterialRepo.findOne({
            supplier: supplierId,
            rawMaterial: materialId
        });

        if (!link) {
            // Check entities exist
            const supplier = await this.supplierRepo.findOneOrFail({ id: supplierId });
            const rawMaterial = await this.em.findOneOrFail(RawMaterial, { id: materialId });

            link = supplierMaterialRepo.create({
                supplier,
                rawMaterial,
                lastPurchasePrice: price,
                lastPurchaseDate: new Date()
            } as unknown as SupplierMaterial);
            await this.em.persistAndFlush(link);
        }

        return link;
    }

    async removeSupplierMaterial(supplierId: string, materialId: string) {
        const supplierMaterialRepo = this.em.getRepository(SupplierMaterial);
        const link = await supplierMaterialRepo.findOne({
            supplier: supplierId,
            rawMaterial: materialId
        });

        if (link) {
            await this.em.removeAndFlush(link);
        }
    }
}
