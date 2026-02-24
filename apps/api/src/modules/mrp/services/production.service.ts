import { EntityManager, EntityRepository } from '@mikro-orm/core';
import {
    ChangeControlStatus,
    ChangeImpactLevel,
    DocumentCategory,
    DocumentProcess,
    DocumentStatus,
    ProductionBatchPackagingStatus,
    ProductionBatchQcStatus,
    ProductionBatchStatus,
    ProductionOrderStatus,
    BatchReleaseStatus,
    RegulatoryLabelScopeType,
    RegulatoryLabelStatus,
    WarehouseType,
} from '@scaffold/types';
import { ProductionOrder } from '../entities/production-order.entity';
import { Warehouse } from '../entities/warehouse.entity';
import { ProductionOrderItem } from '../entities/production-order-item.entity';
import { ProductVariant } from '../entities/product-variant.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { RawMaterial } from '../entities/raw-material.entity';
import { SupplierMaterial } from '../entities/supplier-material.entity';
import { Supplier } from '../entities/supplier.entity';
import { ProductionBatch } from '../entities/production-batch.entity';
import { ProductionBatchUnit } from '../entities/production-batch-unit.entity';
import { QualityAuditEvent } from '../entities/quality-audit-event.entity';
import { RegulatoryLabel } from '../entities/regulatory-label.entity';
import { BatchRelease } from '../entities/batch-release.entity';
import { ChangeControl } from '../entities/change-control.entity';
import { ControlledDocument } from '../entities/controlled-document.entity';
import { OperationalConfig } from '../entities/operational-config.entity';
import { DocumentControlService } from './document-control.service';
import { ProductionOrderSchema, ProductionOrderItemCreateSchema } from '@scaffold/schemas';
import { z } from 'zod';
import { AppError } from '../../../shared/utils/response';

export class ProductionService {
    private readonly em: EntityManager;
    private readonly productionOrderRepo: EntityRepository<ProductionOrder>;
    private readonly inventoryRepo: EntityRepository<InventoryItem>;
    private readonly batchRepo: EntityRepository<ProductionBatch>;
    private readonly batchUnitRepo: EntityRepository<ProductionBatchUnit>;
    private readonly auditRepo: EntityRepository<QualityAuditEvent>;
    private readonly regulatoryLabelRepo: EntityRepository<RegulatoryLabel>;
    private readonly batchReleaseRepo: EntityRepository<BatchRelease>;
    private readonly changeControlRepo: EntityRepository<ChangeControl>;
    private readonly operationalConfigRepo: EntityRepository<OperationalConfig>;

    constructor(em: EntityManager) {
        this.em = em;
        this.productionOrderRepo = em.getRepository(ProductionOrder);
        this.inventoryRepo = em.getRepository(InventoryItem);
        this.batchRepo = em.getRepository(ProductionBatch);
        this.batchUnitRepo = em.getRepository(ProductionBatchUnit);
        this.auditRepo = em.getRepository(QualityAuditEvent);
        this.regulatoryLabelRepo = em.getRepository(RegulatoryLabel);
        this.batchReleaseRepo = em.getRepository(BatchRelease);
        this.changeControlRepo = em.getRepository(ChangeControl);
        this.operationalConfigRepo = em.getRepository(OperationalConfig);
    }

    async createOrder(data: z.infer<typeof ProductionOrderSchema>, itemsData: z.infer<typeof ProductionOrderItemCreateSchema>[]): Promise<ProductionOrder> {
        // Ensure dates are properly instantiated as Date objects and handle potential string inputs
        const orderData = { ...data };

        if (orderData.startDate && typeof orderData.startDate === 'string') {
            const date = new Date(orderData.startDate);
            // Validate date
            if (!isNaN(date.getTime())) {
                orderData.startDate = date;
            } else {
                // Should throw or handle error, but let's try to default or leave as is (which will fail later)
                // Actually throwing a specific error is better
                throw new AppError(`Fecha de inicio inválida: ${orderData.startDate}`, 400);
            }
        }

        if (orderData.endDate && typeof orderData.endDate === 'string') {
            const date = new Date(orderData.endDate);
            if (!isNaN(date.getTime())) {
                orderData.endDate = date;
            } else {
                throw new AppError(`Fecha de fin inválida: ${orderData.endDate}`, 400);
            }
        }

        const order = this.productionOrderRepo.create(orderData as unknown as ProductionOrder);

        for (const itemData of itemsData) {
            const item = new ProductionOrderItem();
            item.variant = this.em.getReference(ProductVariant, itemData.variantId);
            item.quantity = itemData.quantity;
            order.items.add(item);
        }

        await this.em.persistAndFlush(order);
        return order;
    }

