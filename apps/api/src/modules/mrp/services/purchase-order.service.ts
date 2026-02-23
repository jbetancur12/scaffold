import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../entities/purchase-order-item.entity';
import { Supplier } from '../entities/supplier.entity';
import { RawMaterial } from '../entities/raw-material.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { IncomingInspection } from '../entities/incoming-inspection.entity';
import { SupplierMaterial } from '../entities/supplier-material.entity';
import { Warehouse } from '../entities/warehouse.entity';
import { DocumentCategory, DocumentProcess, DocumentStatus, PurchaseOrderStatus, WarehouseType } from '@scaffold/types';
import type { CreatePurchaseOrderDto } from '@scaffold/schemas';
import { AppError } from '../../../shared/utils/response';
import { ControlledDocument } from '../entities/controlled-document.entity';
import { OperationalConfig } from '../entities/operational-config.entity';

export class PurchaseOrderService {
    private purchaseOrderRepo: EntityRepository<PurchaseOrder>;
    private purchaseOrderItemRepo: EntityRepository<PurchaseOrderItem>;
    private supplierRepo: EntityRepository<Supplier>;
    private rawMaterialRepo: EntityRepository<RawMaterial>;
    private incomingInspectionRepo: EntityRepository<IncomingInspection>;

    constructor(
        private em: EntityManager
    ) {
        this.purchaseOrderRepo = em.getRepository(PurchaseOrder);
        this.purchaseOrderItemRepo = em.getRepository(PurchaseOrderItem);
        this.supplierRepo = em.getRepository(Supplier);
        this.rawMaterialRepo = em.getRepository(RawMaterial);
        this.incomingInspectionRepo = em.getRepository(IncomingInspection);
    }

    async createPurchaseOrder(data: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
        // Fetch supplier
        const supplier = await this.supplierRepo.findOneOrFail({ id: data.supplierId });
        const controlDocument = await this.resolvePurchaseOrderControlDocument(data.controlledDocumentId);

        // Create purchase order
        const purchaseOrder = this.purchaseOrderRepo.create({
            supplier,
            controlledDocumentId: controlDocument?.id,
            expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : undefined,
            notes: data.notes,
            status: PurchaseOrderStatus.PENDING,
            purchaseType: data.purchaseType,
            paymentMethod: data.paymentMethod,
            currency: data.currency || 'COP',
            documentControlCode: controlDocument?.code || 'GP-FOR-04',
            documentControlTitle: controlDocument?.title || 'Orden de Compra de Materias Primas e Insumos',
            documentControlVersion: controlDocument?.version || 1,
            documentControlDate: controlDocument?.effectiveDate || controlDocument?.approvedAt || new Date(),
        } as PurchaseOrder);

        let totalAmount = 0;
        let taxTotal = 0;
        let subtotalBase = 0;

        // Create purchase order items
        for (const itemData of data.items) {
            const isCatalogItem = itemData.isCatalogItem !== false;
            const rawMaterial = isCatalogItem ? await this.rawMaterialRepo.findOneOrFail({ id: itemData.rawMaterialId }) : undefined;

            const subtotal = itemData.quantity * itemData.unitPrice;
            const taxAmount = itemData.taxAmount || 0;
            const itemTotal = subtotal + taxAmount;

            subtotalBase += subtotal;
            taxTotal += taxAmount;
            totalAmount += itemTotal;

            const item = this.purchaseOrderItemRepo.create({
                purchaseOrder,
                isCatalogItem,
                rawMaterial,
                customDescription: !isCatalogItem ? itemData.customDescription?.trim() : undefined,
                customUnit: !isCatalogItem ? itemData.customUnit?.trim() : undefined,
                isInventoriable: itemData.isInventoriable ?? isCatalogItem,
                quantity: itemData.quantity,
                unitPrice: itemData.unitPrice,
                taxAmount,
                subtotal: itemTotal,
            } as PurchaseOrderItem);

            purchaseOrder.items.add(item);
        }

        const discountAmount = Number(data.discountAmount || 0);
        const otherChargesAmount = Number(data.otherChargesAmount || 0);
        const withholdingRate = Number(data.withholdingRate || 0);
        const taxableBase = Math.max(0, subtotalBase - discountAmount);
        const withholdingAmount = Number(
            data.withholdingAmount !== undefined
                ? data.withholdingAmount
                : taxableBase * (withholdingRate / 100)
        );
        const grossTotal = Math.max(0, totalAmount - discountAmount + otherChargesAmount);
        const netTotalAmount = Number(
            data.netTotalAmount !== undefined
                ? data.netTotalAmount
                : Math.max(0, grossTotal - withholdingAmount)
        );

        purchaseOrder.subtotalBase = subtotalBase;
        purchaseOrder.taxTotal = taxTotal;
        purchaseOrder.totalAmount = grossTotal;
        purchaseOrder.discountAmount = discountAmount;
        purchaseOrder.otherChargesAmount = otherChargesAmount;
        purchaseOrder.withholdingRate = withholdingRate;
        purchaseOrder.withholdingAmount = withholdingAmount;
        purchaseOrder.netTotalAmount = netTotalAmount;

        await this.em.persistAndFlush(purchaseOrder);
        return purchaseOrder;
    }

