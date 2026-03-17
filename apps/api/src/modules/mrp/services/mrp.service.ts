import { EntityManager, EntityRepository, FilterQuery } from '@mikro-orm/core';
import { RawMaterial } from '../entities/raw-material.entity';
import { BOMItem } from '../entities/bom-item.entity';
import { ProductVariant } from '../entities/product-variant.entity';
import { SupplierMaterial } from '../entities/supplier-material.entity';
import { OperationalConfig } from '../entities/operational-config.entity';
import { Supplier } from '../entities/supplier.entity';
import { RawMaterialSpecification } from '../entities/raw-material-specification.entity';
import { PurchasePresentation } from '../entities/purchase-presentation.entity';
import { QualityAuditEvent } from '../entities/quality-audit-event.entity';
import { RawMaterialSchema, BOMItemSchema } from '@scaffold/schemas';
import { z } from 'zod';
import { UnitType } from '@scaffold/types';
import { AppError } from '../../../shared/utils/response';

export class MrpService {
    private readonly em: EntityManager;
    private readonly rawMaterialRepo: EntityRepository<RawMaterial>;
    private readonly bomItemRepo: EntityRepository<BOMItem>;
    private readonly variantRepo: EntityRepository<ProductVariant>;
    private readonly rawMaterialSpecificationRepo: EntityRepository<RawMaterialSpecification>;
    private readonly purchasePresentationRepo: EntityRepository<PurchasePresentation>;
    private readonly auditRepo: EntityRepository<QualityAuditEvent>;

    constructor(em: EntityManager) {
        this.em = em;
        this.rawMaterialRepo = em.getRepository(RawMaterial);
        this.bomItemRepo = em.getRepository(BOMItem);
        this.variantRepo = em.getRepository(ProductVariant);
        this.rawMaterialSpecificationRepo = em.getRepository(RawMaterialSpecification);
        this.purchasePresentationRepo = em.getRepository(PurchasePresentation);
        this.auditRepo = em.getRepository(QualityAuditEvent);
    }

    private async logAudit(entityId: string, action: string, metadata?: Record<string, unknown>) {
        const event = this.auditRepo.create({
            entityType: 'bom_item',
            entityId,
            action,
            metadata,
        } as unknown as QualityAuditEvent);
        await this.em.persistAndFlush(event);
    }

    private async syncRawMaterialSpecifications(
        material: RawMaterial,
        items: z.infer<typeof RawMaterialSchema>['specifications'] | undefined
    ) {
        if (items === undefined) return;

        const existing = material.specifications.getItems();
        const byId = new Map(existing.map((row) => [row.id, row]));
        const nextEntities: RawMaterialSpecification[] = [];

        for (const [index, item] of items.entries()) {
            const entity = item.id ? byId.get(item.id) : undefined;
            const specification = entity || this.rawMaterialSpecificationRepo.create({
                rawMaterial: material,
            } as RawMaterialSpecification);

            specification.name = item.name;
            specification.sku = item.sku;
            specification.description = item.description?.trim() || undefined;
            specification.color = item.color?.trim() || undefined;
            specification.widthCm = item.widthCm;
            specification.lengthValue = item.lengthValue;
            specification.lengthUnit = item.lengthUnit;
            specification.thicknessMm = item.thicknessMm;
            specification.grammageGsm = item.grammageGsm;
            specification.isDefault = item.isDefault ?? index === 0;
            specification.notes = item.notes?.trim() || undefined;
            specification.rawMaterial = material;
            nextEntities.push(specification);
        }

        if (nextEntities.filter((row) => row.isDefault).length > 1) {
            let first = true;
            for (const row of nextEntities) {
                row.isDefault = first && row.isDefault;
                if (row.isDefault) first = false;
            }
        }
        if (nextEntities.length > 0 && !nextEntities.some((row) => row.isDefault)) {
            nextEntities[0].isDefault = true;
        }

        const removed = existing.filter((row) => !nextEntities.includes(row));
        material.specifications.set(nextEntities);
        if (removed.length > 0) {
            await this.em.removeAndFlush(removed);
        }
    }