    async listOrders(page: number = 1, limit: number = 10): Promise<{ orders: ProductionOrder[], total: number }> {
        const [orders, total] = await this.productionOrderRepo.findAndCount(
            {},
            {
                populate: ['items', 'items.variant', 'items.variant.product'],
                limit,
                offset: (page - 1) * limit,
                orderBy: { createdAt: 'DESC' }
            }
        );
        return { orders, total };
    }

    async getOrder(id: string): Promise<ProductionOrder> {
        return await this.productionOrderRepo.findOneOrFail(
            { id },
            {
                populate: [
                    'items',
                    'items.variant',
                    'items.variant.product',
                    'items.variant.bomItems',
                    'items.variant.bomItems.rawMaterial',
                    'batches',
                    'batches.variant',
                    'batches.units',
                ],
            }
        );
    }

    async createBatch(orderId: string, payload: { variantId: string; plannedQty: number; code?: string; notes?: string }) {
        await this.assertProcessDocument(DocumentProcess.PRODUCCION);
        await this.assertNoBlockingCriticalChanges(orderId);
        const order = await this.productionOrderRepo.findOneOrFail(
            { id: orderId },
            { populate: ['items', 'items.variant'] }
        );

        if (order.status === ProductionOrderStatus.COMPLETED || order.status === ProductionOrderStatus.CANCELLED) {
            throw new AppError('No puedes crear lotes en una orden cerrada', 400);
        }

        const hasVariantInOrder = order.items.getItems().some((i) => i.variant.id === payload.variantId);
        if (!hasVariantInOrder) {
            throw new AppError('La variante no pertenece a la orden', 400);
        }
        const targetOrderItem = order.items.getItems().find((i) => i.variant.id === payload.variantId);
        const orderedQty = Number(targetOrderItem?.quantity || 0);
        const existingBatches = await this.batchRepo.find({ productionOrder: orderId, variant: payload.variantId });
        const alreadyPlanned = existingBatches.reduce((acc, row) => acc + Number(row.plannedQty || 0), 0);
        const nextTotalPlanned = alreadyPlanned + Number(payload.plannedQty || 0);
        if (orderedQty > 0 && nextTotalPlanned > orderedQty) {
            const remaining = Math.max(orderedQty - alreadyPlanned, 0);
            throw new AppError(
                `No puedes exceder la cantidad de la OP para esta variante. Pendiente disponible: ${remaining}`,
                400
            );
        }

        const code = payload.code || `LOT-${Date.now().toString(36).toUpperCase()}`;
        const exists = await this.batchRepo.findOne({ code });
        if (exists) {
            throw new AppError('El código de lote ya existe', 409);
        }

        const batch = this.batchRepo.create({
            productionOrder: order,
            variant: this.em.getReference(ProductVariant, payload.variantId),
            code,
            plannedQty: payload.plannedQty,
            producedQty: 0,
            notes: payload.notes,
            qcStatus: ProductionBatchQcStatus.PENDING,
            packagingStatus: ProductionBatchPackagingStatus.PENDING,
            status: ProductionBatchStatus.IN_PROGRESS,
        } as unknown as ProductionBatch);

        await this.em.persistAndFlush(batch);
        await this.logAudit('production_batch', batch.id, 'created', {
            orderId: orderId,
            code: batch.code,
            plannedQty: batch.plannedQty,
        });
        return this.batchRepo.findOneOrFail(
            { id: batch.id },
            { populate: ['variant', 'variant.product', 'units'] }
        );
    }

    async listBatches(orderId: string) {
        return this.batchRepo.find(
            { productionOrder: orderId },
            { populate: ['variant', 'variant.product', 'units'], orderBy: { createdAt: 'DESC' } }
        );
    }

    async addBatchUnits(batchId: string, quantity: number) {
        const mode = await this.getTraceabilityMode();
        if (mode === 'lote') {
            throw new AppError('La generación de unidades seriales está deshabilitada en modo lote', 400);
        }
        const batch = await this.batchRepo.findOneOrFail({ id: batchId }, { populate: ['units'] });
        if (quantity <= 0) {
            throw new AppError('La cantidad debe ser mayor a 0', 400);
        }

        const currentCount = batch.units.length;
        for (let i = 1; i <= quantity; i += 1) {
            const serialCode = `${batch.code}-U${String(currentCount + i).padStart(4, '0')}`;
            const unit = this.batchUnitRepo.create({
                batch,
                serialCode,
                qcPassed: false,
                packaged: false,
                rejected: false,
            } as unknown as ProductionBatchUnit);
            batch.units.add(unit);
        }

        batch.producedQty = this.calculateProducedQtyFromUnits(batch);
        await this.em.persistAndFlush(batch);
        await this.logAudit('production_batch', batch.id, 'units_added', { quantity });
        return this.batchRepo.findOneOrFail({ id: batchId }, { populate: ['variant', 'units'] });
    }