    private async resolvePurchaseOrderControlDocument(controlledDocumentId?: string) {
        if (controlledDocumentId) {
            const selected = await this.findPurchaseOrderControlledDocumentById(controlledDocumentId);
            if (!selected) {
                throw new AppError('El documento de control seleccionado no está aprobado o no corresponde a formato de producción', 400);
            }
            return selected;
        }
        const [config] = await this.em.find(OperationalConfig, {}, { orderBy: { createdAt: 'DESC' }, limit: 1 });
        if (config?.defaultPurchaseOrderControlledDocumentCode) {
            const configuredByCode = await this.findActivePurchaseOrderControlDocumentByCode(config.defaultPurchaseOrderControlledDocumentCode);
            if (configuredByCode) return configuredByCode;
        }
        if (config?.defaultPurchaseOrderControlledDocumentId) {
            const configured = await this.findPurchaseOrderControlledDocumentById(config.defaultPurchaseOrderControlledDocumentId);
            if (configured) return configured;
        }
        return this.findActivePurchaseOrderControlDocument();
    }

    private async findPurchaseOrderControlledDocumentById(id: string) {
        return this.em.findOne(ControlledDocument, {
            id,
            process: DocumentProcess.PRODUCCION,
            documentCategory: DocumentCategory.FOR,
            status: DocumentStatus.APROBADO,
        });
    }

    private async findActivePurchaseOrderControlDocument() {
        const now = new Date();
        return this.em.findOne(ControlledDocument, {
            process: DocumentProcess.PRODUCCION,
            documentCategory: DocumentCategory.FOR,
            status: DocumentStatus.APROBADO,
            $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
            $and: [{ $or: [{ effectiveDate: null }, { effectiveDate: { $lte: now } }] }],
        }, {
            orderBy: [{ version: 'DESC' }, { approvedAt: 'DESC' }],
        });
    }

    private async findActivePurchaseOrderControlDocumentByCode(code: string) {
        const now = new Date();
        return this.em.findOne(ControlledDocument, {
            code,
            process: DocumentProcess.PRODUCCION,
            documentCategory: DocumentCategory.FOR,
            status: DocumentStatus.APROBADO,
            $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
            $and: [{ $or: [{ effectiveDate: null }, { effectiveDate: { $lte: now } }] }],
        }, {
            orderBy: [{ version: 'DESC' }, { approvedAt: 'DESC' }],
        });
    }

    async getPurchaseOrder(id: string): Promise<PurchaseOrder | null> {
        return this.purchaseOrderRepo.findOne(
            { id },
            { populate: ['supplier', 'items', 'items.rawMaterial'] }
        );
    }

    async listPurchaseOrders(
        page: number = 1,
        limit: number = 10,
        filters?: { status?: PurchaseOrderStatus; supplierId?: string }
    ): Promise<{ data: PurchaseOrder[]; total: number; page: number; limit: number }> {
        const where: Record<string, unknown> = {};

        if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.supplierId) {
            where.supplier = { id: filters.supplierId };
        }

        const [data, total] = await this.purchaseOrderRepo.findAndCount(where, {
            populate: ['supplier', 'items'],
            limit,
            offset: (page - 1) * limit,
            orderBy: { orderDate: 'DESC' },
        });