    private async syncPurchasePresentations(
        material: RawMaterial,
        items: z.infer<typeof RawMaterialSchema>['purchasePresentations'] | undefined
    ) {
        if (items === undefined) return;

        const existing = material.purchasePresentations.getItems();
        const byId = new Map(existing.map((row) => [row.id, row]));
        const specificationMap = new Map(material.specifications.getItems().map((row) => [row.id, row]));
        const nextEntities: PurchasePresentation[] = [];

        for (const [index, item] of items.entries()) {
            const entity = item.id ? byId.get(item.id) : undefined;
            const presentation = entity || this.purchasePresentationRepo.create({
                rawMaterial: material,
            } as PurchasePresentation);

            presentation.name = item.name;
            presentation.purchaseUnitLabel = item.purchaseUnitLabel.trim();
            presentation.quantityPerPurchaseUnit = item.quantityPerPurchaseUnit;
            presentation.contentUnit = item.contentUnit;
            presentation.allowsFractionalQuantity = item.allowsFractionalQuantity ?? false;
            presentation.isDefault = item.isDefault ?? index === 0;
            presentation.notes = item.notes?.trim() || undefined;
            presentation.rawMaterial = material;
            presentation.supplier = item.supplierId
                ? await this.em.findOneOrFail(Supplier, { id: item.supplierId })
                : undefined;
            presentation.specification = item.specificationId
                ? (specificationMap.get(item.specificationId) || await this.em.findOneOrFail(RawMaterialSpecification, { id: item.specificationId, rawMaterial: material.id }))
                : undefined;
            nextEntities.push(presentation);
        }

        if (nextEntities.filter((row) => row.isDefault).length > 1) {
            let first = true;
            for (const row of nextEntities) {
                row.isDefault = first && row.isDefault;
                if (row.isDefault) first = false;
            }
        }
        if (nextEntities.length > 0 && !nextEntities.some((row) => row.isDefault)) {
            nextEntities[0].isDefault = true;
        }

        const removed = existing.filter((row) => !nextEntities.includes(row));
        material.purchasePresentations.set(nextEntities);
        if (removed.length > 0) {
            await this.em.removeAndFlush(removed);
        }
    }

