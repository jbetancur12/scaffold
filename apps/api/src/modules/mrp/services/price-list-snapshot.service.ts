import { EntityManager, FilterQuery } from '@mikro-orm/core';
import { PriceListSnapshot } from '../entities/price-list-snapshot.entity';
import { PriceListConfigService } from './price-list-config.service';
import { Product } from '../entities/product.entity';
import { ProductImage } from '../entities/product-image.entity';
import { ProductTaxStatus } from '@scaffold/types';

export class PriceListSnapshotService {
    private readonly snapshotRepo;
    private readonly productRepo;
    private readonly configService: PriceListConfigService;

    constructor(private readonly em: EntityManager) {
        this.snapshotRepo = this.em.getRepository(PriceListSnapshot);
        this.productRepo = this.em.getRepository(Product);
        this.configService = new PriceListConfigService(em);
    }

    private resolveMonthKey(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }

    async listSnapshots(month?: string) {
        const where: FilterQuery<PriceListSnapshot> = month ? { month } : {};
        return this.snapshotRepo.find(where, { orderBy: { month: 'DESC', version: 'DESC' } });
    }

    async getSnapshot(month: string, version?: number) {
        const where: FilterQuery<PriceListSnapshot> = { month };
        if (version) where.version = version;
        return this.snapshotRepo.findOne(where, { orderBy: { version: 'DESC', createdAt: 'DESC' } });
    }

    private pickVariant(product: Product) {
        const variants = product.variants?.getItems?.() ?? [];
        if (variants.length === 0) return null;
        return [...variants].sort((a, b) => Number(b.price || 0) - Number(a.price || 0))[0];
    }

    private pickImage(images: ProductImage[]) {
        if (!images || images.length === 0) return undefined;
        const sorted = [...images].sort((a, b) => {
            if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        return sorted[0];
    }

    private async buildSnapshotItems() {
        const products = await this.productRepo.find(
            { showInCatalogPdf: true },
            { populate: ['variants', 'category', 'images'], orderBy: { name: 'ASC' } }
        );

        return products.map((product) => {
            const variant = this.pickVariant(product);
            const image = this.pickImage(product.images?.getItems?.() ?? []);
            return {
                productId: product.id,
                sku: product.sku,
                name: product.name,
                description: product.description || 'Sin descripción',
                categoryId: product.category?.id,
                groupName: product.category?.name || 'Sin grupo',
                groupSortOrder: Number(product.category?.sortOrder ?? 9999),
                price: Number(variant?.price || 0),
                taxStatus: variant?.taxStatus || ProductTaxStatus.EXCLUIDO,
                taxRate: Number(variant?.taxRate || 0),
                imageFilePath: image?.filePath,
                imageMime: image?.fileMime,
                imageSortOrder: image?.sortOrder,
            };
        });
    }

    async ensureSnapshot(month?: string) {
        const key = month || this.resolveMonthKey();
        const existing = await this.getSnapshot(key);
        if (existing) return existing;
        return this.createSnapshot(key, 'auto');
    }

    async createSnapshot(month: string, source: 'auto' | 'manual') {
        const latest = await this.getSnapshot(month);
        const nextVersion = latest ? latest.version + 1 : 1;
        const config = await this.configService.getConfig();
        const items = await this.buildSnapshotItems();
        const now = new Date();
        const row = this.snapshotRepo.create({
            month,
            version: nextVersion,
            configSnapshot: {
                showCover: config.showCover,
                orientation: config.orientation,
                headerTitle: config.headerTitle,
                headerSubtitle: config.headerSubtitle,
                introText: config.introText,
                sections: config.sections || [],
            },
            items,
            source,
            createdAt: now,
            updatedAt: now,
        });
        await this.em.persistAndFlush(row);
        return row;
    }

    async regenerateSnapshot(month?: string) {
        const key = month || this.resolveMonthKey();
        return this.createSnapshot(key, 'manual');
    }
}