    async setBatchQc(batchId: string, passed: boolean) {
        const batch = await this.batchRepo.findOneOrFail({ id: batchId }, { populate: ['units', 'productionOrder'] });
        this.assertOrderInProgressForBatchActions(batch.productionOrder.status, 'aprobar QC de lote');
        batch.qcStatus = passed ? ProductionBatchQcStatus.PASSED : ProductionBatchQcStatus.FAILED;
        batch.status = passed ? ProductionBatchStatus.QC_PASSED : ProductionBatchStatus.QC_PENDING;
        await this.em.persistAndFlush(batch);
        if (!passed) {
            await this.reopenBatchReleaseIfNeeded(batch.id, 'Cambio de QC del lote');
        }
        await this.logAudit('production_batch', batch.id, 'qc_updated', { passed });
        return batch;
    }

    async setBatchPackaging(batchId: string, packed: boolean) {
        const mode = await this.getTraceabilityMode();
        const batch = await this.batchRepo.findOneOrFail({ id: batchId }, { populate: ['units', 'productionOrder'] });
        this.assertOrderInProgressForBatchActions(batch.productionOrder.status, 'empacar lote');
        if (packed && !batch.packagingFormCompleted) {
            throw new AppError('Debes diligenciar el FOR de empaque antes de empacar', 400);
        }
        if (batch.qcStatus !== ProductionBatchQcStatus.PASSED) {
            throw new AppError('Debes aprobar QC antes de empacar', 400);
        }

        if (packed && mode === 'serial' && batch.units.length > 0) {
            const allPacked = batch.units.getItems().every((u) => u.rejected || (u.qcPassed && u.packaged));
            if (!allPacked) {
                throw new AppError('Todas las unidades deben estar aprobadas y empacadas', 400);
            }
            batch.producedQty = this.calculateProducedQtyFromUnits(batch);
        }
        if (packed && (mode === 'lote' || batch.units.length === 0)) {
            const formData = (batch.packagingFormData || {}) as Record<string, unknown>;
            const packedQtyFromForm = Number(formData.quantityPacked || batch.producedQty || 0);
            if (packedQtyFromForm <= 0) {
                throw new AppError('Debes registrar cantidad empacada mayor a 0 en el FOR', 400);
            }
            if (packedQtyFromForm > batch.plannedQty) {
                throw new AppError(`Cantidad empacada no puede superar el plan del lote (${batch.plannedQty})`, 400);
            }
            batch.producedQty = packedQtyFromForm;
        }
        if (packed) {
            await this.assertRegulatoryLabelingReady(batch);
        }

        batch.packagingStatus = packed ? ProductionBatchPackagingStatus.PACKED : ProductionBatchPackagingStatus.PENDING;
        batch.status = packed ? ProductionBatchStatus.READY : ProductionBatchStatus.PACKING;
        await this.em.persistAndFlush(batch);
        if (!packed) {
            await this.reopenBatchReleaseIfNeeded(batch.id, 'Cambio de estado de empaque del lote');
        }
        await this.logAudit('production_batch', batch.id, 'packaging_updated', { packed });
        return batch;
    }

    private async assertRegulatoryLabelingReady(batch: ProductionBatch) {
        const mode = await this.getTraceabilityMode();
        const labels = await this.regulatoryLabelRepo.find({ productionBatch: batch.id }, { populate: ['productionBatchUnit'] });

        const lotLabel = labels.find((label) =>
            label.scopeType === RegulatoryLabelScopeType.LOTE &&
            !label.productionBatchUnit &&
            label.status === RegulatoryLabelStatus.VALIDADA
        );
        if (!lotLabel) {
            throw new AppError('No puedes despachar: falta etiqueta regulatoria de lote validada', 400);
        }
        if (mode === 'lote') {
            return;
        }

        const unitsRequiringLabel = batch.units.getItems().filter((unit) => !unit.rejected && unit.qcPassed && unit.packaged);
        const labeledUnitIds = new Set(
            labels
                .filter((label) =>
                    label.scopeType === RegulatoryLabelScopeType.SERIAL &&
                    label.status === RegulatoryLabelStatus.VALIDADA &&
                    !!label.productionBatchUnit
                )
                .map((label) => label.productionBatchUnit!.id)
        );
        const missing = unitsRequiringLabel.filter((unit) => !labeledUnitIds.has(unit.id));
        if (missing.length > 0) {
            throw new AppError(`No puedes despachar: faltan ${missing.length} etiqueta(s) serial(es) validadas`, 400);
        }
    }