        return { data, total, page, limit };
    }

    async updateStatus(id: string, status: PurchaseOrderStatus): Promise<PurchaseOrder> {
        const purchaseOrder = await this.purchaseOrderRepo.findOneOrFail({ id });
        purchaseOrder.status = status;

        if (status === PurchaseOrderStatus.CANCELLED) {
            // No inventory changes for cancelled orders
        }

        await this.em.persistAndFlush(purchaseOrder);
        return purchaseOrder;
    }

    async receivePurchaseOrder(id: string, warehouseId?: string): Promise<PurchaseOrder> {
        return this.em.transactional(async (tx) => {
            const purchaseOrderRepo = tx.getRepository(PurchaseOrder);
            const purchaseOrder = await purchaseOrderRepo.findOneOrFail(
                { id },
                { populate: ['supplier', 'items', 'items.rawMaterial'] }
            );

            if (purchaseOrder.status === PurchaseOrderStatus.RECEIVED) {
                throw new AppError('La orden de compra ya fue recibida', 409);
            }

            if (purchaseOrder.status === PurchaseOrderStatus.CANCELLED) {
                throw new AppError('No se puede recibir una orden de compra cancelada', 400);
            }

            for (const item of purchaseOrder.items) {
                if (!item.rawMaterial || item.isInventoriable === false) {
                    continue;
                }
                await this.updateQuarantineInventory(tx, item, warehouseId);
                await this.createIncomingInspection(tx, purchaseOrder, item, warehouseId);
                await this.updateLastPurchaseInfo(tx, purchaseOrder.supplier, item);
            }

            purchaseOrder.status = PurchaseOrderStatus.RECEIVED;
            purchaseOrder.receivedDate = new Date();

            await tx.persistAndFlush(purchaseOrder);
            return purchaseOrder;
        });
    }

    private async updateLastPurchaseInfo(em: EntityManager, supplier: Supplier, item: PurchaseOrderItem): Promise<void> {
        if (!item.rawMaterial) return;
        // Price with tax = (Base Price * Qty + Tax) / Qty
        // Note: item.subtotal already includes taxAmount (see createPurchaseOrder)
        const purchasePriceWithTax = item.quantity > 0 ? Number(item.subtotal) / Number(item.quantity) : Number(item.unitPrice);

        // Update global last purchase on raw material
        item.rawMaterial.lastPurchasePrice = purchasePriceWithTax;
        item.rawMaterial.lastPurchaseDate = new Date();
        item.rawMaterial.supplier = supplier;

        // Upsert SupplierMaterial link
        const supplierMaterialRepo = em.getRepository(SupplierMaterial);
        let supplierMaterial = await supplierMaterialRepo.findOne({
            supplier: { id: supplier.id },
            rawMaterial: { id: item.rawMaterial.id },
        });

        if (!supplierMaterial) {
            supplierMaterial = supplierMaterialRepo.create({
                supplier,
                rawMaterial: item.rawMaterial,
                lastPurchasePrice: purchasePriceWithTax,
                lastPurchaseDate: new Date(),
            } as SupplierMaterial);
        } else {
            supplierMaterial.lastPurchasePrice = purchasePriceWithTax;
            supplierMaterial.lastPurchaseDate = new Date();
        }

        await em.persistAndFlush([item.rawMaterial, supplierMaterial]);
    }

    private async updateQuarantineInventory(em: EntityManager, item: PurchaseOrderItem, warehouseId?: string): Promise<void> {
        if (!item.rawMaterial) return;
        // Get or create quarantine warehouse
        const warehouseRepo = em.getRepository(Warehouse);
        const inventoryRepo = em.getRepository(InventoryItem);
        let warehouse: Warehouse | null = null;

        if (warehouseId) {
            warehouse = await warehouseRepo.findOne({ id: warehouseId });
        }

        if (!warehouse || warehouse.type !== WarehouseType.QUARANTINE) {
            warehouse = await warehouseRepo.findOne({ type: WarehouseType.QUARANTINE });
        }

        if (!warehouse) {
            warehouse = warehouseRepo.create({
                name: 'Cuarentena',
                location: 'Zona de inspección',
                type: WarehouseType.QUARANTINE,
            } as Warehouse);
            await em.persistAndFlush(warehouse);
        }

        // Find or create inventory record for this raw material
        let inventory = await inventoryRepo.findOne({
            rawMaterial: { id: item.rawMaterial.id },
            warehouse: { id: warehouse.id },
        });

        if (!inventory) {
            inventory = inventoryRepo.create({
                warehouse,
                rawMaterial: item.rawMaterial,
                quantity: item.quantity,
            } as InventoryItem);
        } else {
            inventory.quantity += item.quantity;
        }

        await em.persistAndFlush(inventory);
    }

    private async createIncomingInspection(em: EntityManager, purchaseOrder: PurchaseOrder, item: PurchaseOrderItem, warehouseId?: string) {
        if (!item.rawMaterial) return;
        const warehouseRepo = em.getRepository(Warehouse);
        let warehouse: Warehouse | null = null;
        if (warehouseId) {
            warehouse = await warehouseRepo.findOne({ id: warehouseId });
        }
        if (!warehouse || warehouse.type !== WarehouseType.QUARANTINE) {
            warehouse = await warehouseRepo.findOne({ type: WarehouseType.QUARANTINE });
        }
        if (!warehouse) {
            warehouse = warehouseRepo.create({
                name: 'Cuarentena',
                location: 'Zona de inspección',
                type: WarehouseType.QUARANTINE,
            } as Warehouse);
            await em.persistAndFlush(warehouse);
        }

        const inspection = this.incomingInspectionRepo.create({
            purchaseOrder,
            purchaseOrderItem: item,
            rawMaterial: item.rawMaterial,
            warehouse,
            quantityReceived: item.quantity,
            quantityAccepted: 0,
            quantityRejected: 0,
        } as unknown as IncomingInspection);
        await em.persistAndFlush(inspection);
    }

    async cancelPurchaseOrder(id: string): Promise<void> {
        const purchaseOrder = await this.purchaseOrderRepo.findOneOrFail({ id });

        if (purchaseOrder.status === PurchaseOrderStatus.RECEIVED) {
            throw new AppError('No se puede cancelar una orden de compra ya recibida', 400);
        }

        purchaseOrder.status = PurchaseOrderStatus.CANCELLED;
        await this.em.persistAndFlush(purchaseOrder);
    }
}
