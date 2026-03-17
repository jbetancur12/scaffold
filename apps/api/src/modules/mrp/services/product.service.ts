import { EntityManager, EntityRepository, FilterQuery } from '@mikro-orm/core';
import { Product } from '../entities/product.entity';
import { ProductVariant } from '../entities/product-variant.entity';
import { ListProductGroupsQuerySchema, ProductGroupSchema, ProductSchema, UpdateProductGroupSchema, UpdateProductSchema, UploadProductImageSchema } from '@scaffold/schemas';
import { OperationalConfig } from '../entities/operational-config.entity';
import { InvimaRegistrationStatus, ProductTaxStatus } from '@scaffold/types';
import { AppError } from '../../../shared/utils/response';
import { InvimaRegistration } from '../entities/invima-registration.entity';
import { z } from 'zod';
import { ProductGroup } from '../entities/product-group.entity';
import { ObjectStorageService } from '../../../shared/services/object-storage.service';
import { ProductImage } from '../entities/product-image.entity';
import { QualityAuditEvent } from '../entities/quality-audit-event.entity';

export class ProductService {
    private readonly em: EntityManager;
    private readonly productRepo: EntityRepository<Product>;
    private readonly variantRepo: EntityRepository<ProductVariant>;
    private readonly invimaRepo: EntityRepository<InvimaRegistration>;
    private readonly productGroupRepo: EntityRepository<ProductGroup>;
    private readonly productImageRepo: EntityRepository<ProductImage>;
    private readonly storageService: ObjectStorageService;
    private readonly auditRepo: EntityRepository<QualityAuditEvent>;

    constructor(em: EntityManager) {
        this.em = em;
        this.productRepo = em.getRepository(Product);
        this.variantRepo = em.getRepository(ProductVariant);
        this.invimaRepo = em.getRepository(InvimaRegistration);
        this.productGroupRepo = em.getRepository(ProductGroup);
        this.productImageRepo = em.getRepository(ProductImage);
        this.storageService = new ObjectStorageService();
        this.auditRepo = em.getRepository(QualityAuditEvent);
    }

    private buildProductSnapshot(product: Product) {
        return {
            sku: product.sku,
            name: product.name,
            categoryId: product.category?.id,
            requiresInvima: product.requiresInvima,
            productReference: product.productReference,
            invimaRegistrationId: product.invimaRegistration?.id,
        };
    }

    private buildVariantSnapshot(variant: ProductVariant) {
        return {
            sku: variant.sku,
            name: variant.name,
            productId: (variant.product as Product | undefined)?.id,
            price: variant.price,
            pvpMargin: variant.pvpMargin,
            pvpPrice: variant.pvpPrice,
            taxStatus: variant.taxStatus,
            taxRate: variant.taxRate,
            targetMargin: variant.targetMargin,
            productionMinutes: variant.productionMinutes,
            laborCost: variant.laborCost,
            indirectCost: variant.indirectCost,
        };
    }

    private async logAudit(entityType: string, entityId: string, action: string, metadata?: Record<string, unknown>) {
        const event = this.auditRepo.create({
            entityType,
            entityId,
            action,
            metadata,
        } as unknown as QualityAuditEvent);
        await this.em.persistAndFlush(event);
    }

    private decodeBase64Data(base64Data: string): Buffer {
        const normalized = base64Data.includes(',')
            ? base64Data.split(',').pop() ?? ''
            : base64Data;
        if (!normalized) {
            throw new AppError('Archivo base64 inválido', 400);
        }
        return Buffer.from(normalized, 'base64');
    }

