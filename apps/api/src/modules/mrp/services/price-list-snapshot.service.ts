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

    private calculateManualPvpPrice(value?: number | null) {
        const price = Number(value || 0);
        if (!Number.isFinite(price) || price <= 0) return 0;
        return Number((price / 0.75).toFixed(2));
    }

    async listSnapshots(month?: string, priceSource?: 'auto' | 'manual') {
        const where: FilterQuery<PriceListSnapshot> = month ? { month } : {};
        if (priceSource) where.priceSource = priceSource;
        return this.snapshotRepo.find(where, { orderBy: { month: 'DESC', priceSource: 'ASC', version: 'DESC' } });
    }

    async getSnapshot(month: string, version?: number, priceSource?: 'auto' | 'manual') {
        const where: FilterQuery<PriceListSnapshot> = { month };
        if (version) where.version = version;
        if (priceSource) where.priceSource = priceSource;
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

    private collectVariantAttributes(product: Product) {
        const variants = product.variants?.getItems?.() ?? [];
        const uniqueSizes = Array.from(
            new Set(
                variants
                    .map((variant) => variant.size || variant.sizeCode || '')
                    .filter((value) => value.trim().length > 0)
            )
        );
        const uniqueColors = Array.from(
            new Set(
                variants
                    .map((variant) => variant.color || variant.colorCode || '')
                    .filter((value) => value.trim().length > 0)
            )
        );

        return {
            sizes: uniqueSizes.join(', '),
            colors: uniqueColors.join(', '),
        };
    }

    private async buildSnapshotItems(priceSource: 'auto' | 'manual') {
        const products = await this.productRepo.find(
            { showInCatalogPdf: true },
            { populate: ['variants', 'category', 'images'], orderBy: { name: 'ASC' } }
        );

        return products.map((product) => {
            const variant = this.pickVariant(product);
            const image = this.pickImage(product.images?.getItems?.() ?? []);
            const attributes = this.collectVariantAttributes(product);
            return {
                productId: product.id,
                sku: product.sku,
                name: product.name,
                description: product.description || 'Sin descripción',
                sizes: attributes.sizes,
                colors: attributes.colors,
                categoryId: product.category?.id,
                groupName: product.category?.name || 'Sin grupo',
                groupSortOrder: Number(product.category?.sortOrder ?? 9999),
                cost: Number(variant?.cost || 0),
                price: Number(variant?.price || 0),
                pvpPrice: Number(variant?.pvpPrice || 0),
                manualPrice: product.manualPrice != null ? Number(product.manualPrice) : undefined,
                manualPvpPrice: this.calculateManualPvpPrice(product.manualPrice),
                selectedPrice: priceSource === 'manual'
                    ? Number(product.manualPrice ?? 0)
                    : Number(variant?.price || 0),
                taxStatus: variant?.taxStatus || ProductTaxStatus.EXCLUIDO,
                taxRate: Number(variant?.taxRate || 0),
                imageFilePath: image?.filePath,
                imageMime: image?.fileMime,
                imageSortOrder: image?.sortOrder,
            };
        });
    }

    async ensureSnapshot(month?: string, priceSource: 'auto' | 'manual' = 'auto') {
        const key = month || this.resolveMonthKey();
        const existing = await this.getSnapshot(key, undefined, priceSource);
        if (existing) return existing;
        return this.createSnapshot(key, priceSource, 'auto');
    }

    async createSnapshot(month: string, priceSource: 'auto' | 'manual', source: 'auto' | 'manual') {
        const latest = await this.getSnapshot(month, undefined, priceSource);
        const nextVersion = latest ? latest.version + 1 : 1;
        const config = await this.configService.getConfig();
        const items = await this.buildSnapshotItems(priceSource);
        const now = new Date();
        const row = this.snapshotRepo.create({
            month,
            version: nextVersion,
            priceSource,
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

    async regenerateSnapshot(month?: string, priceSource: 'auto' | 'manual' = 'auto') {
        const key = month || this.resolveMonthKey();
        return this.createSnapshot(key, priceSource, 'manual');
    }

    exportSnapshotCsv(snapshot: PriceListSnapshot) {
        const csvCell = (value: string | number) => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const rows: Array<Array<string | number>> = [
            ['CODIGO', 'ARTICULO', 'GRUPO', 'COSTO PRODUCCION', 'PRECIO AUTOMATICO', 'PVP AUTOMATICO', 'PRECIO MANUAL', 'PVP MANUAL', 'PRECIO SNAPSHOT', 'VERSION'],
        ];

        const groupedItems = (snapshot.items || []).reduce<Map<string, typeof snapshot.items>>((acc, item) => {
            const current = acc.get(item.groupName) || [];
            current.push(item);
            acc.set(item.groupName, current);
            return acc;
        }, new Map());

        Array.from(groupedItems.entries())
            .sort(([groupNameA, itemsA], [groupNameB, itemsB]) => {
                const sortOrderA = Number(itemsA[0]?.groupSortOrder ?? 9999);
                const sortOrderB = Number(itemsB[0]?.groupSortOrder ?? 9999);
                if (sortOrderA !== sortOrderB) return sortOrderA - sortOrderB;

                const normalizedA = groupNameA.trim().toLowerCase();
                const normalizedB = groupNameB.trim().toLowerCase();
                const aIsOther = normalizedA === 'otros' || normalizedA === 'sin grupo';
                const bIsOther = normalizedB === 'otros' || normalizedB === 'sin grupo';
                if (aIsOther && !bIsOther) return 1;
                if (bIsOther && !aIsOther) return -1;

                return groupNameA.localeCompare(groupNameB);
            })
            .forEach(([groupName, items]) => {
                rows.push(['', '', groupName.toUpperCase(), '', '', '', '', '', '', '']);

                items
                    .sort((a, b) => a.sku.localeCompare(b.sku))
                    .forEach((item) => {
                        rows.push([
                            item.sku,
                            item.name,
                            item.groupName,
                            Number(item.cost || 0).toFixed(2),
                            Number(item.price || 0).toFixed(2),
                            Number(item.pvpPrice || 0).toFixed(2),
                            Number(item.manualPrice ?? 0).toFixed(2),
                            Number(item.manualPvpPrice || 0).toFixed(2),
                            Number(item.selectedPrice || 0).toFixed(2),
                            `v${snapshot.version}-${snapshot.priceSource === 'manual' ? 'M' : 'A'}`,
                        ]);
                    });
            });

        return {
            fileName: `lista_precios_${snapshot.month}_v${snapshot.version}-${snapshot.priceSource === 'manual' ? 'M' : 'A'}.csv`,
            content: `\ufeff${rows.map((row) => row.map(csvCell).join(',')).join('\n')}`,
        };
    }
}