    private readonly rawMaterialImportHeaders = [
        'name',
        'sku',
        'unit',
        'cost',
        'min_stock_level',
        'supplier_name',
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

    private parseRawMaterialImportCsv(csvText: string) {
        const lines = csvText
            .replace(/\r/g, '')
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        if (lines.length <= 1) {
            throw new AppError('El CSV no contiene filas de datos', 400);
        }

        const expected = [...this.rawMaterialImportHeaders];
        const header = this.parseCsvLine(lines[0]).map((h) => h.toLowerCase());
        const invalidHeader = expected.some((key, idx) => header[idx] !== key);
        if (invalidHeader) {
            throw new AppError(`Encabezado CSV inválido. Debe ser: ${expected.join(', ')}`, 400);
        }

        const rows: Array<{
            rowNumber: number;
            name: string;
            sku: string;
            unit: UnitType;
            cost: number;
            minStockLevel: number;
            supplierName?: string;
        }> = [];
        const errors: Array<{ rowNumber: number; message: string }> = [];
        const skusInFile = new Set<string>();
        const unitValues = new Set(Object.values(UnitType));

        for (let index = 1; index < lines.length; index += 1) {
            const rowNumber = index + 1;
            const values = this.parseCsvLine(lines[index]);
            const row = Object.fromEntries(
                expected.map((key, keyIndex) => [key, (values[keyIndex] || '').trim()])
            ) as Record<(typeof expected)[number], string>;

            const name = row.name.trim();
            const sku = row.sku.trim().toUpperCase();
            const unit = row.unit.trim().toLowerCase() as UnitType;
            const cost = Number.parseFloat(row.cost);
            const minStockLevelRaw = row.min_stock_level.trim();
            const minStockLevel = minStockLevelRaw ? Number.parseFloat(minStockLevelRaw) : 0;
            const supplierName = row.supplier_name.trim() || undefined;

            if (!name) {
                errors.push({ rowNumber, message: 'name es obligatorio' });
                continue;
            }
            if (!sku) {
                errors.push({ rowNumber, message: 'sku es obligatorio' });
                continue;
            }
            if (skusInFile.has(sku)) {
                errors.push({ rowNumber, message: `SKU duplicado en archivo: ${sku}` });
                continue;
            }
            skusInFile.add(sku);

            if (!unitValues.has(unit)) {
                errors.push({ rowNumber, message: `unit inválido (${row.unit}). Valores válidos: ${Array.from(unitValues).join(', ')}` });
                continue;
            }
            if (!Number.isFinite(cost) || cost < 0) {
                errors.push({ rowNumber, message: 'cost debe ser un número mayor o igual a 0' });
                continue;
            }
            if (!Number.isFinite(minStockLevel) || minStockLevel < 0) {
                errors.push({ rowNumber, message: 'min_stock_level debe ser un número mayor o igual a 0' });
                continue;
            }

            rows.push({
                rowNumber,
                name,
                sku,
                unit,
                cost,
                minStockLevel,
                supplierName,
            });
        }

        return { rows, errors, totalRows: lines.length - 1 };
    }

    async createRawMaterial(data: z.infer<typeof RawMaterialSchema>): Promise<RawMaterial> {
        const { supplierId, specifications, purchasePresentations, ...rest } = data;
        const material = this.rawMaterialRepo.create(rest as unknown as RawMaterial);
        if (supplierId) {
            material.supplier = await this.em.findOneOrFail(Supplier, { id: supplierId });
        }
        await this.syncRawMaterialSpecifications(material, specifications);
        await this.syncPurchasePresentations(material, purchasePresentations);
        await this.em.persistAndFlush(material);

        if (material.supplier) {
            // Create SupplierMaterial link
            const supplierMaterialRepo = this.em.getRepository(SupplierMaterial);
            const link = supplierMaterialRepo.create({
                supplier: material.supplier,
                rawMaterial: material,
                lastPurchasePrice: material.cost,
                lastPurchaseDate: new Date()
            } as unknown as SupplierMaterial);
            await this.em.persistAndFlush(link);
        }

        return material;
    }

    async getRawMaterial(id: string): Promise<RawMaterial> {
        return this.rawMaterialRepo.findOneOrFail(
            { id },
            { populate: ['supplier', 'specifications', 'purchasePresentations', 'purchasePresentations.supplier', 'purchasePresentations.specification'] }
        );
    }

    async updateRawMaterial(id: string, data: Partial<z.infer<typeof RawMaterialSchema>>): Promise<RawMaterial> {
        const material = await this.getRawMaterial(id);
        const oldCost = material.cost;
        const { supplierId, specifications, purchasePresentations, ...rest } = data;
        Object.assign(material, rest);

        if (supplierId !== undefined) {
            material.supplier = supplierId
                ? await this.em.findOneOrFail(Supplier, { id: supplierId })
                : undefined;
        }

        await this.syncRawMaterialSpecifications(material, specifications);
        await this.syncPurchasePresentations(material, purchasePresentations);

        await this.em.persistAndFlush(material);

        if (material.supplier) {
            const supplierMaterialRepo = this.em.getRepository(SupplierMaterial);
            let link = await supplierMaterialRepo.findOne({
                supplier: material.supplier.id,
                rawMaterial: material.id,
            });
            if (!link) {
                link = supplierMaterialRepo.create({
                    supplier: material.supplier,
                    rawMaterial: material,
                    lastPurchasePrice: material.lastPurchasePrice ?? material.cost,
                    lastPurchaseDate: material.lastPurchaseDate ?? new Date(),
                } as unknown as SupplierMaterial);
                await this.em.persistAndFlush(link);
            }
        }

        // If cost changed, recalculate affected variants
        if (data.cost !== undefined && data.cost !== oldCost) {
            await this.recalculateVariantsByMaterial(id);
        }

        return material;
    }

    async listRawMaterials(page = 1, limit = 10, search?: string): Promise<{ materials: RawMaterial[]; total: number }> {
        const filters: FilterQuery<RawMaterial> = {};
        if (search) {
            filters.$or = [
                { name: { $ilike: `%${search}%` } },
                { sku: { $ilike: `%${search}%` } }
            ];
        }

        const [materials, total] = await this.rawMaterialRepo.findAndCount(
            filters,
            {
                limit,
                offset: (page - 1) * limit,
                orderBy: { name: 'ASC' },
                populate: ['supplier']
            }
        );
        await this.em.populate(materials, ['specifications', 'purchasePresentations', 'purchasePresentations.supplier', 'purchasePresentations.specification']);
        return { materials, total };
    }

    async exportRawMaterialsCsv(): Promise<{ fileName: string; content: string }> {
        const materials = await this.rawMaterialRepo.findAll({
            populate: ['supplier'],
            orderBy: { name: 'ASC' },
        });
        const rows: string[] = [this.toCsvRow(this.rawMaterialImportHeaders)];
        for (const material of materials) {
            rows.push(this.toCsvRow([
                material.name,
                material.sku,
                material.unit,
                material.cost,
                material.minStockLevel ?? 0,
                material.supplier?.name,
            ]));
        }
        return {
            fileName: `materias_primas_${new Date().toISOString().slice(0, 10)}.csv`,
            content: rows.join('\n'),
        };
    }

    async getRawMaterialImportTemplateCsv(): Promise<{ fileName: string; content: string }> {
        const rows: string[] = [this.toCsvRow(this.rawMaterialImportHeaders)];
        rows.push(this.toCsvRow([
            'Tela antialergica 150cm',
            'TELA-150-A',
            UnitType.METER,
            '12000',
            '50',
            'Proveedor Ejemplo SAS',
        ]));
        rows.push(this.toCsvRow([
            'Espuma densidad 26',
            'ESP-026',
            UnitType.KG,
            '18000',
            '20',
            '',
        ]));
        return {
            fileName: 'plantilla_materias_primas.csv',
            content: rows.join('\n'),
        };
    }

    async previewRawMaterialImportCsv(csvText: string): Promise<{
        summary: {
            totalRows: number;
            materialsInFile: number;
            materialsToCreate: number;
            materialsToUpdate: number;
            errorCount: number;
        };
        errors: Array<{ rowNumber: number; message: string }>;
    }> {
        const parsed = this.parseRawMaterialImportCsv(csvText);
        const [existingMaterials, suppliers] = await Promise.all([
            this.rawMaterialRepo.find({ sku: { $in: parsed.rows.map((row) => row.sku) } }),
            this.em.getRepository(Supplier).findAll(),
        ]);
        const existingSkuSet = new Set(existingMaterials.map((row) => row.sku.trim().toUpperCase()));
        const supplierByName = new Map(suppliers.map((row) => [row.name.trim().toUpperCase(), row]));
        const supplierErrors: Array<{ rowNumber: number; message: string }> = [];

        for (const row of parsed.rows) {
            if (!row.supplierName) continue;
            const supplier = supplierByName.get(row.supplierName.trim().toUpperCase());
            if (!supplier) {
                supplierErrors.push({
                    rowNumber: row.rowNumber,
                    message: `supplier_name no encontrado: ${row.supplierName}`,
                });
            }
        }

        const materialsToCreate = parsed.rows.filter((row) => !existingSkuSet.has(row.sku)).length;
        const materialsToUpdate = parsed.rows.length - materialsToCreate;
        const allErrors = [...parsed.errors, ...supplierErrors];

        return {
            summary: {
                totalRows: parsed.totalRows,
                materialsInFile: parsed.rows.length,
                materialsToCreate,
                materialsToUpdate,
                errorCount: allErrors.length,
            },
            errors: allErrors.slice(0, 200),
        };
    }

    async importRawMaterialsCsv(csvText: string, actor?: string): Promise<{
        actor?: string;
        materialsToCreate: number;
        materialsToUpdate: number;
    }> {
        const preview = await this.previewRawMaterialImportCsv(csvText);
        if (preview.summary.errorCount > 0) {
            throw new AppError(`El archivo tiene ${preview.summary.errorCount} errores. Corrige y vuelve a intentar.`, 400);
        }

        const parsed = this.parseRawMaterialImportCsv(csvText);
        const changedMaterialIds = new Set<string>();

        await this.em.transactional(async (tx) => {
            const rawMaterialRepo = tx.getRepository(RawMaterial);
            const supplierRepo = tx.getRepository(Supplier);
            const supplierMaterialRepo = tx.getRepository(SupplierMaterial);

            const existingMaterials = await rawMaterialRepo.find({
                sku: { $in: parsed.rows.map((row) => row.sku) },
            }, { populate: ['supplier'] });
            const materialBySku = new Map(existingMaterials.map((row) => [row.sku.trim().toUpperCase(), row]));

            const supplierNames = parsed.rows
                .map((row) => row.supplierName?.trim().toUpperCase())
                .filter((name): name is string => Boolean(name));
            const suppliers = supplierNames.length
                ? await supplierRepo.findAll()
                : [];
            const supplierByName = new Map(suppliers.map((row) => [row.name.trim().toUpperCase(), row]));

            for (const row of parsed.rows) {
                const existing = materialBySku.get(row.sku);
                const supplier = row.supplierName
                    ? supplierByName.get(row.supplierName.trim().toUpperCase())
                    : undefined;

                if (row.supplierName && !supplier) {
                    throw new AppError(`supplier_name no encontrado: ${row.supplierName} (fila ${row.rowNumber})`, 400);
                }

                if (existing) {
                    const oldCost = Number(existing.cost);
                    existing.name = row.name;
                    existing.unit = row.unit;
                    existing.cost = row.cost;
                    existing.minStockLevel = row.minStockLevel;
                    existing.supplier = supplier;
                    tx.persist(existing);

                    if (oldCost !== row.cost) {
                        changedMaterialIds.add(existing.id);
                    }

                    if (supplier) {
                        let link = await supplierMaterialRepo.findOne({
                            supplier: supplier.id,
                            rawMaterial: existing.id,
                        });
                        if (!link) {
                            link = supplierMaterialRepo.create({
                                supplier,
                                rawMaterial: existing,
                                lastPurchasePrice: existing.lastPurchasePrice ?? existing.cost,
                                lastPurchaseDate: existing.lastPurchaseDate ?? new Date(),
                            } as unknown as SupplierMaterial);
                            tx.persist(link);
                        }
                    }
                    continue;
                }

                const created = rawMaterialRepo.create({
                    name: row.name,
                    sku: row.sku,
                    unit: row.unit,
                    cost: row.cost,
                    minStockLevel: row.minStockLevel,
                    supplier,
                } as unknown as RawMaterial);
                tx.persist(created);
                materialBySku.set(row.sku, created);

                if (supplier) {
                    const link = supplierMaterialRepo.create({
                        supplier,
                        rawMaterial: created,
                        lastPurchasePrice: created.cost,
                        lastPurchaseDate: new Date(),
                    } as unknown as SupplierMaterial);
                    tx.persist(link);
                }
            }

            await tx.flush();
        });

        for (const materialId of changedMaterialIds) {
            await this.recalculateVariantsByMaterial(materialId);
        }

        return {
            actor,
            materialsToCreate: preview.summary.materialsToCreate,
            materialsToUpdate: preview.summary.materialsToUpdate,
        };
    }

    async addBOMItem(data: z.infer<typeof BOMItemSchema>): Promise<BOMItem> {
        // Fetch the variant and raw material entities
        const variant = await this.variantRepo.findOneOrFail({ id: data.variantId });
        const rawMaterial = await this.rawMaterialRepo.findOneOrFail({ id: data.rawMaterialId });
        const specification = data.rawMaterialSpecificationId
            ? await this.rawMaterialSpecificationRepo.findOneOrFail({ id: data.rawMaterialSpecificationId, rawMaterial: data.rawMaterialId })
            : undefined;

        // Create BOM item with proper relations
        const bomItem = this.bomItemRepo.create({
            variant,
            rawMaterial,
            rawMaterialSpecification: specification,
            quantity: data.quantity,
            usageNote: data.usageNote,
            fabricationParams: data.fabricationParams,
        } as unknown as BOMItem);

        await this.em.persistAndFlush(bomItem);
        await this.logAudit(bomItem.id, 'bom_item_created', {
            variantId: variant.id,
            rawMaterialId: rawMaterial.id,
            rawMaterialSpecificationId: specification?.id,
            quantity: bomItem.quantity,
            usageNote: bomItem.usageNote,
        });

        // Recalculate variant cost
        await this.calculateVariantCost(data.variantId);

        return bomItem;
    }

    async getBOM(variantId: string): Promise<BOMItem[]> {
        return this.bomItemRepo.find(
            { variantId },
            { populate: ['rawMaterial', 'rawMaterialSpecification'] }
        );
    }

    async updateBOMItem(id: string, data: Partial<z.infer<typeof BOMItemSchema>>): Promise<BOMItem> {
        const item = await this.bomItemRepo.findOneOrFail({ id });
        const before = {
            variantId: item.variantId,
            rawMaterialId: item.rawMaterial?.id,
            rawMaterialSpecificationId: item.rawMaterialSpecification?.id,
            quantity: item.quantity,
            usageNote: item.usageNote,
        };

        // Update fields
        if (data.quantity !== undefined) item.quantity = data.quantity;
        if (data.usageNote !== undefined) item.usageNote = data.usageNote || undefined;
        if (data.fabricationParams !== undefined) item.fabricationParams = data.fabricationParams;
        if (data.rawMaterialId !== undefined) {
            const rawMaterial = await this.rawMaterialRepo.findOneOrFail({ id: data.rawMaterialId });
            item.rawMaterial = rawMaterial;
        }
        if (data.rawMaterialSpecificationId !== undefined || data.rawMaterialId !== undefined) {
            item.rawMaterialSpecification = data.rawMaterialSpecificationId
                ? await this.rawMaterialSpecificationRepo.findOneOrFail({
                    id: data.rawMaterialSpecificationId,
                    rawMaterial: data.rawMaterialId || item.rawMaterial.id,
                })
                : undefined;
        }

        await this.em.persistAndFlush(item);
        const after = {
            variantId: item.variantId,
            rawMaterialId: item.rawMaterial?.id,
            rawMaterialSpecificationId: item.rawMaterialSpecification?.id,
            quantity: item.quantity,
            usageNote: item.usageNote,
        };
        await this.logAudit(item.id, 'bom_item_updated', { before, after });

        // Recalculate variant cost
        await this.calculateVariantCost(item.variantId);

        return item;
    }

    async deleteBOMItem(id: string): Promise<void> {
        const item = await this.bomItemRepo.findOneOrFail({ id });
        const variantId = item.variantId;

        await this.logAudit(item.id, 'bom_item_deleted', {
            variantId: item.variantId,
            rawMaterialId: item.rawMaterial?.id,
            rawMaterialSpecificationId: item.rawMaterialSpecification?.id,
            quantity: item.quantity,
            usageNote: item.usageNote,
        });
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

        const hasOperationalMinutes = Boolean(variant.productionMinutes && variant.productionMinutes > 0);
        // If productionMinutes is present, MOD/CIF are already captured via costPerMinute.
        const labor = hasOperationalMinutes ? 0 : (variant.laborCost || 0);
        const indirect = hasOperationalMinutes ? 0 : (variant.indirectCost || 0);

        // Calculate Operational Cost based on time
        let operationalCost = 0;
        if (hasOperationalMinutes) {
            const configRepo = this.em.getRepository(OperationalConfig);
            const [config] = await configRepo.find({}, { orderBy: { createdAt: 'DESC' }, limit: 1 }); // Get latest
            if (config) {
                operationalCost = (variant.productionMinutes || 0) * config.costPerMinute;
            }
        }

        variant.cost = actualMaterialCost + labor + indirect + operationalCost;
        variant.referenceCost = referenceMaterialCost + labor + indirect + operationalCost;

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