    async setBatchUnitQc(unitId: string, passed: boolean) {
        const mode = await this.getTraceabilityMode();
        if (mode === 'lote') {
            throw new AppError('El QC por unidad serial está deshabilitado en modo lote', 400);
        }
        const unit = await this.batchUnitRepo.findOneOrFail({ id: unitId }, { populate: ['batch', 'batch.productionOrder'] });
        this.assertOrderInProgressForBatchActions(unit.batch.productionOrder.status, 'aprobar QC de unidad');
        unit.qcPassed = passed;
        if (!passed) {
            unit.packaged = false;
        }
        await this.em.persistAndFlush(unit);
        if (!passed) {
            await this.reopenBatchReleaseIfNeeded(unit.batch.id, 'Cambio de QC en unidad serial');
        }
        await this.logAudit('production_batch_unit', unit.id, 'qc_updated', { passed });
        return unit;
    }

    async setBatchUnitPackaging(unitId: string, packaged: boolean) {
        const mode = await this.getTraceabilityMode();
        if (mode === 'lote') {
            throw new AppError('El empaque por unidad serial está deshabilitado en modo lote', 400);
        }
        const unit = await this.batchUnitRepo.findOneOrFail({ id: unitId }, { populate: ['batch', 'batch.productionOrder', 'batch.units'] });
        this.assertOrderInProgressForBatchActions(unit.batch.productionOrder.status, 'empacar unidad');
        if (!unit.qcPassed && !unit.rejected) {
            throw new AppError('La unidad debe pasar QC antes de empacar', 400);
        }
        unit.packaged = packaged;
        unit.batch.producedQty = this.calculateProducedQtyFromUnits(unit.batch);
        await this.em.persistAndFlush(unit);
        if (!packaged) {
            await this.reopenBatchReleaseIfNeeded(unit.batch.id, 'Cambio de empaque en unidad serial');
        }
        await this.logAudit('production_batch_unit', unit.id, 'packaging_updated', { packaged });
        return unit;
    }

    async upsertBatchPackagingForm(batchId: string, payload: {
        operatorName: string;
        verifierName: string;
        quantityToPack: number;
        quantityPacked: number;
        lotLabel: string;
        hasTechnicalSheet: boolean;
        hasLabels: boolean;
        hasPackagingMaterial: boolean;
        hasTools: boolean;
        inventoryRecorded: boolean;
        observations?: string;
        nonConformity?: string;
        correctiveAction?: string;
        preventiveAction?: string;
        controlledDocumentId?: string;
        actor?: string;
    }) {
        const batch = await this.batchRepo.findOneOrFail({ id: batchId }, { populate: ['productionOrder', 'units'] });
        this.assertOrderInProgressForBatchActions(batch.productionOrder.status, 'diligenciar FOR de empaque');
        if (payload.quantityToPack <= 0) {
            throw new AppError('Cantidad a empacar debe ser mayor a 0', 400);
        }
        if (payload.quantityPacked < 0) {
            throw new AppError('Cantidad empacada no puede ser negativa', 400);
        }
        if (payload.quantityToPack > batch.plannedQty) {
            throw new AppError(`Cantidad a empacar no puede superar el plan del lote (${batch.plannedQty})`, 400);
        }
        if (payload.quantityPacked > payload.quantityToPack) {
            throw new AppError('Cantidad empacada no puede superar la cantidad a empacar', 400);
        }
        if (payload.quantityPacked > batch.plannedQty) {
            throw new AppError(`Cantidad empacada no puede superar el plan del lote (${batch.plannedQty})`, 400);
        }
        const nonRejectedUnitCount = batch.units.getItems().filter((unit) => !unit.rejected).length;
        if (nonRejectedUnitCount > 0 && payload.quantityPacked > nonRejectedUnitCount) {
            throw new AppError(`Cantidad empacada no puede superar unidades válidas del lote (${nonRejectedUnitCount})`, 400);
        }

        const controlledDoc = await this.resolvePackagingControlledDocument(payload.controlledDocumentId);
        batch.packagingFormData = {
            operatorName: payload.operatorName,
            verifierName: payload.verifierName,
            quantityToPack: payload.quantityToPack,
            quantityPacked: payload.quantityPacked,
            lotLabel: payload.lotLabel,
            hasTechnicalSheet: payload.hasTechnicalSheet,
            hasLabels: payload.hasLabels,
            hasPackagingMaterial: payload.hasPackagingMaterial,
            hasTools: payload.hasTools,
            inventoryRecorded: payload.inventoryRecorded,
            observations: payload.observations?.trim() || undefined,
            nonConformity: payload.nonConformity?.trim() || undefined,
            correctiveAction: payload.correctiveAction?.trim() || undefined,
            preventiveAction: payload.preventiveAction?.trim() || undefined,
        };
        batch.packagingFormCompleted = true;
        batch.packagingFormFilledBy = payload.actor?.trim() || payload.operatorName.trim();
        batch.packagingFormFilledAt = new Date();
        batch.packagingFormDocumentId = controlledDoc.id;
        batch.packagingFormDocumentCode = controlledDoc.code;
        batch.packagingFormDocumentTitle = controlledDoc.title;
        batch.packagingFormDocumentVersion = controlledDoc.version;
        batch.packagingFormDocumentDate = controlledDoc.effectiveDate || controlledDoc.approvedAt || controlledDoc.updatedAt;
        batch.producedQty = nonRejectedUnitCount > 0
            ? this.calculateProducedQtyFromUnits(batch)
            : Number(payload.quantityPacked || 0);
        await this.em.persistAndFlush(batch);
        await this.logAudit('production_batch', batch.id, 'packaging_form_updated', {
            controlledDocumentCode: batch.packagingFormDocumentCode,
            controlledDocumentVersion: batch.packagingFormDocumentVersion,
            actor: payload.actor || payload.operatorName,
        });
        return batch;
    }

