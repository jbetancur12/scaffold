import { EntityManager, EntityRepository } from '@mikro-orm/core';
import {
    ChangeControlStatus,
    ChangeImpactLevel,
    DocumentCategory,
    DocumentProcess,
    DocumentStatus,
    ProductionBatchFinishedInspectionStatus,
    ProductionBatchPackagingStatus,
    ProductionBatchQcStatus,
    ProductionBatchStatus,
    ProductionOrderStatus,
    SalesOrderStatus,
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
import { ShipmentItem } from '../entities/shipment-item.entity';
import { FinishedGoodsLotInventory } from '../entities/finished-goods-lot-inventory.entity';
import { QualityAuditEvent } from '../entities/quality-audit-event.entity';
import { RegulatoryLabel } from '../entities/regulatory-label.entity';
import { BatchRelease } from '../entities/batch-release.entity';
import { ChangeControl } from '../entities/change-control.entity';
import { ControlledDocument } from '../entities/controlled-document.entity';
import { OperationalConfig } from '../entities/operational-config.entity';
import { RawMaterialLot } from '../entities/raw-material-lot.entity';
import { RawMaterialKardex } from '../entities/raw-material-kardex.entity';
import { ProductionMaterialAllocation } from '../entities/production-material-allocation.entity';
import { SalesOrder } from '../entities/sales-order.entity';
import { BOMItem } from '../entities/bom-item.entity';
import { RawMaterialSpecification } from '../entities/raw-material-specification.entity';
import { DocumentControlService } from './document-control.service';
import { ProductionOrderSchema, ProductionOrderItemCreateSchema, ReturnProductionMaterialSchema, SimulateProductionRequirementsSchema, UpsertProductionMaterialAllocationSchema } from '@scaffold/schemas';
import { z } from 'zod';
import { AppError } from '../../../shared/utils/response';

export class ProductionService {
    private readonly em: EntityManager;
    private readonly productionOrderRepo: EntityRepository<ProductionOrder>;
    private readonly inventoryRepo: EntityRepository<InventoryItem>;
    private readonly batchRepo: EntityRepository<ProductionBatch>;
    private readonly batchUnitRepo: EntityRepository<ProductionBatchUnit>;
    private readonly regulatoryLabelRepo: EntityRepository<RegulatoryLabel>;
    private readonly batchReleaseRepo: EntityRepository<BatchRelease>;
    private readonly changeControlRepo: EntityRepository<ChangeControl>;
    private readonly operationalConfigRepo: EntityRepository<OperationalConfig>;
    private readonly rawMaterialLotRepo: EntityRepository<RawMaterialLot>;
    private readonly materialAllocationRepo: EntityRepository<ProductionMaterialAllocation>;

    constructor(em: EntityManager) {
        this.em = em;
        this.productionOrderRepo = em.getRepository(ProductionOrder);
        this.inventoryRepo = em.getRepository(InventoryItem);
        this.batchRepo = em.getRepository(ProductionBatch);
        this.batchUnitRepo = em.getRepository(ProductionBatchUnit);
        this.regulatoryLabelRepo = em.getRepository(RegulatoryLabel);
        this.batchReleaseRepo = em.getRepository(BatchRelease);
        this.changeControlRepo = em.getRepository(ChangeControl);
        this.operationalConfigRepo = em.getRepository(OperationalConfig);
        this.rawMaterialLotRepo = em.getRepository(RawMaterialLot);
        this.materialAllocationRepo = em.getRepository(ProductionMaterialAllocation);
    }

    private formatBatchDateToken(date = new Date()) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear());
        return `${day}${month}${year}`;
    }

    private getVariantMarker(order: ProductionOrder, variantId: string) {
        const index = order.items.getItems().findIndex((item) => item.variant?.id === variantId);
        const markerNumber = index >= 0 ? index + 1 : 1;
        return `V${markerNumber}`;
    }

    private async generateAutoBatchCode(order: ProductionOrder, variantId: string) {
        const dateToken = this.formatBatchDateToken();
        const variantMarker = this.getVariantMarker(order, variantId);
        const prefix = `${dateToken}-${variantMarker}-`;

        const existing = await this.batchRepo.find(
            { code: { $ilike: `${prefix}%` } },
            { orderBy: { createdAt: 'DESC' } }
        );

        let maxSequence = 0;
        for (const row of existing) {
            const code = String(row.code || '').trim().toUpperCase();
            const maybeSeq = Number(code.slice(prefix.length));
            if (Number.isFinite(maybeSeq) && maybeSeq > maxSequence) {
                maxSequence = maybeSeq;
            }
        }

        const next = maxSequence + 1;
        return `${dateToken}-${variantMarker}-${String(next).padStart(2, '0')}`;
    }

    private async buildMaterialRequirements(
        itemsData: z.infer<typeof ProductionOrderItemCreateSchema>[],
        options?: { orderId?: string }
    ): Promise<{
        material: RawMaterial,
        required: number,
        available: number,
        suggestedUnitPrice?: number,
        estimatedRequiredCost?: number,
        rawMaterialSpecification?: Pick<RawMaterialSpecification, 'id' | 'name' | 'sku' | 'widthCm'>,
        effectiveRollWidth?: number,
        bomRollWidth?: number,
        potentialSuppliers: { supplier: Supplier, lastPrice: number, lastDate: Date, isCheapest: boolean }[],
        pepsLots: { lotId: string; lotCode: string; warehouseId: string; warehouseName: string; available: number; receivedAt: Date; suggestedUse: number }[],
        selectedAllocation?: { lotId: string; lotCode: string; warehouseId: string; warehouseName: string; quantityRequested?: number }
    }[]> {
        const requirements = new Map<string, {
            material: RawMaterial,
            required: number,
            available: number,
            suggestedUnitPrice?: number,
            estimatedRequiredCost?: number,
            rawMaterialSpecification?: Pick<RawMaterialSpecification, 'id' | 'name' | 'sku' | 'widthCm'>,
            effectiveRollWidth?: number,
            bomRollWidth?: number,
            potentialSuppliers: { supplier: Supplier, lastPrice: number, lastDate: Date, isCheapest: boolean }[],
            pepsLots: { lotId: string; lotCode: string; warehouseId: string; warehouseName: string; available: number; receivedAt: Date; suggestedUse: number }[],
            selectedAllocation?: { lotId: string; lotCode: string; warehouseId: string; warehouseName: string; quantityRequested?: number }
        }>();

        const variantIds = Array.from(new Set(itemsData.map((row) => row.variantId)));
        const variants = variantIds.length > 0
            ? await this.em.find(ProductVariant, { id: { $in: variantIds } })
            : [];
        const variantById = new Map(variants.map((variant) => [variant.id, variant]));

        const bomRows = variantIds.length > 0
            ? await this.em.find(BOMItem, { variant: { $in: variantIds } }, { populate: ['variant', 'rawMaterial', 'rawMaterialSpecification'] })
            : [];
        const bomByVariant = new Map<string, BOMItem[]>();
        for (const bomRow of bomRows) {
            const key = bomRow.variant.id;
            const list = bomByVariant.get(key) || [];
            list.push(bomRow);
            bomByVariant.set(key, list);
        }

        for (const item of itemsData) {
            const variant = variantById.get(item.variantId);
            if (!variant) continue;

            const productionQty = Number(item.quantity || 0);
            const variantBomItems = bomByVariant.get(variant.id) || [];

            for (const bomItem of variantBomItems) {
                const rawMaterialId = bomItem.rawMaterial.id;
                const effectiveFabricationParams = this.resolveEffectiveFabricationParams(
                    bomItem.fabricationParams as {
                        calculationType?: 'area' | 'linear';
                        quantityPerUnit?: number;
                        rollWidth: number;
                        pieceWidth: number;
                        pieceLength: number;
                        orientation: 'normal' | 'rotated';
                    } | undefined,
                    bomItem.rawMaterialSpecification,
                );
                const requiredQty = this.calculateRequiredMaterialFromFabrication(
                    Number(bomItem.quantity),
                    productionQty,
                    effectiveFabricationParams,
                );

                if (requirements.has(rawMaterialId)) {
                    requirements.get(rawMaterialId)!.required += requiredQty;
                } else {
                    requirements.set(rawMaterialId, {
                        material: bomItem.rawMaterial,
                        required: requiredQty,
                        available: 0,
                        suggestedUnitPrice: undefined,
                        estimatedRequiredCost: undefined,
                        rawMaterialSpecification: bomItem.rawMaterialSpecification ? {
                            id: bomItem.rawMaterialSpecification.id,
                            name: bomItem.rawMaterialSpecification.name,
                            sku: bomItem.rawMaterialSpecification.sku,
                            widthCm: Number(bomItem.rawMaterialSpecification.widthCm || 0) || undefined,
                        } : undefined,
                        effectiveRollWidth: effectiveFabricationParams?.rollWidth,
                        bomRollWidth: bomItem.fabricationParams?.rollWidth,
                        potentialSuppliers: [],
                        pepsLots: [],
                    });
                }
            }
        }

        const materialIds = Array.from(requirements.keys());
        if (materialIds.length === 0) {
            return [];
        }

        await this.ensureLegacyLots(materialIds);
        const inventoryItems = await this.inventoryRepo.find({
            rawMaterial: { $in: materialIds },
            warehouse: { type: { $ne: WarehouseType.QUARANTINE } },
        }, {
            populate: ['rawMaterial', 'rawMaterialSpecification'],
        });

        for (const invItem of inventoryItems) {
            if (invItem.rawMaterial && requirements.has(invItem.rawMaterial.id)) {
                const req = requirements.get(invItem.rawMaterial.id)!;
                const requiredSpecId = req.rawMaterialSpecification?.id;
                const inventorySpecId = invItem.rawMaterialSpecification?.id;
                if (requiredSpecId && inventorySpecId !== requiredSpecId) continue;
                req.available += Number(invItem.quantity);
            }
        }

        const lots = await this.rawMaterialLotRepo.find(
            {
                rawMaterial: { $in: materialIds },
                quantityAvailable: { $gt: 0 },
                warehouse: { type: { $ne: WarehouseType.QUARANTINE } },
            },
            {
                populate: ['warehouse', 'rawMaterial', 'rawMaterialSpecification'],
                orderBy: [{ receivedAt: 'ASC' }, { createdAt: 'ASC' }],
            }
        );

        for (const lot of lots) {
            const materialId = lot.rawMaterial?.id;
            if (!materialId || !requirements.has(materialId)) continue;
            const req = requirements.get(materialId)!;
            const requiredSpecId = req.rawMaterialSpecification?.id;
            const lotSpecId = lot.rawMaterialSpecification?.id;
            if (requiredSpecId && lotSpecId !== requiredSpecId) continue;
            req.pepsLots.push({
                lotId: lot.id,
                lotCode: lot.supplierLotCode,
                warehouseId: lot.warehouse.id,
                warehouseName: lot.warehouse.name,
                available: Number(lot.quantityAvailable),
                receivedAt: lot.receivedAt,
                suggestedUse: 0,
            });
        }

        const supplierMaterials = await this.em.find(
            SupplierMaterial,
            { rawMaterial: { $in: materialIds } },
            { populate: ['supplier'], orderBy: { lastPurchasePrice: 'ASC', lastPurchaseDate: 'DESC' } }
        );

        const allocationByMaterial = new Map<string, ProductionMaterialAllocation>();
        if (options?.orderId) {
            const allocations = await this.materialAllocationRepo.find(
                { productionOrder: options.orderId, rawMaterial: { $in: materialIds }, lot: { $ne: null } },
                {}
            );
            for (const row of allocations) {
                allocationByMaterial.set(row.rawMaterial.id, row);
            }
        }

        for (const sm of supplierMaterials) {
            if (!requirements.has(sm.rawMaterial.id)) continue;
            const lastPrice = Number(sm.lastPurchasePrice);
            if (!(lastPrice > 0)) continue;
            requirements.get(sm.rawMaterial.id)!.potentialSuppliers.push({
                supplier: sm.supplier,
                lastPrice,
                lastDate: sm.lastPurchaseDate,
                isCheapest: false,
            });
        }

        for (const req of requirements.values()) {
            if (req.potentialSuppliers.length > 0) {
                req.potentialSuppliers.sort((a, b) => a.lastPrice - b.lastPrice);
                req.potentialSuppliers[0].isCheapest = true;
                req.suggestedUnitPrice = Number(req.potentialSuppliers[0].lastPrice);
                req.estimatedRequiredCost = Number((Number(req.required) * req.suggestedUnitPrice).toFixed(2));
            }
            const allocation = allocationByMaterial.get(req.material.id);
            if (allocation?.lot) {
                const selectedLot = req.pepsLots.find((lot) => lot.lotId === allocation.lot?.id);
                req.selectedAllocation = {
                    lotId: allocation.lot.id,
                    lotCode: selectedLot?.lotCode || 'Lote asignado',
                    warehouseId: selectedLot?.warehouseId || '',
                    warehouseName: selectedLot?.warehouseName || 'No disponible',
                    quantityRequested: allocation.quantityRequested ? Number(allocation.quantityRequested) : undefined,
                };
            }
            let pending = Number(req.required);
            if (allocation?.lot) {
                const selectedLot = req.pepsLots.find((lot) => lot.lotId === allocation.lot?.id);
                if (selectedLot) {
                    const desired = Number(allocation.quantityRequested || req.required);
                    const suggested = Math.min(desired, Number(selectedLot.available), pending);
                    selectedLot.suggestedUse = suggested;
                    pending -= suggested;
                }
            }
            for (const lot of req.pepsLots) {
                if (pending <= 0) break;
                if (allocation?.lot && lot.lotId === allocation.lot.id) continue;
                const use = Math.min(pending, Number(lot.available));
                lot.suggestedUse = use;
                pending -= use;
            }
        }

        return Array.from(requirements.values());
    }

    private resolveEffectiveFabricationParams(
        fabricationParams?: {
            calculationType?: 'area' | 'linear';
            quantityPerUnit?: number;
            rollWidth: number;
            pieceWidth: number;
            pieceLength: number;
            orientation: 'normal' | 'rotated';
        },
        rawMaterialSpecification?: RawMaterialSpecification | null,
    ) {
        if (!fabricationParams) {
            return undefined;
        }
        const specWidthCm = Number(rawMaterialSpecification?.widthCm || 0);
        if ((fabricationParams.calculationType ?? 'area') !== 'area' || !Number.isFinite(specWidthCm) || specWidthCm <= 0) {
            return fabricationParams;
        }
        return {
            ...fabricationParams,
            rollWidth: specWidthCm,
        };
    }

    async generateNextOrderCode(tx?: EntityManager): Promise<string> {
        const manager = tx ?? this.em;
        const repo = manager.getRepository(ProductionOrder);
        const rows = await repo.findAll({ fields: ['code'] as never, orderBy: { createdAt: 'ASC' } });

        let maxNumber = 0;
        for (const row of rows) {
            const rawCode = String(row.code || '').trim();
            if (!/^\d+$/.test(rawCode)) continue;
            const parsed = Number.parseInt(rawCode, 10);
            if (Number.isFinite(parsed) && parsed > maxNumber) {
                maxNumber = parsed;
            }
        }

        return String(maxNumber + 1).padStart(5, '0');
    }

    private calculateRequiredMaterialFromFabrication(
        bomQuantityPerUnit: number,
        productionUnits: number,
        fabricationParams?: {
            calculationType?: 'area' | 'linear';
            quantityPerUnit?: number;
            rollWidth: number;
            pieceWidth: number;
            pieceLength: number;
            orientation: 'normal' | 'rotated';
        }
    ): number {
        const units = Number(productionUnits);
        const perUnitQty = Number(bomQuantityPerUnit);
        if (!Number.isFinite(units) || units <= 0) {
            return 0;
        }

        // Default behavior for legacy/manual BOM rows.
        const linearRequired = (Number.isFinite(perUnitQty) && perUnitQty > 0) ? perUnitQty * units : 0;
        if (!fabricationParams) {
            return linearRequired;
        }

        // Backward compatibility:
        // apply block-based consumption only when BOM row includes explicit pieces-per-unit.
        // Older rows may have geometry without this field and were historically linear.
        const hasExplicitPiecesPerUnit = fabricationParams.quantityPerUnit !== undefined;
        if (!hasExplicitPiecesPerUnit) {
            return linearRequired;
        }
        const quantityPerUnit = Math.max(1, Math.floor(Number(fabricationParams.quantityPerUnit)));
        const totalPieces = units * quantityPerUnit;
        const calculationType = fabricationParams.calculationType ?? 'area';

        if (calculationType === 'linear') {
            const materialLengthCm = Number(fabricationParams.rollWidth);
            const cutLengthCm = Number(fabricationParams.pieceLength);
            if (!Number.isFinite(materialLengthCm) || !Number.isFinite(cutLengthCm) || materialLengthCm <= 0 || cutLengthCm <= 0) {
                return linearRequired;
            }
            const piecesPerBar = Math.floor(materialLengthCm / cutLengthCm);
            if (piecesPerBar <= 0) {
                return linearRequired;
            }
            return Number((((materialLengthCm / piecesPerBar) * totalPieces) / 100).toFixed(4));
        }

        const rollWidthCm = Number(fabricationParams.rollWidth);
        const basePieceWidth = Number(fabricationParams.pieceWidth);
        const basePieceLength = Number(fabricationParams.pieceLength);
        if (!Number.isFinite(rollWidthCm) || !Number.isFinite(basePieceWidth) || !Number.isFinite(basePieceLength)
            || rollWidthCm <= 0 || basePieceWidth <= 0 || basePieceLength <= 0) {
            return linearRequired;
        }

        const pieceWidthCm = fabricationParams.orientation === 'rotated' ? basePieceLength : basePieceWidth;
        const pieceLengthCm = fabricationParams.orientation === 'rotated' ? basePieceWidth : basePieceLength;
        const piecesPerRow = Math.floor(rollWidthCm / pieceWidthCm);
        if (piecesPerRow <= 0) {
            return linearRequired;
        }

        const rowsNeeded = Math.ceil(totalPieces / piecesPerRow);
        return Number(((rowsNeeded * pieceLengthCm) / 100).toFixed(4));
    }

    private calculateFabricationConsumptionBreakdown(
        bomQuantityPerUnit: number,
        productionUnits: number,
        fabricationParams?: {
            calculationType?: 'area' | 'linear';
            quantityPerUnit?: number;
            rollWidth: number;
            pieceWidth: number;
            pieceLength: number;
            orientation: 'normal' | 'rotated';
        }
    ): { requiredGross: number; remnantRecoverable: number } {
        const requiredGross = this.calculateRequiredMaterialFromFabrication(
            bomQuantityPerUnit,
            productionUnits,
            fabricationParams
        );
        if (!fabricationParams || fabricationParams.quantityPerUnit === undefined) {
            return {
                requiredGross: Number(requiredGross.toFixed(4)),
                remnantRecoverable: 0,
            };
        }

        const units = Number(productionUnits);
        const quantityPerUnit = Math.max(1, Math.floor(Number(fabricationParams.quantityPerUnit)));
        const totalPieces = units * quantityPerUnit;
        const calculationType = fabricationParams.calculationType ?? 'area';

        if (calculationType === 'linear') {
            const materialLengthCm = Number(fabricationParams.rollWidth);
            const cutLengthCm = Number(fabricationParams.pieceLength);
            if (!Number.isFinite(materialLengthCm) || !Number.isFinite(cutLengthCm) || materialLengthCm <= 0 || cutLengthCm <= 0 || totalPieces <= 0) {
                return { requiredGross: Number(requiredGross.toFixed(4)), remnantRecoverable: 0 };
            }
            return {
                requiredGross: Number(requiredGross.toFixed(4)),
                remnantRecoverable: 0,
            };
        }

        const rollWidthCm = Number(fabricationParams.rollWidth);
        const basePieceWidth = Number(fabricationParams.pieceWidth);
        const basePieceLength = Number(fabricationParams.pieceLength);
        if (!Number.isFinite(rollWidthCm) || !Number.isFinite(basePieceWidth) || !Number.isFinite(basePieceLength)
            || rollWidthCm <= 0 || basePieceWidth <= 0 || basePieceLength <= 0 || totalPieces <= 0) {
            return { requiredGross: Number(requiredGross.toFixed(4)), remnantRecoverable: 0 };
        }
        const pieceWidthCm = fabricationParams.orientation === 'rotated' ? basePieceLength : basePieceWidth;
        const pieceLengthCm = fabricationParams.orientation === 'rotated' ? basePieceWidth : basePieceLength;
        const netUsedEquivalent = Number(((totalPieces * pieceWidthCm * pieceLengthCm) / (rollWidthCm * 100)).toFixed(4));
        const remnant = Math.max(0, Number((requiredGross - netUsedEquivalent).toFixed(4)));
        return {
            requiredGross: Number(requiredGross.toFixed(4)),
            remnantRecoverable: remnant,
        };
    }

    async createOrder(
        data: z.infer<typeof ProductionOrderSchema>,
        itemsData: z.infer<typeof ProductionOrderItemCreateSchema>[],
        actor?: string
    ): Promise<ProductionOrder> {
        // Ensure dates are properly instantiated as Date objects and handle potential string inputs
        const orderData = { ...data };
        if (!orderData.code?.trim()) {
            orderData.code = await this.generateNextOrderCode();
        }

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

        if ((data as any).salesOrderId) {
            order.salesOrder = this.em.getReference(SalesOrder, (data as any).salesOrderId);
        }

        for (const itemData of itemsData) {
            const item = new ProductionOrderItem();
            item.variant = this.em.getReference(ProductVariant, itemData.variantId);
            item.quantity = itemData.quantity;
            order.items.add(item);
        }

        await this.em.persistAndFlush(order);
        await this.logAudit('production_order', order.id, 'created', {
            code: order.code,
            status: order.status,
            salesOrderId: order.salesOrder?.id,
            itemsCount: order.items.length,
        }, actor);
        return order;
    }

    async linkSalesOrder(productionOrderId: string, salesOrderId: string | null, actor?: string): Promise<ProductionOrder> {
        return this.em.transactional(async (tx) => {
            const order = await tx.getRepository(ProductionOrder).findOneOrFail({ id: productionOrderId }, { populate: ['salesOrder'] });
            const oldSalesOrderId = order.salesOrder?.id;

            if (salesOrderId) {
                order.salesOrder = tx.getReference(SalesOrder, salesOrderId);
            } else {
                order.salesOrder = undefined;
            }
            await tx.persistAndFlush(order);

            if (oldSalesOrderId && oldSalesOrderId !== salesOrderId) {
                await this.syncSalesOrderStatus(oldSalesOrderId, tx);
            }
            if (salesOrderId) {
                await this.syncSalesOrderStatus(salesOrderId, tx);
            }

            if (oldSalesOrderId !== salesOrderId) {
                await this.logAudit('production_order', order.id, salesOrderId ? 'sales_order_linked' : 'sales_order_unlinked', {
                    previousSalesOrderId: oldSalesOrderId,
                    salesOrderId,
                    code: order.code,
                }, actor, tx);
            }

            return order;
        });
    }

    private async syncSalesOrderStatus(salesOrderId: string, tx: EntityManager) {
        const soRepo = tx.getRepository(SalesOrder);
        const poRepo = tx.getRepository(ProductionOrder);

        const so = await soRepo.findOne({ id: salesOrderId });
        if (!so) return;
        if (so.status === SalesOrderStatus.CANCELLED) return;

        const linkedPos = await poRepo.find({ salesOrder: salesOrderId });
        if (linkedPos.length === 0) {
            // No linked POs, do not automatically change status (could be mostly manual)
            return;
        }

        const allCompleted = linkedPos.every(po => po.status === ProductionOrderStatus.COMPLETED);
        const allCancelled = linkedPos.every(po => po.status === ProductionOrderStatus.CANCELLED);

        let newStatus = so.status;
        if (allCancelled) {
            // Keep current status or allow manual intervention, but let's not auto-cancel SO based on PO
        } else if (allCompleted) {
            newStatus = SalesOrderStatus.READY_TO_SHIP;
        } else {
            // Any PO is draft, planned or in progress
            newStatus = SalesOrderStatus.IN_PRODUCTION;
        }

        if (so.status !== newStatus) {
            so.status = newStatus;
            tx.persist(so);
        }
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
                    'salesOrder',
                    'salesOrder.customer',
                ],
            }
        );
    }

    async createBatch(orderId: string, payload: { variantId: string; plannedQty: number; code?: string; notes?: string }, actor?: string) {
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

        const code = payload.code?.trim() || await this.generateAutoBatchCode(order, payload.variantId);
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
            finishedInspectionStatus: ProductionBatchFinishedInspectionStatus.PENDING,
            packagingStatus: ProductionBatchPackagingStatus.PENDING,
            status: ProductionBatchStatus.IN_PROGRESS,
        } as unknown as ProductionBatch);

        await this.em.persistAndFlush(batch);
        await this.logAudit('production_batch', batch.id, 'created', {
            orderId: orderId,
            code: batch.code,
            plannedQty: batch.plannedQty,
        }, actor);
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

    async lookupBatches(filters: { search?: string; limit?: number }) {
        const search = filters.search?.trim();
        if (!search) return [];
        const limit = Math.min(Math.max(filters.limit ?? 10, 1), 50);
        return this.batchRepo.find(
            {
                $or: [
                    { code: { $ilike: `%${search}%` } },
                    { variant: { name: { $ilike: `%${search}%` } } },
                    { variant: { sku: { $ilike: `%${search}%` } } },
                    { variant: { product: { name: { $ilike: `%${search}%` } } } },
                ],
            },
            {
                populate: ['variant', 'variant.product', 'productionOrder'],
                orderBy: { createdAt: 'DESC' },
                limit,
            }
        );
    }

    async addBatchUnits(batchId: string, quantity: number, actor?: string) {
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
        await this.logAudit('production_batch', batch.id, 'units_added', { quantity }, actor);
        return this.batchRepo.findOneOrFail({ id: batchId }, { populate: ['variant', 'units'] });
    }

    async setBatchQc(batchId: string, passed: boolean, actor?: string) {
        const batch = await this.batchRepo.findOneOrFail({ id: batchId }, { populate: ['units', 'productionOrder'] });
        this.assertOrderInProgressForBatchActions(batch.productionOrder.status, 'aprobar QC de lote');
        batch.qcStatus = passed ? ProductionBatchQcStatus.PASSED : ProductionBatchQcStatus.FAILED;
        if (!passed) {
            batch.finishedInspectionStatus = ProductionBatchFinishedInspectionStatus.PENDING;
            batch.finishedInspectionFormCompleted = false;
            batch.packagingStatus = ProductionBatchPackagingStatus.PENDING;
        }
        batch.status = passed ? ProductionBatchStatus.QC_PASSED : ProductionBatchStatus.QC_PENDING;
        await this.em.persistAndFlush(batch);
        if (!passed) {
            await this.reopenBatchReleaseIfNeeded(batch.id, 'Cambio de QC del lote');
        }
        await this.logAudit('production_batch', batch.id, 'qc_updated', { passed }, actor);
        return batch;
    }

    async setBatchPackaging(batchId: string, packed: boolean, actor?: string) {
        const mode = await this.getTraceabilityMode();
        const batch = await this.batchRepo.findOneOrFail({ id: batchId }, { populate: ['units', 'productionOrder'] });
        this.assertOrderInProgressForBatchActions(batch.productionOrder.status, 'empacar lote');
        if (packed && !batch.packagingFormCompleted) {
            throw new AppError('Debes diligenciar el FOR de empaque antes de empacar', 400);
        }
        if (packed && !batch.finishedInspectionFormCompleted) {
            throw new AppError('Debes diligenciar el FOR de inspección de producto terminado antes de empacar', 400);
        }
        if (packed && batch.finishedInspectionStatus !== ProductionBatchFinishedInspectionStatus.PASSED) {
            throw new AppError('Debes aprobar la inspección final de producto terminado antes de empacar', 400);
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
        await this.logAudit('production_batch', batch.id, 'packaging_updated', { packed }, actor);
        return batch;
    }

    async upsertBatchFinishedInspectionForm(batchId: string, payload: {
        inspectorName: string;
        verifierName: string;
        quantityInspected: number;
        quantityApproved: number;
        quantityRejected: number;
        sizeCheck: boolean;
        stitchingCheck: boolean;
        visualCheck: boolean;
        labelingCheck: boolean;
        productMatchesOrder: boolean;
        observations?: string;
        nonConformity?: string;
        correctiveAction?: string;
        preventiveAction?: string;
        controlledDocumentId?: string;
        actor?: string;
    }) {
        const batch = await this.batchRepo.findOneOrFail({ id: batchId }, { populate: ['productionOrder'] });
        this.assertOrderInProgressForBatchActions(batch.productionOrder.status, 'diligenciar FOR de inspección final');
        if (batch.packagingStatus === ProductionBatchPackagingStatus.PACKED) {
            throw new AppError('No puedes cambiar inspección final en un lote ya empacado', 400);
        }
        if (batch.qcStatus !== ProductionBatchQcStatus.PASSED) {
            throw new AppError('Debes aprobar QC del lote antes de inspección final', 400);
        }
        if (payload.quantityInspected <= 0) {
            throw new AppError('Cantidad inspeccionada debe ser mayor a 0', 400);
        }
        if (payload.quantityApproved < 0 || payload.quantityRejected < 0) {
            throw new AppError('Cantidades aprobada/rechazada no pueden ser negativas', 400);
        }
        if (payload.quantityApproved + payload.quantityRejected > payload.quantityInspected) {
            throw new AppError('Aprobada + rechazada no puede superar inspeccionada', 400);
        }
        if (payload.quantityInspected > batch.plannedQty) {
            throw new AppError(`Cantidad inspeccionada no puede superar el plan del lote (${batch.plannedQty})`, 400);
        }

        const controlledDoc = await this.resolveFinishedInspectionControlledDocument(payload.controlledDocumentId);
        const allChecksPassed =
            payload.sizeCheck &&
            payload.stitchingCheck &&
            payload.visualCheck &&
            payload.labelingCheck &&
            payload.productMatchesOrder;
        const passed =
            allChecksPassed &&
            payload.quantityRejected === 0 &&
            payload.quantityApproved > 0;

        batch.finishedInspectionFormData = {
            inspectorName: payload.inspectorName.trim(),
            verifierName: payload.verifierName.trim(),
            quantityInspected: payload.quantityInspected,
            quantityApproved: payload.quantityApproved,
            quantityRejected: payload.quantityRejected,
            sizeCheck: payload.sizeCheck,
            stitchingCheck: payload.stitchingCheck,
            visualCheck: payload.visualCheck,
            labelingCheck: payload.labelingCheck,
            productMatchesOrder: payload.productMatchesOrder,
            observations: payload.observations?.trim() || undefined,
            nonConformity: payload.nonConformity?.trim() || undefined,
            correctiveAction: payload.correctiveAction?.trim() || undefined,
            preventiveAction: payload.preventiveAction?.trim() || undefined,
        };
        batch.finishedInspectionFormCompleted = true;
        batch.finishedInspectionFormFilledBy = payload.actor?.trim() || payload.inspectorName.trim();
        batch.finishedInspectionFormFilledAt = new Date();
        batch.finishedInspectionFormDocumentId = controlledDoc.id;
        batch.finishedInspectionFormDocumentCode = controlledDoc.code;
        batch.finishedInspectionFormDocumentTitle = controlledDoc.title;
        batch.finishedInspectionFormDocumentVersion = controlledDoc.version;
        batch.finishedInspectionFormDocumentDate = controlledDoc.effectiveDate || controlledDoc.approvedAt || controlledDoc.updatedAt;
        batch.finishedInspectionStatus = passed
            ? ProductionBatchFinishedInspectionStatus.PASSED
            : ProductionBatchFinishedInspectionStatus.FAILED;
        batch.status = passed ? ProductionBatchStatus.QC_PASSED : ProductionBatchStatus.QC_PENDING;
        await this.em.persistAndFlush(batch);
        await this.reopenBatchReleaseIfNeeded(batch.id, 'Cambio de inspección final de producto');
        await this.logAudit('production_batch', batch.id, 'finished_inspection_form_updated', {
            passed,
            controlledDocumentCode: batch.finishedInspectionFormDocumentCode,
            controlledDocumentVersion: batch.finishedInspectionFormDocumentVersion,
            actor: payload.actor || payload.inspectorName,
        }, payload.actor || payload.inspectorName);
        return batch;
    }

    async getBatchFinishedInspectionForm(batchId: string) {
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
            formCompleted: Boolean(batch.finishedInspectionFormCompleted),
            formFilledBy: batch.finishedInspectionFormFilledBy,
            formFilledAt: batch.finishedInspectionFormFilledAt,
            documentControlCode: batch.finishedInspectionFormDocumentCode,
            documentControlTitle: batch.finishedInspectionFormDocumentTitle,
            documentControlVersion: batch.finishedInspectionFormDocumentVersion,
            documentControlDate: batch.finishedInspectionFormDocumentDate,
            inspectionStatus: batch.finishedInspectionStatus,
            data: batch.finishedInspectionFormData || null,
        };
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

    async setBatchUnitQc(unitId: string, passed: boolean, actor?: string) {
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
        await this.logAudit('production_batch_unit', unit.id, 'qc_updated', { passed }, actor);
        return unit;
    }

    async setBatchUnitPackaging(unitId: string, packaged: boolean, actor?: string) {
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
        await this.logAudit('production_batch_unit', unit.id, 'packaging_updated', { packaged }, actor);
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
        }, payload.actor || payload.operatorName);
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
        suggestedUnitPrice?: number,
        estimatedRequiredCost?: number,
        rawMaterialSpecification?: Pick<RawMaterialSpecification, 'id' | 'name' | 'sku' | 'widthCm'>,
        effectiveRollWidth?: number,
        bomRollWidth?: number,
        potentialSuppliers: { supplier: Supplier, lastPrice: number, lastDate: Date, isCheapest: boolean }[],
        pepsLots: { lotId: string; lotCode: string; warehouseId: string; warehouseName: string; available: number; receivedAt: Date; suggestedUse: number }[],
        selectedAllocation?: { lotId: string; lotCode: string; warehouseId: string; warehouseName: string; quantityRequested?: number }
    }[]> {
        const order = await this.productionOrderRepo.findOneOrFail({ id: orderId }, { populate: ['items', 'items.variant'] });
        return this.buildMaterialRequirements(
            order.items.getItems().map((item) => ({
                variantId: item.variant.id,
                quantity: Number(item.quantity),
            })),
            { orderId }
        );
    }

    async simulateMaterialRequirements(payload: z.infer<typeof SimulateProductionRequirementsSchema>) {
        return this.buildMaterialRequirements(payload.items);
    }

    async upsertMaterialAllocation(orderId: string, payload: z.infer<typeof UpsertProductionMaterialAllocationSchema>) {
        const order = await this.productionOrderRepo.findOneOrFail({ id: orderId }, { populate: ['items', 'items.variant', 'items.variant.bomItems', 'items.variant.bomItems.rawMaterial', 'items.variant.bomItems.rawMaterialSpecification'] });
        if ([ProductionOrderStatus.COMPLETED, ProductionOrderStatus.CANCELLED].includes(order.status)) {
            throw new AppError('No puedes cambiar asignación de lotes en una OP cerrada/cancelada', 400);
        }

        const requirements = await this.calculateMaterialRequirements(orderId);
        const req = requirements.find((row) => row.material.id === payload.rawMaterialId);
        if (!req) {
            throw new AppError('La materia prima no hace parte de los requerimientos de la OP', 400);
        }

        const row = await this.materialAllocationRepo.findOne({ productionOrder: orderId, rawMaterial: payload.rawMaterialId });
        if (!payload.lotId) {
            if (row) await this.em.removeAndFlush(row);
            return { productionOrderId: orderId, rawMaterialId: payload.rawMaterialId, lotId: null };
        }

        const lot = await this.rawMaterialLotRepo.findOne({ id: payload.lotId }, { populate: ['rawMaterial', 'rawMaterialSpecification', 'warehouse'] });
        if (!lot) throw new AppError('Lote de materia prima no encontrado', 404);
        if (lot.rawMaterial.id !== payload.rawMaterialId) {
            throw new AppError('El lote seleccionado no corresponde a la materia prima', 400);
        }
        if (req.rawMaterialSpecification?.id && lot.rawMaterialSpecification?.id !== req.rawMaterialSpecification.id) {
            throw new AppError(`El lote seleccionado no corresponde a la especificación requerida (${req.rawMaterialSpecification.name})`, 400);
        }
        if (lot.warehouse.type === WarehouseType.QUARANTINE) {
            throw new AppError('No puedes asignar un lote en cuarentena', 400);
        }
        if (Number(lot.quantityAvailable) <= 0) {
            throw new AppError('El lote seleccionado no tiene disponibilidad', 400);
        }
        if (payload.quantityRequested && Number(payload.quantityRequested) > Number(req.required)) {
            throw new AppError(`La cantidad solicitada no puede superar lo requerido (${Number(req.required).toFixed(4)})`, 400);
        }

        const entity = row || this.materialAllocationRepo.create({
            productionOrder: order,
            rawMaterial: this.em.getReference(RawMaterial, payload.rawMaterialId),
        } as unknown as ProductionMaterialAllocation);
        entity.lot = lot;
        entity.quantityRequested = payload.quantityRequested;
        entity.notes = payload.notes?.trim() || undefined;
        await this.em.persistAndFlush(entity);
        return entity;
    }

    async returnMaterialToWarehouse(orderId: string, payload: z.infer<typeof ReturnProductionMaterialSchema>) {
        return this.em.transactional(async (tx) => {
            const orderRepo = tx.getRepository(ProductionOrder);
            const lotRepo = tx.getRepository(RawMaterialLot);
            const kardexRepo = tx.getRepository(RawMaterialKardex);
            const inventoryRepo = tx.getRepository(InventoryItem);

            const order = await orderRepo.findOneOrFail({ id: orderId });
            if (order.status === ProductionOrderStatus.CANCELLED) {
                throw new AppError('No puedes registrar devoluciones sobre una OP cancelada', 400);
            }

            const lot = await lotRepo.findOne(
                { id: payload.lotId },
                { populate: ['rawMaterial', 'warehouse'] }
            );
            if (!lot) throw new AppError('Lote de materia prima no encontrado', 404);
            if (lot.rawMaterial.id !== payload.rawMaterialId) {
                throw new AppError('El lote no corresponde a la materia prima indicada', 400);
            }

            const [consumedRows, returnedRows] = await Promise.all([
                kardexRepo.find({
                    lot: lot.id,
                    rawMaterial: payload.rawMaterialId,
                    referenceType: 'production_order',
                    referenceId: order.id,
                    movementType: 'SALIDA_PRODUCCION',
                }),
                kardexRepo.find({
                    lot: lot.id,
                    rawMaterial: payload.rawMaterialId,
                    referenceType: 'production_order',
                    referenceId: order.id,
                    movementType: 'ENTRADA_DEVOLUCION_PRODUCCION',
                }),
            ]);

            const consumedQty = consumedRows.reduce((acc, row) => acc + Math.abs(Number(row.quantity || 0)), 0);
            const returnedQty = returnedRows.reduce((acc, row) => acc + Number(row.quantity || 0), 0);
            const availableToReturn = consumedQty - returnedQty;
            if (availableToReturn <= 0) {
                throw new AppError('No hay consumo pendiente por devolver para este lote en la OP', 400);
            }
            if (payload.quantity > availableToReturn) {
                throw new AppError(
                    `La devolución supera el máximo permitido para este lote en esta OP (${availableToReturn.toFixed(4)})`,
                    400
                );
            }

            const newLotBalance = Number(lot.quantityAvailable || 0) + Number(payload.quantity);
            lot.quantityAvailable = newLotBalance;

            let inventoryRow = await inventoryRepo.findOne({
                rawMaterial: lot.rawMaterial.id,
                rawMaterialSpecification: lot.rawMaterialSpecification?.id || null,
                warehouse: lot.warehouse.id,
            });
            if (!inventoryRow) {
                inventoryRow = inventoryRepo.create({
                    rawMaterial: lot.rawMaterial,
                    rawMaterialSpecification: lot.rawMaterialSpecification,
                    warehouse: lot.warehouse,
                    quantity: 0,
                } as unknown as InventoryItem);
            }
            inventoryRow.quantity = Number(inventoryRow.quantity || 0) + Number(payload.quantity);

            const kardex = kardexRepo.create({
                rawMaterial: lot.rawMaterial,
                rawMaterialSpecification: lot.rawMaterialSpecification,
                warehouse: lot.warehouse,
                lot,
                movementType: 'ENTRADA_DEVOLUCION_PRODUCCION',
                quantity: payload.quantity,
                balanceAfter: newLotBalance,
                referenceType: 'production_order',
                referenceId: order.id,
                notes: payload.notes?.trim() || `Devolución sobrante OP ${order.code}`,
                occurredAt: new Date(),
            } as unknown as RawMaterialKardex);

            tx.persist([lot, inventoryRow, kardex]);
            await tx.flush();
            await this.logAudit('raw_material_lot', lot.id, 'raw_material_returned_to_warehouse', {
                productionOrderId: order.id,
                productionOrderCode: order.code,
                rawMaterialId: payload.rawMaterialId,
                lotId: lot.id,
                quantity: Number(payload.quantity),
                actor: payload.actor,
            }, payload.actor);

            return {
                productionOrderId: order.id,
                rawMaterialId: payload.rawMaterialId,
                lotId: lot.id,
                returnedQuantity: Number(payload.quantity),
                availableToReturn: Number((availableToReturn - Number(payload.quantity)).toFixed(4)),
                newLotBalance: Number(newLotBalance.toFixed(4)),
            };
        });
    }

    async updateStatus(id: string, status: ProductionOrderStatus, warehouseId?: string, actor?: string): Promise<ProductionOrder> {
        return this.em.transactional(async (tx) => {
            const productionOrderRepo = tx.getRepository(ProductionOrder);
            const inventoryRepo = tx.getRepository(InventoryItem);
            const warehouseRepo = tx.getRepository(Warehouse);
            const order = await productionOrderRepo.findOneOrFail(
                { id },
                { populate: ['items', 'items.variant', 'items.variant.bomItems', 'items.variant.bomItems.rawMaterial', 'items.variant.bomItems.rawMaterialSpecification', 'batches', 'batches.units', 'salesOrder'] }
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
                const batchCompletedQuantities = new Map<string, number>();

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
                        let batchCompleted = 0;
                        if (units.length > 0) {
                            const allGood = units.every((u) => u.rejected || (u.qcPassed && u.packaged));
                            if (!allGood) {
                                throw new AppError(`El lote ${batch.code} tiene unidades sin liberar`, 400);
                            }
                            batchCompleted = units.filter((u) => !u.rejected && u.packaged).length;
                        } else {
                            batchCompleted = batch.producedQty > 0 ? batch.producedQty : batch.plannedQty;
                        }
                        totalCompleted += batchCompleted;
                        batchCompletedQuantities.set(batch.id, batchCompleted);
                    }
                    variantQuantities.set(variantId, totalCompleted);
                }

                const dispatchedByBatch = new Map<string, number>();
                const dispatchedByVariant = new Map<string, number>();
                if (batches.length > 0) {
                    const shipmentItemRepo = tx.getRepository(ShipmentItem);
                    const batchIdToVariant = new Map<string, string>();
                    for (const batch of batches) {
                        batchIdToVariant.set(batch.id, batch.variant.id);
                    }
                    const shipmentItems = await shipmentItemRepo.find(
                        { productionBatch: { $in: batches.map((b) => b.id) } },
                        { populate: ['productionBatch'] }
                    );
                    for (const item of shipmentItems) {
                        const batchId = item.productionBatch.id;
                        const variantId = batchIdToVariant.get(item.productionBatch.id);
                        if (!variantId) continue;
                        dispatchedByBatch.set(batchId, (dispatchedByBatch.get(batchId) || 0) + Number(item.quantity || 0));
                        const current = dispatchedByVariant.get(variantId) || 0;
                        dispatchedByVariant.set(variantId, current + Number(item.quantity || 0));
                    }
                }

                // Consume released raw materials based on actual completed production quantities.
                const materialRequirements = new Map<string, {
                    required: number;
                    remnantRecoverable: number;
                    materialName: string;
                    specificationId?: string;
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
                        const effectiveFabricationParams = this.resolveEffectiveFabricationParams(
                            bomItem.fabricationParams as {
                                calculationType?: 'area' | 'linear';
                                quantityPerUnit?: number;
                                rollWidth: number;
                                pieceWidth: number;
                                pieceLength: number;
                                orientation: 'normal' | 'rotated';
                            } | undefined,
                            bomItem.rawMaterialSpecification,
                        );
                        const breakdown = this.calculateFabricationConsumptionBreakdown(
                            Number(bomItem.quantity),
                            Number(producedQty),
                            effectiveFabricationParams
                        );
                        if (breakdown.requiredGross <= 0) {
                            continue;
                        }
                        const current = materialRequirements.get(rawMaterialId);
                        if (current) {
                            current.required += breakdown.requiredGross;
                            current.remnantRecoverable += breakdown.remnantRecoverable;
                        } else {
                            materialRequirements.set(rawMaterialId, {
                                required: breakdown.requiredGross,
                                remnantRecoverable: breakdown.remnantRecoverable,
                                materialName: bomItem.rawMaterial.name,
                                specificationId: bomItem.rawMaterialSpecification?.id,
                            });
                        }
                    }
                }

                if (materialRequirements.size > 0) {
                    const materialIds = Array.from(materialRequirements.keys());
                    await this.ensureLegacyLots(materialIds, tx);
                    const lotRepo = tx.getRepository(RawMaterialLot);
                    const kardexRepo = tx.getRepository(RawMaterialKardex);
                    const allocationRepo = tx.getRepository(ProductionMaterialAllocation);
                    const lots = await lotRepo.find(
                        {
                            rawMaterial: { $in: materialIds },
                            quantityAvailable: { $gt: 0 },
                            warehouse: { type: { $ne: WarehouseType.QUARANTINE } },
                        },
                        { populate: ['rawMaterial', 'rawMaterialSpecification', 'warehouse'], orderBy: [{ receivedAt: 'ASC' }, { createdAt: 'ASC' }] }
                    );

                    const lotsByMaterial = new Map<string, RawMaterialLot[]>();
                    for (const lot of lots) {
                        const materialId = lot.rawMaterial?.id;
                        if (!materialId) {
                            continue;
                        }
                        const rows = lotsByMaterial.get(materialId) || [];
                        rows.push(lot);
                        lotsByMaterial.set(materialId, rows);
                    }

                    const allocations = await allocationRepo.find(
                        { productionOrder: order.id, rawMaterial: { $in: materialIds }, lot: { $ne: null } },
                        { populate: ['lot', 'lot.warehouse'] }
                    );
                    const allocationByMaterial = new Map<string, ProductionMaterialAllocation>();
                    for (const row of allocations) {
                        allocationByMaterial.set(row.rawMaterial.id, row);
                    }

                    const consumedByMaterialWarehouse = new Map<string, number>();
                    const consumedByLot = new Map<string, {
                        qty: number;
                        lot: RawMaterialLot;
                    }>();
                    for (const [materialId, requirement] of materialRequirements.entries()) {
                        let pending = Number(requirement.required);
                        const rows = (lotsByMaterial.get(materialId) || []).filter((row) => {
                            if (!requirement.specificationId) return true;
                            return row.rawMaterialSpecification?.id === requirement.specificationId;
                        });
                        const available = rows.reduce((sum, row) => sum + Number(row.quantityAvailable), 0);
                        if (available < pending) {
                            throw new AppError(
                                `Stock insuficiente para consumir ${requirement.materialName}. Requerido: ${pending.toFixed(4)}, disponible: ${available.toFixed(4)}`,
                                400
                            );
                        }

                        const consumeFromLot = (lot: RawMaterialLot, maxQty: number) => {
                            if (maxQty <= 0) return 0;
                            const currentQty = Number(lot.quantityAvailable);
                            if (currentQty <= 0) return 0;
                            const consume = Math.min(currentQty, maxQty);
                            lot.quantityAvailable = currentQty - consume;
                            pending -= consume;
                            const key = `${materialId}::${lot.warehouse.id}::${lot.rawMaterialSpecification?.id || ''}`;
                            consumedByMaterialWarehouse.set(key, Number(consumedByMaterialWarehouse.get(key) || 0) + consume);
                            const lotKey = `${materialId}::${lot.id}`;
                            const consumedLot = consumedByLot.get(lotKey);
                            if (consumedLot) {
                                consumedLot.qty += consume;
                            } else {
                                consumedByLot.set(lotKey, { qty: consume, lot });
                            }
                            const kardex = kardexRepo.create({
                                rawMaterial: lot.rawMaterial,
                                warehouse: lot.warehouse,
                                lot,
                                movementType: 'SALIDA_PRODUCCION',
                                quantity: -consume,
                                balanceAfter: Number(lot.quantityAvailable),
                                referenceType: 'production_order',
                                referenceId: order.id,
                                notes: `Consumo OP ${order.code}`,
                                occurredAt: new Date(),
                            } as unknown as RawMaterialKardex);
                            tx.persist([lot, kardex]);
                            return consume;
                        };

                        const allocation = allocationByMaterial.get(materialId);
                        if (allocation?.lot) {
                            const selectedLot = rows.find((row) => row.id === allocation.lot?.id);
                            if (selectedLot) {
                                const desired = Number(allocation.quantityRequested || requirement.required);
                                const requested = Math.min(desired, Number(requirement.required));
                                const taken = consumeFromLot(selectedLot, requested);
                                if (taken < requested) {
                                    throw new AppError(
                                        `El lote asignado (${selectedLot.supplierLotCode}) no tiene suficiente para ${requirement.materialName}. Requerido asignado: ${requested.toFixed(4)}, disponible: ${Number(selectedLot.quantityAvailable + taken).toFixed(4)}`,
                                        400
                                    );
                                }
                            }
                        }

                        for (const lot of rows) {
                            if (pending <= 0) {
                                break;
                            }
                            if (allocation?.lot && lot.id === allocation.lot.id) continue;
                            consumeFromLot(lot, pending);
                        }
                    }

                    const remnantByMaterial = new Map<string, number>();
                    for (const [materialId, requirement] of materialRequirements.entries()) {
                        const remnant = Math.max(0, Number(requirement.remnantRecoverable || 0));
                        if (remnant > 0) {
                            remnantByMaterial.set(materialId, remnant);
                        }
                    }

                    if (remnantByMaterial.size > 0) {
                        for (const [materialId, totalRemnant] of remnantByMaterial.entries()) {
                            let pendingRemnant = totalRemnant;
                            const materialLotConsumptions = Array.from(consumedByLot.entries())
                                .filter(([key]) => key.startsWith(`${materialId}::`))
                                .map(([, value]) => value)
                                .sort((a, b) => b.qty - a.qty);

                            for (let i = 0; i < materialLotConsumptions.length && pendingRemnant > 0; i += 1) {
                                const consumed = materialLotConsumptions[i];
                                if (!consumed?.lot || consumed.qty <= 0) continue;

                                const remnantFromLot = Math.min(pendingRemnant, consumed.qty);
                                if (remnantFromLot <= 0) continue;

                                const sourceLot = consumed.lot;
                                const remCode = `${sourceLot.supplierLotCode}-REM-${Date.now().toString(36).toUpperCase()}${i > 0 ? `-${i + 1}` : ''}`;
                                const remLot = lotRepo.create({
                                    rawMaterial: sourceLot.rawMaterial,
                                    warehouse: sourceLot.warehouse,
                                    supplierLotCode: remCode.slice(0, 120),
                                    quantityInitial: Number(remnantFromLot.toFixed(4)),
                                    quantityAvailable: Number(remnantFromLot.toFixed(4)),
                                    unitCost: sourceLot.unitCost,
                                    receivedAt: new Date(),
                                    notes: `Remanente recuperable generado en OP ${order.code} desde lote ${sourceLot.supplierLotCode}`,
                                } as unknown as RawMaterialLot);
                                tx.persist(remLot);

                                const row = await inventoryRepo.findOne({
                                    rawMaterial: materialId,
                                    warehouse: sourceLot.warehouse.id,
                                });
                                if (row) {
                                    row.quantity = Number((Number(row.quantity) + remnantFromLot).toFixed(4));
                                } else {
                                    const created = inventoryRepo.create({
                                        rawMaterial: sourceLot.rawMaterial,
                                        warehouse: sourceLot.warehouse,
                                        quantity: Number(remnantFromLot.toFixed(4)),
                                        lastUpdated: new Date(),
                                    } as unknown as InventoryItem);
                                    tx.persist(created);
                                }

                                const balanceAfter = row
                                    ? Number(row.quantity)
                                    : Number(remnantFromLot.toFixed(4));
                                const remKardex = kardexRepo.create({
                                    rawMaterial: sourceLot.rawMaterial,
                                    warehouse: sourceLot.warehouse,
                                    lot: remLot,
                                    movementType: 'REMANENTE_PRODUCCION',
                                    quantity: Number(remnantFromLot.toFixed(4)),
                                    balanceAfter,
                                    referenceType: 'production_order',
                                    referenceId: order.id,
                                    notes: `Remanente recuperable OP ${order.code}`,
                                    occurredAt: new Date(),
                                } as unknown as RawMaterialKardex);
                                tx.persist(remKardex);

                                pendingRemnant = Number((pendingRemnant - remnantFromLot).toFixed(4));
                            }
                        }
                    }

                    for (const [key, consumedQty] of consumedByMaterialWarehouse.entries()) {
                        const [materialId, warehouseRowId, specificationId] = key.split('::');
                        const inventoryRow = await inventoryRepo.findOne({
                            rawMaterial: materialId,
                            warehouse: warehouseRowId,
                            rawMaterialSpecification: specificationId || null,
                        });
                        if (!inventoryRow) {
                            throw new AppError(`No existe inventario agregado para material ${materialId} en bodega ${warehouseRowId}`, 400);
                        }
                        const currentQty = Number(inventoryRow.quantity);
                        if (currentQty < consumedQty) {
                            throw new AppError(`Inconsistencia de inventario para material ${materialId} en bodega ${warehouseRowId}`, 400);
                        }
                        inventoryRow.quantity = currentQty - consumedQty;
                        tx.persist(inventoryRow);
                    }

                    for (const [materialId, requirement] of materialRequirements.entries()) {
                        await this.logAudit('raw_material_lot', materialId, 'raw_material_consumed_by_production', {
                            productionOrderId: order.id,
                            productionOrderCode: order.code,
                            rawMaterialId: materialId,
                            required: Number(requirement.required),
                        }, actor);
                    }
                }

                // Get or create warehouse for finished goods
                let warehouse: Warehouse | null = null;
                if (warehouseId) {
                    warehouse = await warehouseRepo.findOne({ id: warehouseId });
                }

                if (!warehouse) {
                    warehouse = await warehouseRepo.findOne({ type: WarehouseType.FINISHED_GOODS });
                }

                if (!warehouse) {
                    warehouse = warehouseRepo.create({
                        name: 'Bodega de Producto Terminado',
                        location: 'Default',
                        type: WarehouseType.FINISHED_GOODS
                    } as Warehouse);
                    tx.persist(warehouse);
                }

                const lotInventoryRepo = tx.getRepository(FinishedGoodsLotInventory);
                for (const batch of batches) {
                    const completedQty = batchCompletedQuantities.get(batch.id) || 0;
                    const dispatchedQty = dispatchedByBatch.get(batch.id) || 0;
                    const netQty = Math.max(0, Number(completedQty) - Number(dispatchedQty));
                    if (netQty <= 0) continue;

                    let lotInventory = await lotInventoryRepo.findOne({
                        productionBatch: batch.id,
                        warehouse
                    });
                    if (lotInventory) {
                        lotInventory.quantity = Number(lotInventory.quantity) + Number(netQty);
                    } else {
                        lotInventory = lotInventoryRepo.create({
                            productionBatch: batch,
                            warehouse,
                            quantity: netQty
                        } as any);
                    }
                    tx.persist(lotInventory);
                }

                for (const item of order.items) {
                    const completedQty = variantQuantities.get(item.variant.id) ?? item.quantity;
                    const dispatchedQty = dispatchedByVariant.get(item.variant.id) || 0;
                    const netQty = Math.max(0, Number(completedQty) - Number(dispatchedQty));
                    if (netQty <= 0) {
                        continue;
                    }
                    let inventoryItem = await inventoryRepo.findOne({
                        variant: item.variant,
                        warehouse
                    });

                    if (inventoryItem) {
                        inventoryItem.quantity = Number(inventoryItem.quantity) + Number(netQty);
                    } else {
                        inventoryItem = inventoryRepo.create({
                            variant: item.variant,
                            warehouse,
                            quantity: netQty,
                            lastUpdated: new Date()
                        } as unknown as InventoryItem);
                    }
                    tx.persist(inventoryItem);
                }
            }

            if (order.salesOrder) {
                await this.syncSalesOrderStatus(order.salesOrder.id, tx);
            }

            await tx.flush();
            await this.logAudit('production_order', order.id, 'status_updated', { status, code: order.code }, actor);
            return order;
        });
    }

    private async ensureLegacyLots(materialIds: string[], em?: EntityManager) {
        if (materialIds.length === 0) return;
        const manager = em ?? this.em;
        const lotRepo = manager.getRepository(RawMaterialLot);
        const inventoryRepo = manager.getRepository(InventoryItem);

        const inventories = await inventoryRepo.find(
            {
                rawMaterial: { $in: materialIds },
                quantity: { $gt: 0 },
                warehouse: { type: { $ne: WarehouseType.QUARANTINE } },
            },
            { populate: ['rawMaterial', 'warehouse'] }
        );

        const toPersist: RawMaterialLot[] = [];
        for (const inv of inventories) {
            if (!inv.rawMaterial || !inv.warehouse) continue;
            const code = `LEGACY-${inv.id.slice(0, 8).toUpperCase()}`;
            const exists = await lotRepo.findOne({
                rawMaterial: inv.rawMaterial.id,
                warehouse: inv.warehouse.id,
                supplierLotCode: code,
            });
            if (exists) continue;
            const lot = lotRepo.create({
                rawMaterial: inv.rawMaterial,
                warehouse: inv.warehouse,
                supplierLotCode: code,
                quantityInitial: Number(inv.quantity),
                quantityAvailable: Number(inv.quantity),
                unitCost: Number(inv.rawMaterial.averageCost || inv.rawMaterial.lastPurchasePrice || 0),
                receivedAt: inv.lastUpdated || inv.createdAt,
                notes: 'Lote legacy generado automáticamente para trazabilidad PEPS.',
            } as unknown as RawMaterialLot);
            toPersist.push(lot);
        }
        if (toPersist.length > 0) {
            await manager.persistAndFlush(toPersist);
        }
    }

    private async logAudit(
        entityType: string,
        entityId: string,
        action: string,
        metadata?: Record<string, unknown>,
        actor?: string,
        manager?: EntityManager
    ) {
        const repo = (manager ?? this.em).getRepository(QualityAuditEvent);
        const event = repo.create({
            entityType,
            entityId,
            action,
            actor,
            metadata,
        } as unknown as QualityAuditEvent);
        await (manager ?? this.em).persistAndFlush(event);
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
            if (selected.status !== DocumentStatus.APROBADO) {
                throw new AppError('El documento seleccionado debe estar aprobado', 400);
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

    private async resolveFinishedInspectionControlledDocument(controlledDocumentId?: string) {
        const docRepo = this.em.getRepository(ControlledDocument);
        if (controlledDocumentId) {
            const selected = await docRepo.findOne({ id: controlledDocumentId });
            if (!selected) {
                throw new AppError('Documento controlado no encontrado para FOR de inspección final', 404);
            }
            if (selected.status !== DocumentStatus.APROBADO) {
                throw new AppError('El documento seleccionado debe estar aprobado', 400);
            }
            return selected;
        }

        const configs = await this.operationalConfigRepo.findAll({ limit: 1, orderBy: { createdAt: 'DESC' } });
        const config = configs[0];
        const configuredCode = config?.defaultFinishedInspectionControlledDocumentCode?.trim();
        if (!configuredCode) {
            throw new AppError('Debes configurar el formato global de inspección final en Órdenes de Producción (engranaje)', 400);
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
            throw new AppError(`El formato global de inspección final (${configuredCode}) no está aprobado/vigente`, 400);
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
