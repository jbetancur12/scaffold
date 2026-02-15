import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../entities/purchase-order-item.entity';
import { Supplier } from '../entities/supplier.entity';
import { RawMaterial } from '../entities/raw-material.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { IncomingInspection } from '../entities/incoming-inspection.entity';
import { SupplierMaterial } from '../entities/supplier-material.entity';
import { Warehouse } from '../entities/warehouse.entity';
import { PurchaseOrderStatus, WarehouseType } from '@scaffold/types';
import type { CreatePurchaseOrderDto } from '@scaffold/schemas';
import { AppError } from '../../../shared/utils/response';

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

        // Create purchase order
        const purchaseOrder = this.purchaseOrderRepo.create({
            supplier,
            expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : undefined,
            notes: data.notes,
            status: PurchaseOrderStatus.PENDING,
        } as PurchaseOrder);

        let totalAmount = 0;
        let taxTotal = 0;
        let subtotalBase = 0;

        // Create purchase order items
        for (const itemData of data.items) {
            const rawMaterial = await this.rawMaterialRepo.findOneOrFail({ id: itemData.rawMaterialId });

            const subtotal = itemData.quantity * itemData.unitPrice;
            const taxAmount = itemData.taxAmount || 0;
            const itemTotal = subtotal + taxAmount;

            subtotalBase += subtotal;
            taxTotal += taxAmount;
            totalAmount += itemTotal;

            const item = this.purchaseOrderItemRepo.create({
                purchaseOrder,
                rawMaterial,
                quantity: itemData.quantity,
                unitPrice: itemData.unitPrice,
                taxAmount,
                subtotal: itemTotal,
            } as PurchaseOrderItem);

            purchaseOrder.items.add(item);
        }

        purchaseOrder.subtotalBase = subtotalBase;
        purchaseOrder.taxTotal = taxTotal;
        purchaseOrder.totalAmount = totalAmount;

        await this.em.persistAndFlush(purchaseOrder);
        return purchaseOrder;
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
        // Price with tax = (Base Price * Qty + Tax) / Qty
        // Note: item.subtotal already includes taxAmount (see createPurchaseOrder)
        const purchasePriceWithTax = item.quantity > 0 ? Number(item.subtotal) / Number(item.quantity) : Number(item.unitPrice);

        // Update global last purchase on raw material
        item.rawMaterial.lastPurchasePrice = purchasePriceWithTax;
        item.rawMaterial.lastPurchaseDate = new Date();

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