    private calculateProducedQtyFromUnits(batch: ProductionBatch): number {
        return batch.units
            .getItems()
            .filter((unit) => !unit.rejected && unit.packaged)
            .length;
    }

    async getBatchPackagingForm(batchId: string) {
        const batch = await this.batchRepo.findOneOrFail(
            { id: batchId },
            { populate: ['variant', 'variant.product', 'productionOrder'] }
        );
        return {
            batchId: batch.id,
            batchCode: batch.code,
            productionOrderCode: batch.productionOrder.code,
            productName: batch.variant?.product?.name || 'N/A',
            variantName: batch.variant?.name || 'N/A',
            formCompleted: Boolean(batch.packagingFormCompleted),
            formFilledBy: batch.packagingFormFilledBy,
            formFilledAt: batch.packagingFormFilledAt,
            documentControlCode: batch.packagingFormDocumentCode,
            documentControlTitle: batch.packagingFormDocumentTitle,
            documentControlVersion: batch.packagingFormDocumentVersion,
            documentControlDate: batch.packagingFormDocumentDate,
            data: batch.packagingFormData || null,
        };
    }


    async calculateMaterialRequirements(orderId: string): Promise<{
        material: RawMaterial,
        required: number,
        available: number,
        potentialSuppliers: { supplier: Supplier, lastPrice: number, lastDate: Date, isCheapest: boolean }[]
    }[]> {
        const order = await this.productionOrderRepo.findOneOrFail({ id: orderId }, { populate: ['items', 'items.variant', 'items.variant.bomItems', 'items.variant.bomItems.rawMaterial'] });

        const requirements = new Map<string, {
            material: RawMaterial,
            required: number,
            available: number,
            potentialSuppliers: { supplier: Supplier, lastPrice: number, lastDate: Date, isCheapest: boolean }[]
        }>();

        // 1. Calculate Required
        for (const item of order.items) {
            const variant = item.variant;
            const productionQty = item.quantity;

            for (const bomItem of variant.bomItems) {
                const rawMaterialId = bomItem.rawMaterial.id;
                const requiredQty = bomItem.quantity * productionQty;

                if (requirements.has(rawMaterialId)) {
                    requirements.get(rawMaterialId)!.required += requiredQty;
                } else {
                    requirements.set(rawMaterialId, {
                        material: bomItem.rawMaterial,
                        required: requiredQty,
                        available: 0, // Will populate next
                        potentialSuppliers: [] // Will populate next
                    });
                }
            }
        }

        // 2. Check Available Stock
        const materialIds = Array.from(requirements.keys());
        if (materialIds.length > 0) {
            const inventoryItems = await this.inventoryRepo.find({
                rawMaterial: { $in: materialIds },
                warehouse: { type: { $ne: WarehouseType.QUARANTINE } },
            });

            for (const invItem of inventoryItems) {
                if (invItem.rawMaterial && requirements.has(invItem.rawMaterial.id)) {
                    requirements.get(invItem.rawMaterial.id)!.available += Number(invItem.quantity);
                }
            }

            // 3. Check Potential Suppliers (SupplierMaterial)
            const supplierMaterials = await this.em.find(SupplierMaterial, { rawMaterial: { $in: materialIds } }, { populate: ['supplier'], orderBy: { lastPurchasePrice: 'ASC', lastPurchaseDate: 'DESC' } });

            for (const sm of supplierMaterials) {
                if (requirements.has(sm.rawMaterial.id)) {
                    const req = requirements.get(sm.rawMaterial.id)!;

                    // Check if this is the cheapest (since list is sorted by ASC price, first one per material is cheapest)
                    // But we might have multiple suppliers for same material.
                    // We can mark the first encountered as cheapest or handle logic in frontend.
                    // Since it's sorted by price ASC, the first one added to the array will be the cheapest.

                    // Actually, if we just push all, the frontend can highlight. 
                    // Let's rely on the sort from DB: cheapest checks across all supplier records.

                    req.potentialSuppliers.push({
                        supplier: sm.supplier,
                        lastPrice: Number(sm.lastPurchasePrice),
                        lastDate: sm.lastPurchaseDate,
                        isCheapest: false // Will calculate after population
                    });
                }
            }

            // Post-process to mark cheapest
            for (const req of requirements.values()) {
                if (req.potentialSuppliers.length > 0) {
                    // Sort again just to be sure
                    req.potentialSuppliers.sort((a, b) => a.lastPrice - b.lastPrice);
                    req.potentialSuppliers[0].isCheapest = true;
                }
            }
        }

        return Array.from(requirements.values());
    }

