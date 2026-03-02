import { EntityManager, EntityRepository, FilterQuery } from '@mikro-orm/core';
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

    async listProducts(page = 1, limit = 10, search?: string): Promise<{ products: Product[]; total: number }> {
        const filters: FilterQuery<Product> = {};
        if (search && search.trim().length > 0) {
            filters.$or = [
                { name: { $ilike: `%${search.trim()}%` } },
                { sku: { $ilike: `%${search.trim()}%` } },
                { productReference: { $ilike: `%${search.trim()}%` } },
            ];
        }

        const [products, total] = await this.productRepo.findAndCount(
            filters,
            {
                limit,
                offset: (page - 1) * limit,
                orderBy: { name: 'ASC' },
                populate: ['variants', 'invimaRegistration'],
            }
        );
        return { products, total };
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
                        price: row.price,
                        laborCost: row.laborCost,
                        indirectCost: row.indirectCost,
                        targetMargin: row.targetMargin,
                        productionMinutes: row.productionMinutes,
                    } as unknown as ProductVariant);
                } else {
                    variant.product = parent;
                    variant.name = row.name;
                    variant.price = row.price;
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
        return {
            actor: result.actor,
            ...preview.summary,
        };
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