    private slugifyGroup(value: string) {
        return value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 120);
    }

    private async resolveUniqueGroupSlug(baseInput: string, excludeId?: string) {
        const normalizedBase = this.slugifyGroup(baseInput) || 'grupo';
        let candidate = normalizedBase;
        let suffix = 1;
        while (true) {
            const existing = await this.productGroupRepo.findOne({ slug: candidate });
            if (!existing || existing.id === excludeId) {
                return candidate;
            }
            suffix += 1;
            candidate = `${normalizedBase}-${suffix}`;
        }
    }

    private async assertValidGroupParent(groupId: string, parentId: string) {
        if (groupId === parentId) {
            throw new AppError('Un grupo no puede ser padre de sí mismo', 400);
        }

        let current = await this.productGroupRepo.findOne({ id: parentId }, { populate: ['parent'] });
        while (current) {
            if (current.id === groupId) {
                throw new AppError('No puedes crear una jerarquía circular de grupos', 400);
            }
            current = current.parent
                ? await this.productGroupRepo.findOne({ id: current.parent.id }, { populate: ['parent'] })
                : null;
        }
    }

    private readonly productImportHeaders = [
        'row_type',
        'product_sku',
        'product_name',
        'product_description',
        'product_reference',
        'requires_invima',
        'invima_registration_code',
        'variant_sku',
        'variant_name',
        'variant_price',
        'variant_labor_cost',
        'variant_indirect_cost',
        'variant_target_margin',
        'variant_production_minutes',
    ] as const;

    private toCsvRow(values: ReadonlyArray<string | number | boolean | undefined | null>) {
        return values
            .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
            .join(',');
    }

    private parseCsvLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i += 1) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i += 1;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }
            if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
                continue;
            }
            current += char;
        }
        result.push(current.trim());
        return result;
    }

    private parseBoolean(value?: string): boolean | undefined {
        if (value == null || value.trim() === '') return undefined;
        const normalized = value.trim().toLowerCase();
        if (['1', 'true', 'si', 'sí', 'yes'].includes(normalized)) return true;
        if (['0', 'false', 'no'].includes(normalized)) return false;
        return undefined;
    }

    private parseNumber(value?: string): number | undefined {
        if (value == null || value.trim() === '') return undefined;
        const raw = value.trim().replace(/\s/g, '');
        let normalized = raw;

        // Handle locales:
        // - 1.234,56 => 1234.56
        // - 1,234.56 => 1234.56
        // - 0.4 / 0,4 => 0.4
        if (raw.includes(',') && raw.includes('.')) {
            const lastComma = raw.lastIndexOf(',');
            const lastDot = raw.lastIndexOf('.');
            if (lastComma > lastDot) {
                normalized = raw.replace(/\./g, '').replace(',', '.');
            } else {
                normalized = raw.replace(/,/g, '');
            }
        } else if (raw.includes(',')) {
            normalized = raw.replace(',', '.');
        }

        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : undefined;
    }

    private normalizePvpMargin(value?: number): number {
        if (value == null || !Number.isFinite(value)) return 0.25;
        return Math.min(0.99, Math.max(0, value));
    }

    private calculatePvpPrice(distributorPrice?: number, pvpMargin?: number): number {
        const price = Number(distributorPrice || 0);
        const margin = this.normalizePvpMargin(pvpMargin);
        if (!Number.isFinite(price) || price <= 0) return 0;
        const divisor = 1 - margin;
        if (divisor <= 0) return 0;
        return Number((price / divisor).toFixed(2));
    }

    private normalizeVariantTax(data: Partial<ProductVariant>, current?: ProductVariant): Partial<ProductVariant> {
        const taxStatus = data.taxStatus ?? current?.taxStatus ?? ProductTaxStatus.EXCLUIDO;
        const rawTaxRate = Number(data.taxRate ?? current?.taxRate ?? 0);
        return {
            taxStatus,
            taxRate: taxStatus === ProductTaxStatus.GRAVADO
                ? Math.max(0, Math.min(100, rawTaxRate || 19))
                : 0,
        };
    }

    private enrichVariantPricing(data: Partial<ProductVariant>, current?: ProductVariant): Partial<ProductVariant> {
        const price = data.price ?? current?.price ?? 0;
        const pvpMargin = this.normalizePvpMargin(data.pvpMargin ?? current?.pvpMargin);
        const hasIncomingPrice = typeof data.price === 'number' && Number.isFinite(data.price);
        const previousPrice = Number(current?.price ?? 0);
        const nextPrice = Number(price || 0);
        const isPriceChange = current ? (hasIncomingPrice && nextPrice !== previousPrice) : nextPrice > 0;
        const distributorPriceUpdatedAt = isPriceChange
            ? new Date()
            : current?.distributorPriceUpdatedAt;
        return {
            ...data,
            ...this.normalizeVariantTax(data, current),
            pvpMargin,
            pvpPrice: this.calculatePvpPrice(price, pvpMargin),
            distributorPriceUpdatedAt,
        };
    }

    private parseProductImportCsv(csvText: string) {
        const lines = csvText
            .replace(/\r/g, '')
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
        if (lines.length <= 1) {
            throw new AppError('El CSV no contiene filas de datos', 400);
        }

        const header = this.parseCsvLine(lines[0]).map((h) => h.toLowerCase());
        const expected = [...this.productImportHeaders];
        const invalidHeader = expected.some((key, idx) => header[idx] !== key);
        if (invalidHeader) {
            throw new AppError(`Encabezado CSV inválido. Debe ser: ${expected.join(', ')}`, 400);
        }

        const products = new Map<string, {
            rowNumber: number;
            sku: string;
            name: string;
            description?: string;
            productReference?: string;
            requiresInvima: boolean;
            invimaRegistrationCode?: string;
        }>();
        const variants: Array<{
            rowNumber: number;
            productSku: string;
            sku: string;
            name: string;
            price: number;
            laborCost: number;
            indirectCost: number;
            targetMargin: number;
            productionMinutes?: number;
        }> = [];
        const errors: Array<{ rowNumber: number; message: string }> = [];
        const variantSkuSet = new Set<string>();

        for (let index = 1; index < lines.length; index += 1) {
            const rowNumber = index + 1;
            const values = this.parseCsvLine(lines[index]);
            const row = Object.fromEntries(
                expected.map((key, keyIndex) => [key, (values[keyIndex] || '').trim()])
            ) as Record<(typeof expected)[number], string>;

            const rowType = row.row_type.toUpperCase();
            if (rowType !== 'PRODUCT' && rowType !== 'VARIANT') {
                errors.push({ rowNumber, message: 'row_type debe ser PRODUCT o VARIANT' });
                continue;
            }

            if (!row.product_sku) {
                errors.push({ rowNumber, message: 'product_sku es obligatorio' });
                continue;
            }
            const productSku = row.product_sku.toUpperCase();

            if (rowType === 'PRODUCT') {
                if (!row.product_name) {
                    errors.push({ rowNumber, message: 'product_name es obligatorio para filas PRODUCT' });
                    continue;
                }
                if (products.has(productSku)) {
                    errors.push({ rowNumber, message: `SKU de producto duplicado en archivo: ${productSku}` });
                    continue;
                }
                const requiresInvima = this.parseBoolean(row.requires_invima);
                if (row.requires_invima && requiresInvima === undefined) {
                    errors.push({ rowNumber, message: 'requires_invima debe ser true/false' });
                    continue;
                }
                products.set(productSku, {
                    rowNumber,
                    sku: productSku,
                    name: row.product_name,
                    description: row.product_description || undefined,
                    productReference: row.product_reference || undefined,
                    requiresInvima: Boolean(requiresInvima),
                    invimaRegistrationCode: row.invima_registration_code || undefined,
                });
                continue;
            }

            if (!row.variant_sku) {
                errors.push({ rowNumber, message: 'variant_sku es obligatorio para filas VARIANT' });
                continue;
            }
            const variantSku = row.variant_sku.toUpperCase();
            if (variantSkuSet.has(variantSku)) {
                errors.push({ rowNumber, message: `SKU de variante duplicado en archivo: ${variantSku}` });
                continue;
            }
            variantSkuSet.add(variantSku);
            if (!row.variant_name) {
                errors.push({ rowNumber, message: 'variant_name es obligatorio para filas VARIANT' });
                continue;
            }
            const price = this.parseNumber(row.variant_price);
            const laborCost = this.parseNumber(row.variant_labor_cost);
            const indirectCost = this.parseNumber(row.variant_indirect_cost);
            const targetMargin = this.parseNumber(row.variant_target_margin);
            const productionMinutes = this.parseNumber(row.variant_production_minutes);

            if (price === undefined || price < 0) {
                errors.push({ rowNumber, message: 'variant_price debe ser numérico y >= 0' });
                continue;
            }
            if (laborCost === undefined || laborCost < 0) {
                errors.push({ rowNumber, message: 'variant_labor_cost debe ser numérico y >= 0' });
                continue;
            }
            if (indirectCost === undefined || indirectCost < 0) {
                errors.push({ rowNumber, message: 'variant_indirect_cost debe ser numérico y >= 0' });
                continue;
            }
            if (targetMargin === undefined || targetMargin < 0 || targetMargin > 1) {
                errors.push({ rowNumber, message: 'variant_target_margin debe estar entre 0 y 1' });
                continue;
            }
            if (productionMinutes !== undefined && productionMinutes < 0) {
                errors.push({ rowNumber, message: 'variant_production_minutes no puede ser negativo' });
                continue;
            }

            variants.push({
                rowNumber,
                productSku,
                sku: variantSku,
                name: row.variant_name,
                price,
                laborCost,
                indirectCost,
                targetMargin,
                productionMinutes,
            });
        }

        for (const variant of variants) {
            if (!products.has(variant.productSku)) {
                errors.push({
                    rowNumber: variant.rowNumber,
                    message: `La variante ${variant.sku} referencia product_sku inexistente en archivo: ${variant.productSku}`,
                });
            }
        }

        return {
            products: Array.from(products.values()),
            variants,
            errors,
            totalRows: lines.length - 1,
        };
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
        const { invimaRegistrationId, categoryId, ...productData } = data;
        let invimaRegistration: InvimaRegistration | undefined;
        let category: ProductGroup | undefined;
        if (invimaRegistrationId) {
            invimaRegistration = await this.invimaRepo.findOneOrFail({ id: invimaRegistrationId });
            if (invimaRegistration.status !== InvimaRegistrationStatus.ACTIVO) {
                throw new AppError('El registro INVIMA seleccionado no está activo', 400);
            }
        }
        if (categoryId) {
            category = await this.productGroupRepo.findOneOrFail({ id: categoryId });
        }

        if (productData.requiresInvima && !invimaRegistration) {
            throw new AppError('Debes seleccionar un registro INVIMA para productos regulados', 400);
        }

        const product = this.productRepo.create({
            ...productData,
            category,
            invimaRegistration,
        } as unknown as Product);
        await this.em.persistAndFlush(product);
        await this.logAudit('product', product.id, 'created', this.buildProductSnapshot(product));
        return this.productRepo.findOneOrFail({ id: product.id }, { populate: ['invimaRegistration', 'variants', 'category', 'images'] });
    }

    async createProductGroup(data: z.infer<typeof ProductGroupSchema>): Promise<ProductGroup> {
        const parent = data.parentId
            ? await this.productGroupRepo.findOneOrFail({ id: data.parentId })
            : undefined;
        const slug = await this.resolveUniqueGroupSlug(data.slug || data.name);
        const row = this.productGroupRepo.create({
            name: data.name.trim(),
            slug,
            description: data.description?.trim() || undefined,
            parent,
            sortOrder: Number(data.sortOrder || 0),
            active: data.active ?? true,
        } as ProductGroup);
        await this.em.persistAndFlush(row);
        await this.logAudit('product_group', row.id, 'created', {
            name: row.name,
            slug: row.slug,
            parentId: row.parent?.id,
            active: row.active,
        });
        return this.productGroupRepo.findOneOrFail({ id: row.id }, { populate: ['parent'] });
    }

    async listProductGroups(filters?: z.infer<typeof ListProductGroupsQuerySchema>): Promise<ProductGroup[]> {
        const where: FilterQuery<ProductGroup> = {};
        if (filters?.activeOnly) {
            where.active = true;
        }
        return this.productGroupRepo.find(where, {
            populate: ['parent'],
            orderBy: [{ sortOrder: 'ASC' }, { name: 'ASC' }],
        });
    }

    async updateProductGroup(id: string, data: z.infer<typeof UpdateProductGroupSchema>): Promise<ProductGroup> {
        const row = await this.productGroupRepo.findOneOrFail({ id }, { populate: ['parent'] });
        let parent = row.parent;
        if ('parentId' in data) {
            if (data.parentId) {
                await this.assertValidGroupParent(id, data.parentId);
                parent = await this.productGroupRepo.findOneOrFail({ id: data.parentId });
            } else {
                parent = undefined;
            }
        }
        if (data.slug !== undefined || data.name !== undefined) {
            row.slug = await this.resolveUniqueGroupSlug(data.slug || data.name || row.name, row.id);
        }
        if (data.name !== undefined) row.name = data.name.trim();
        if (data.description !== undefined) row.description = data.description?.trim() || undefined;
        row.parent = parent;
        if (data.sortOrder !== undefined) row.sortOrder = Number(data.sortOrder);
        if (data.active !== undefined) row.active = data.active;
        await this.em.persistAndFlush(row);
        await this.logAudit('product_group', row.id, 'updated', {
            name: row.name,
            slug: row.slug,
            parentId: row.parent?.id,
            active: row.active,
        });
        return this.productGroupRepo.findOneOrFail({ id: row.id }, { populate: ['parent'] });
    }

    async deleteProductGroup(id: string): Promise<void> {
        const row = await this.productGroupRepo.findOneOrFail({ id }, { populate: ['children', 'products'] });
        if (row.children.length > 0) {
            throw new AppError('No puedes eliminar un grupo que tiene subgrupos', 409);
        }
        if (row.products.length > 0) {
            throw new AppError('No puedes eliminar un grupo asignado a productos', 409);
        }
        await this.logAudit('product_group', row.id, 'deleted', {
            name: row.name,
            slug: row.slug,
        });
        await this.em.removeAndFlush(row);
    }

    async updateProduct(id: string, data: z.infer<typeof UpdateProductSchema>): Promise<Product> {
        const product = await this.productRepo.findOneOrFail({ id }, { populate: ['invimaRegistration', 'category'] });
        let invimaRegistration = product.invimaRegistration;
        let category = product.category;
        const { invimaRegistrationId, categoryId, ...productData } = data;

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
        if ('categoryId' in data) {
            if (categoryId) {
                category = await this.productGroupRepo.findOneOrFail({ id: categoryId });
            } else {
                category = undefined;
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

        const before = this.buildProductSnapshot(product);
        this.productRepo.assign(product, {
            ...productData,
            category,
            invimaRegistration,
        });
        await this.em.persistAndFlush(product);
        const after = this.buildProductSnapshot(product);
        await this.logAudit('product', product.id, 'updated', { before, after });
        return this.productRepo.findOneOrFail({ id: product.id }, { populate: ['invimaRegistration', 'variants', 'category', 'images'] });
    }

    async deleteProduct(id: string): Promise<void> {
        const product = await this.productRepo.findOneOrFail({ id }, { populate: ['variants', 'variants.bomItems', 'images'] });
        const images = product.images?.getItems() ?? [];
        for (const image of images) {
            await this.storageService.deleteObject(image.filePath);
        }
        await this.logAudit('product', product.id, 'deleted', {
            sku: product.sku,
            name: product.name,
        });
        await this.em.removeAndFlush(product);
    }

    async createVariant(productId: string, data: Partial<ProductVariant>): Promise<ProductVariant> {
        const product = await this.productRepo.findOneOrFail({ id: productId });
        const variant = this.variantRepo.create({ ...this.enrichVariantPricing(data), product } as unknown as ProductVariant);
        await this.em.persistAndFlush(variant);
        await this.calculateVariantCost(variant.id);
        await this.logAudit('product_variant', variant.id, 'created', this.buildVariantSnapshot(variant));
        return variant;
    }

    async updateVariant(variantId: string, data: Partial<ProductVariant>): Promise<ProductVariant> {
        const variant = await this.variantRepo.findOneOrFail({ id: variantId }, { populate: ['product'] });
        const before = this.buildVariantSnapshot(variant);
        this.variantRepo.assign(variant, this.enrichVariantPricing(data, variant));
        await this.em.persistAndFlush(variant);
        await this.calculateVariantCost(variant.id);
        const refreshed = await this.variantRepo.findOneOrFail({ id: variantId }, { populate: ['product'] });
        const after = this.buildVariantSnapshot(refreshed);
        await this.logAudit('product_variant', variantId, 'updated', { before, after });
        if (Number(before.price) !== Number(after.price)) {
            await this.logAudit('product_variant', variantId, 'price_updated', {
                sku: after.sku,
                productId: after.productId,
                previousPrice: before.price,
                price: after.price,
            });
        }
        return variant;
    }

    async deleteVariant(variantId: string): Promise<void> {
        const variant = await this.variantRepo.findOneOrFail({ id: variantId }, { populate: ['bomItems', 'product'] });
        await this.logAudit('product_variant', variant.id, 'deleted', {
            sku: variant.sku,
            name: variant.name,
            productId: (variant.product as Product | undefined)?.id,
        });
        await this.em.removeAndFlush(variant);
    }

    async getProduct(id: string): Promise<Product | null> {
        return this.productRepo.findOne({ id }, { populate: ['variants', 'invimaRegistration', 'category', 'images'] });
    }

    async listProducts(page = 1, limit = 10, search?: string, categoryId?: string): Promise<{ products: Product[]; total: number }> {
        const filters: FilterQuery<Product> = {};
        if (search && search.trim().length > 0) {
            filters.$or = [
                { name: { $ilike: `%${search.trim()}%` } },
                { sku: { $ilike: `%${search.trim()}%` } },
                { productReference: { $ilike: `%${search.trim()}%` } },
            ];
        }
        if (categoryId) {
            filters.category = categoryId;
        }

        const [products, total] = await this.productRepo.findAndCount(
            filters,
            {
                limit,
                offset: (page - 1) * limit,
                orderBy: { name: 'ASC' },
                populate: ['variants', 'invimaRegistration', 'category'],
            }
        );
        return { products, total };
    }

    async uploadProductImage(productId: string, payload: z.infer<typeof UploadProductImageSchema>): Promise<ProductImage> {
        const product = await this.productRepo.findOneOrFail({ id: productId });
        const buffer = this.decodeBase64Data(payload.base64Data);
        const maxBytes = 8 * 1024 * 1024; // 8 MB
        if (buffer.length === 0 || buffer.length > maxBytes) {
            throw new AppError('La imagen debe tener entre 1 byte y 8 MB', 400);
        }
        if (!payload.mimeType.toLowerCase().startsWith('image/')) {
            throw new AppError('El archivo debe ser una imagen válida', 400);
        }

        const folderPrefix = `products/${product.id}`;
        const persisted = await this.storageService.saveObject({
            fileName: payload.fileName,
            mimeType: payload.mimeType,
            buffer,
            folderPrefix,
        });

        const image = this.productImageRepo.create({
            product,
            fileName: payload.fileName,
            fileMime: payload.mimeType,
            filePath: persisted.storagePath,
            sortOrder: Number(payload.sortOrder || 0),
        } as unknown as ProductImage);
        await this.em.persistAndFlush(image);
        await this.logAudit('product', product.id, 'image_uploaded', {
            fileName: image.fileName,
            sortOrder: image.sortOrder,
        });
        return image;
    }

    async readProductImage(productId: string, imageId: string): Promise<{ fileName: string; mimeType: string; buffer: Buffer }> {
        const image = await this.productImageRepo.findOneOrFail({ id: imageId }, { populate: ['product'] });
        if (image.product.id !== productId) {
            throw new AppError('Imagen no encontrada para este producto', 404);
        }
        const buffer = await this.storageService.readObject(image.filePath);
        return {
            fileName: image.fileName,
            mimeType: image.fileMime || 'application/octet-stream',
            buffer,
        };
    }

    async deleteProductImage(productId: string, imageId: string): Promise<void> {
        const image = await this.productImageRepo.findOneOrFail({ id: imageId }, { populate: ['product'] });
        if (image.product.id !== productId) {
            throw new AppError('Imagen no encontrada para este producto', 404);
        }
        await this.logAudit('product', image.product.id, 'image_deleted', {
            fileName: image.fileName,
        });
        await this.storageService.deleteObject(image.filePath);
        await this.em.removeAndFlush(image);
    }

    async exportProductsCsv(): Promise<{ fileName: string; content: string }> {
        const products = await this.productRepo.findAll({
            populate: ['variants', 'invimaRegistration'],
            orderBy: { sku: 'ASC' },
        });
        const rows: string[] = [this.toCsvRow(this.productImportHeaders)];
        for (const product of products) {
            rows.push(this.toCsvRow([
                'PRODUCT',
                product.sku,
                product.name,
                product.description,
                product.productReference,
                product.requiresInvima,
                product.invimaRegistration?.code,
                '',
                '',
                '',
                '',
                '',
                '',
                '',
            ]));

            const variants = product.variants.getItems().sort((a, b) => a.sku.localeCompare(b.sku));
            for (const variant of variants) {
                rows.push(this.toCsvRow([
                    'VARIANT',
                    product.sku,
                    '',
                    '',
                    '',
                    '',
                    '',
                    variant.sku,
                    variant.name,
                    variant.price,
                    variant.laborCost,
                    variant.indirectCost,
                    variant.targetMargin,
                    variant.productionMinutes,
                ]));
            }
        }
        return {
            fileName: `productos_variantes_${new Date().toISOString().slice(0, 10)}.csv`,
            content: rows.join('\n'),
        };
    }

    async getProductImportTemplateCsv(): Promise<{ fileName: string; content: string }> {
        const rows: string[] = [this.toCsvRow(this.productImportHeaders)];
        rows.push(this.toCsvRow([
            'PRODUCT',
            'PROD-EJ-001',
            'Producto ejemplo',
            'Descripción opcional',
            'REF-001',
            'false',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
        ]));
        rows.push(this.toCsvRow([
            'VARIANT',
            'PROD-EJ-001',
            '',
            '',
            '',
            '',
            '',
            'VAR-EJ-001-A',
            'Variante A',
            '150000',
            '5000',
            '3500',
            '0.40',
            '12',
        ]));
        rows.push(this.toCsvRow([
            'VARIANT',
            'PROD-EJ-001',
            '',
            '',
            '',
            '',
            '',
            'VAR-EJ-001-B',
            'Variante B',
            '165000',
            '5200',
            '3600',
            '0.40',
            '13.5',
        ]));
        return {
            fileName: 'plantilla_productos_variantes.csv',
            content: rows.join('\n'),
        };
    }

    async previewProductImportCsv(csvText: string) {
        const parsed = this.parseProductImportCsv(csvText);
        const [existingProducts, existingVariants] = await Promise.all([
            this.productRepo.find({ sku: { $in: parsed.products.map((row) => row.sku) } }),
            this.variantRepo.find({ sku: { $in: parsed.variants.map((row) => row.sku) } }),
        ]);
        const existingProductSet = new Set(existingProducts.map((row) => row.sku.toUpperCase()));
        const existingVariantSet = new Set(existingVariants.map((row) => row.sku.toUpperCase()));

        const productsToCreate = parsed.products.filter((row) => !existingProductSet.has(row.sku)).length;
        const productsToUpdate = parsed.products.length - productsToCreate;
        const variantsToCreate = parsed.variants.filter((row) => !existingVariantSet.has(row.sku)).length;
        const variantsToUpdate = parsed.variants.length - variantsToCreate;

        return {
            summary: {
                totalRows: parsed.totalRows,
                productsInFile: parsed.products.length,
                variantsInFile: parsed.variants.length,
                productsToCreate,
                productsToUpdate,
                variantsToCreate,
                variantsToUpdate,
                errorCount: parsed.errors.length,
            },
            errors: parsed.errors.slice(0, 200),
        };
    }

    async importProductCsv(csvText: string, actor?: string) {
        const preview = await this.previewProductImportCsv(csvText);
        if (preview.summary.errorCount > 0) {
            throw new AppError(`El archivo tiene ${preview.summary.errorCount} errores. Corrige y vuelve a intentar.`, 400);
        }
        const parsed = this.parseProductImportCsv(csvText);

        const result = await this.em.transactional(async (tx) => {
            const productRepo = tx.getRepository(Product);
            const variantRepo = tx.getRepository(ProductVariant);
            const invimaRepo = tx.getRepository(InvimaRegistration);
            const changedVariantIds: string[] = [];

            const productMap = new Map<string, Product>();
            for (const row of parsed.products) {
                let invimaRegistration: InvimaRegistration | undefined;
                if (row.invimaRegistrationCode) {
                    invimaRegistration = await invimaRepo.findOne({
                        code: row.invimaRegistrationCode.toUpperCase(),
                        status: InvimaRegistrationStatus.ACTIVO,
                    }) || undefined;
                    if (!invimaRegistration) {
                        throw new AppError(`Registro INVIMA no encontrado/activo: ${row.invimaRegistrationCode} (fila ${row.rowNumber})`, 400);
                    }
                }
                if (row.requiresInvima && !invimaRegistration) {
                    throw new AppError(`Producto regulado requiere invima_registration_code (fila ${row.rowNumber})`, 400);
                }

                let product = await productRepo.findOne({ sku: row.sku }, { populate: ['invimaRegistration'] });
                if (!product) {
                    product = productRepo.create({
                        sku: row.sku,
                        name: row.name,
                        description: row.description,
                        requiresInvima: row.requiresInvima,
                        productReference: row.productReference,
                        invimaRegistration,
                    } as unknown as Product);
                } else {
                    product.name = row.name;
                    product.description = row.description;
                    product.requiresInvima = row.requiresInvima;
                    product.productReference = row.productReference;
                    product.invimaRegistration = invimaRegistration;
                }
                tx.persist(product);
                productMap.set(row.sku, product);
            }

            for (const row of parsed.variants) {
                const parent = productMap.get(row.productSku);
                if (!parent) {
                    throw new AppError(`Producto base no encontrado para variante ${row.sku} (fila ${row.rowNumber})`, 400);
                }
                let variant = await variantRepo.findOne({ sku: row.sku }, { populate: ['product'] });
                if (!variant) {
                    variant = variantRepo.create({
                        product: parent,
                        sku: row.sku,
                        name: row.name,
                        ...this.enrichVariantPricing({
                            price: row.price,
                        }),
                        laborCost: row.laborCost,
                        indirectCost: row.indirectCost,
                        targetMargin: row.targetMargin,
                        productionMinutes: row.productionMinutes,
                    } as unknown as ProductVariant);
                } else {
                    variant.product = parent;
                    variant.name = row.name;
                    const pricing = this.enrichVariantPricing({ price: row.price }, variant);
                    variant.price = pricing.price ?? variant.price;
                    variant.pvpMargin = pricing.pvpMargin ?? variant.pvpMargin;
                    variant.pvpPrice = pricing.pvpPrice ?? variant.pvpPrice;
                    variant.laborCost = row.laborCost;
                    variant.indirectCost = row.indirectCost;
                    variant.targetMargin = row.targetMargin;
                    variant.productionMinutes = row.productionMinutes;
                }
                tx.persist(variant);
                changedVariantIds.push(variant.id);
            }

            await tx.flush();

            return {
                actor,
                changedVariantIds,
                ...preview.summary,
            };
        });
        for (const variantId of result.changedVariantIds) {
            await this.calculateVariantCost(variantId);
        }
        const response = {
            actor: result.actor,
            ...preview.summary,
        };
        await this.logAudit('product_catalog', 'import', 'catalog_imported', {
            productsToCreate: response.productsToCreate,
            productsToUpdate: response.productsToUpdate,
            variantsToCreate: response.variantsToCreate,
            variantsToUpdate: response.variantsToUpdate,
            totalRows: response.totalRows,
        });
        return response;
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