    async updateStatus(id: string, status: ProductionOrderStatus, warehouseId?: string): Promise<ProductionOrder> {
        return this.em.transactional(async (tx) => {
            const productionOrderRepo = tx.getRepository(ProductionOrder);
            const inventoryRepo = tx.getRepository(InventoryItem);
            const warehouseRepo = tx.getRepository(Warehouse);
            const order = await productionOrderRepo.findOneOrFail(
                { id },
                { populate: ['items', 'items.variant', 'items.variant.bomItems', 'items.variant.bomItems.rawMaterial', 'batches', 'batches.units'] }
            );

            // Basic transition validation
            if (order.status === ProductionOrderStatus.COMPLETED || order.status === ProductionOrderStatus.CANCELLED) {
                throw new AppError(`No se puede cambiar el estado de una orden que ya está ${order.status}`, 400);
            }

            order.status = status;

            // If status is changed to COMPLETED, update finished goods inventory
            if (status === ProductionOrderStatus.IN_PROGRESS) {
                await this.assertProcessDocument(DocumentProcess.PRODUCCION);
                await this.assertNoBlockingCriticalChanges(order.id);
                const requirements = await this.calculateMaterialRequirements(order.id);
                const missingMaterials = requirements.filter((req) => Number(req.available) < Number(req.required));
                if (missingMaterials.length > 0) {
                    throw new AppError(
                        `No hay stock liberado suficiente. Revisa cuarentena para: ${missingMaterials.map((m) => m.material.name).join(', ')}`,
                        400
                    );
                }
            }

            // If status is changed to COMPLETED, update finished goods inventory
            if (status === ProductionOrderStatus.COMPLETED) {
                await this.assertNoBlockingCriticalChanges(order.id);
                const batches = order.batches.getItems();
                const itemVariantIds = order.items.getItems().map((i) => i.variant.id);
                const variantQuantities = new Map<string, number>();

                for (const variantId of itemVariantIds) {
                    const related = batches.filter((b) => b.variant.id === variantId);
                    if (related.length === 0) {
                        throw new AppError('Debes registrar lotes para todas las variantes antes de completar', 400);
                    }

                    let totalCompleted = 0;
                    for (const batch of related) {
                        if (batch.qcStatus !== ProductionBatchQcStatus.PASSED || batch.packagingStatus !== ProductionBatchPackagingStatus.PACKED) {
                            throw new AppError(`El lote ${batch.code} no está listo (QC + Empaque)`, 400);
                        }
                        const release = await this.batchReleaseRepo.findOne({ productionBatch: batch.id });
                        if (!release || release.status !== BatchReleaseStatus.LIBERADO_QA) {
                            throw new AppError(`El lote ${batch.code} no está liberado por QA`, 400);
                        }

                        const units = batch.units.getItems();
                        if (units.length > 0) {
                            const allGood = units.every((u) => u.rejected || (u.qcPassed && u.packaged));
                            if (!allGood) {
                                throw new AppError(`El lote ${batch.code} tiene unidades sin liberar`, 400);
                            }
                            totalCompleted += units.filter((u) => !u.rejected && u.packaged).length;
                        } else {
                            totalCompleted += batch.producedQty > 0 ? batch.producedQty : batch.plannedQty;
                        }
                    }
                    variantQuantities.set(variantId, totalCompleted);
                }

                // Consume released raw materials based on actual completed production quantities.
                const materialRequirements = new Map<string, {
                    required: number;
                    materialName: string;
                }>();

                for (const item of order.items) {
                    const producedQty = Number(variantQuantities.get(item.variant.id) ?? 0);
                    if (producedQty <= 0) {
                        continue;
                    }
                    for (const bomItem of item.variant.bomItems) {
                        if (!bomItem.rawMaterial) {
                            continue;
                        }
                        const rawMaterialId = bomItem.rawMaterial.id;
                        const requiredQty = Number(bomItem.quantity) * producedQty;
                        if (requiredQty <= 0) {
                            continue;
                        }
                        const current = materialRequirements.get(rawMaterialId);
                        if (current) {
                            current.required += requiredQty;
                        } else {
                            materialRequirements.set(rawMaterialId, {
                                required: requiredQty,
                                materialName: bomItem.rawMaterial.name,
                            });
                        }
                    }
                }

                if (materialRequirements.size > 0) {
                    const materialIds = Array.from(materialRequirements.keys());
                    const rawInventoryItems = await inventoryRepo.find(
                        {
                            rawMaterial: { $in: materialIds },
                            warehouse: { type: { $ne: WarehouseType.QUARANTINE } },
                        },
                        { populate: ['rawMaterial', 'warehouse'], orderBy: [{ lastUpdated: 'ASC' }, { createdAt: 'ASC' }] }
                    );

                    const inventoryByMaterial = new Map<string, InventoryItem[]>();
                    for (const inv of rawInventoryItems) {
                        const materialId = inv.rawMaterial?.id;
                        if (!materialId) {
                            continue;
                        }
                        const rows = inventoryByMaterial.get(materialId) || [];
                        rows.push(inv);
                        inventoryByMaterial.set(materialId, rows);
                    }

                    for (const [materialId, requirement] of materialRequirements.entries()) {
                        let pending = Number(requirement.required);
                        const rows = inventoryByMaterial.get(materialId) || [];
                        const available = rows.reduce((sum, row) => sum + Number(row.quantity), 0);
                        if (available < pending) {
                            throw new AppError(
                                `Stock insuficiente para consumir ${requirement.materialName}. Requerido: ${pending.toFixed(4)}, disponible: ${available.toFixed(4)}`,
                                400
                            );
                        }

                        for (const row of rows) {
                            if (pending <= 0) {
                                break;
                            }
                            const currentQty = Number(row.quantity);
                            if (currentQty <= 0) {
                                continue;
                            }
                            const consume = Math.min(currentQty, pending);
                            row.quantity = currentQty - consume;
                            pending -= consume;
                            tx.persist(row);
                        }

                        await this.logAudit('inventory_item', materialId, 'raw_material_consumed_by_production', {
                            productionOrderId: order.id,
                            productionOrderCode: order.code,
                            rawMaterialId: materialId,
                            required: Number(requirement.required),
                        });
                    }
                }

                // Get or create warehouse for finished goods
                let warehouse: Warehouse | null = null;
                if (warehouseId) {
                    warehouse = await warehouseRepo.findOne({ id: warehouseId });
                }

                if (!warehouse) {
                    warehouse = await warehouseRepo.findOne({ name: 'Main Warehouse' });
                }

                if (!warehouse) {
                    warehouse = warehouseRepo.create({
                        name: 'Main Warehouse',
                        location: 'Default',
                        type: WarehouseType.FINISHED_GOODS
                    } as Warehouse);
                    tx.persist(warehouse);
                }

                for (const item of order.items) {
                    const completedQty = variantQuantities.get(item.variant.id) ?? item.quantity;
                    let inventoryItem = await inventoryRepo.findOne({
                        variant: item.variant,
                        warehouse
                    });

                    if (inventoryItem) {
                        inventoryItem.quantity = Number(inventoryItem.quantity) + Number(completedQty);
                    } else {
                        inventoryItem = inventoryRepo.create({
                            variant: item.variant,
                            warehouse,
                            quantity: completedQty,
                            lastUpdated: new Date()
                        } as unknown as InventoryItem);
                    }
                    tx.persist(inventoryItem);
                }
            }

            await tx.flush();
            await this.logAudit('production_order', order.id, 'status_updated', { status });
            return order;
        });
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

    private async assertProcessDocument(process: DocumentProcess) {
        const service = new DocumentControlService(this.em);
        await service.assertActiveProcessDocument(process);
    }

    private async resolvePackagingControlledDocument(controlledDocumentId?: string) {
        const docRepo = this.em.getRepository(ControlledDocument);
        if (controlledDocumentId) {
            const selected = await docRepo.findOne({ id: controlledDocumentId });
            if (!selected) {
                throw new AppError('Documento controlado no encontrado para FOR de empaque', 404);
            }
            if (selected.process !== DocumentProcess.EMPAQUE || selected.status !== DocumentStatus.APROBADO) {
                throw new AppError('El documento seleccionado debe estar aprobado y pertenecer a Empaque', 400);
            }
            return selected;
        }

        const configs = await this.operationalConfigRepo.findAll({ limit: 1, orderBy: { createdAt: 'DESC' } });
        const config = configs[0];
        const configuredCode = config?.defaultPackagingControlledDocumentCode?.trim();
        if (!configuredCode) {
            throw new AppError('Debes configurar el formato global de empaque en Órdenes de Producción (engranaje)', 400);
        }
        const now = new Date();
        const configured = await docRepo.findOne({
            code: configuredCode,
            documentCategory: DocumentCategory.FOR,
            status: DocumentStatus.APROBADO,
            $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
            $and: [{ $or: [{ effectiveDate: null }, { effectiveDate: { $lte: now } }] }],
        }, { orderBy: { version: 'DESC' } });
        if (!configured) {
            throw new AppError(`El formato global de empaque configurado (${configuredCode}) no está aprobado/vigente`, 400);
        }
        return configured;
    }

    private async getTraceabilityMode(): Promise<'lote' | 'serial'> {
        const configs = await this.operationalConfigRepo.findAll({ limit: 1, orderBy: { createdAt: 'DESC' } });
        const mode = configs[0]?.operationMode;
        return mode === 'serial' ? 'serial' : 'lote';
    }

    private assertOrderInProgressForBatchActions(orderStatus: ProductionOrderStatus, action: string) {
        if (orderStatus !== ProductionOrderStatus.IN_PROGRESS) {
            throw new AppError(`No puedes ${action} hasta iniciar producción`, 400);
        }
    }

    private async reopenBatchReleaseIfNeeded(productionBatchId: string, reason: string) {
        const release = await this.batchReleaseRepo.findOne({ productionBatch: productionBatchId });
        if (!release || release.status !== BatchReleaseStatus.LIBERADO_QA) {
            return;
        }

        release.status = BatchReleaseStatus.PENDIENTE_LIBERACION;
        release.signedBy = undefined;
        release.approvalMethod = undefined;
        release.approvalSignature = undefined;
        release.signedAt = undefined;
        release.documentsCurrent = false;
        release.reviewedBy = 'sistema-backend';
        release.checklistNotes = release.checklistNotes
            ? `${release.checklistNotes}\nRevalidación requerida: ${reason}.`
            : `Revalidación requerida: ${reason}.`;

        await this.em.persistAndFlush(release);
        await this.logAudit('batch_release', release.id, 'reopened', {
            productionBatchId,
            reason,
            status: release.status,
        });
    }

    private async assertNoBlockingCriticalChanges(productionOrderId: string) {
        const rows = await this.changeControlRepo.find({
            impactLevel: ChangeImpactLevel.CRITICO,
            affectedProductionOrder: productionOrderId,
            status: {
                $in: [
                    ChangeControlStatus.BORRADOR,
                    ChangeControlStatus.EN_EVALUACION,
                    ChangeControlStatus.APROBADO,
                ],
            },
        }, { orderBy: { createdAt: 'DESC' }, limit: 10 });

        const now = new Date();
        const blockers = rows.filter((row) => {
            if (row.status === ChangeControlStatus.APROBADO) {
                if (!row.effectiveDate) return true;
                return row.effectiveDate > now;
            }
            return true;
        });

        if (blockers.length > 0) {
            const details = blockers
                .map((row) => row.status === ChangeControlStatus.APROBADO && row.effectiveDate
                    ? `${row.code} (vigente desde ${row.effectiveDate.toISOString()})`
                    : `${row.code} (${row.status})`
                )
                .join(', ');
            throw new AppError(`Hay cambios críticos pendientes/no efectivos para la orden: ${details}`, 400);
        }
    }
}
