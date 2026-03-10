import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { SalesOrder } from '../entities/sales-order.entity';
import { SalesOrderItem } from '../entities/sales-order-item.entity';
import { Customer } from '../entities/customer.entity';
import { Product } from '../entities/product.entity';
import { ProductVariant } from '../entities/product-variant.entity';
import { Quotation } from '../entities/quotation.entity';
import { OperationalConfig } from '../entities/operational-config.entity';
import { CancellationSettlement, CreateSalesOrderPayload, ProductionOrderStatus, QuotationItemLineType, QuotationStatus, SalesOrderStatus, WarehouseType } from '@scaffold/types';
import { ProductionOrder } from '../entities/production-order.entity';
import { ProductionOrderItem } from '../entities/production-order-item.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { Warehouse } from '../entities/warehouse.entity';
import { AppError } from '../../../shared/utils/response';
import type { CancelSalesOrderWithSettlementPayload } from '@scaffold/schemas';

export class SalesOrderService {
    private salesOrderRepo: EntityRepository<SalesOrder>;

    constructor(
        private em: EntityManager
    ) {
        this.salesOrderRepo = em.getRepository(SalesOrder);
    }

    private getQuotationStatusFromItems(quotation: Quotation) {
        const items = quotation.items.getItems().filter((item) => item.lineType !== QuotationItemLineType.NOTE);
        if (items.length === 0) return QuotationStatus.DRAFT;
        const approvedItems = items.filter((item) => item.approved && Number(item.approvedQuantity || 0) > 0);
        if (approvedItems.length === 0) return QuotationStatus.REJECTED;
        if (approvedItems.length === items.length && items.every((item) => Number(item.approvedQuantity || 0) >= Number(item.quantity || 0))) {
            return QuotationStatus.APPROVED_FULL;
        }
        return QuotationStatus.APPROVED_PARTIAL;
    }

    private async revertQuotationConversion(order: SalesOrder, tx: EntityManager) {
        const quotationRepo = tx.getRepository(Quotation);
        const quotation = await quotationRepo.findOne(
            { convertedSalesOrder: order.id },
            { populate: ['items', 'items.product', 'items.variant'] }
        );
        if (!quotation) return;

        const remainingToRevert = new Map<string, number>();
        for (const orderItem of order.items.getItems()) {
            const key = `${orderItem.product.id}:${orderItem.variant?.id || ''}`;
            remainingToRevert.set(key, Number(remainingToRevert.get(key) || 0) + Number(orderItem.quantity || 0));
        }

        for (const quotationItem of quotation.items.getItems()) {
            const key = `${quotationItem.product?.id || ''}:${quotationItem.variant?.id || ''}`;
            const pending = Number(remainingToRevert.get(key) || 0);
            if (pending <= 0) continue;
            const currentConverted = Number(quotationItem.convertedQuantity || 0);
            if (currentConverted <= 0) continue;
            const revertQty = Math.min(currentConverted, pending);
            quotationItem.convertedQuantity = currentConverted - revertQty;
            remainingToRevert.set(key, pending - revertQty);
        }

        quotation.convertedSalesOrder = undefined;
        quotation.status = this.getQuotationStatusFromItems(quotation);
        tx.persist(quotation);
    }

    private async cancelPendingProductionOrders(order: SalesOrder, tx: EntityManager) {
        const linkedProductionOrders = order.productionOrders.getItems();
        const blockingOrder = linkedProductionOrders.find((productionOrder) =>
            productionOrder.status === ProductionOrderStatus.IN_PROGRESS ||
            productionOrder.status === ProductionOrderStatus.COMPLETED
        );

        if (blockingOrder) {
            throw new AppError(
                'El pedido ya tiene producción iniciada o finalizada. Debes liquidar/cerrar manualmente la producción antes de cancelar el pedido.',
                409
            );
        }

        for (const productionOrder of linkedProductionOrders) {
            if ([ProductionOrderStatus.DRAFT, ProductionOrderStatus.PLANNED].includes(productionOrder.status)) {
                productionOrder.status = ProductionOrderStatus.CANCELLED;
                tx.persist(productionOrder);
            }
        }
    }

    async getSalesOrders(page: number = 1, limit: number = 10, search?: string, status?: SalesOrderStatus) {
        const query: any = {};
        if (search) {
            query.$or = [
                { code: { $ilike: `%${search}%` } },
                { customer: { name: { $ilike: `%${search}%` } } }
            ];
        }
        if (status) {
            query.status = status;
        }

        const [data, total] = await this.salesOrderRepo.findAndCount(query, {
            populate: ['customer'],
            limit,
            offset: (page - 1) * limit,
            orderBy: { createdAt: 'DESC' }
        });

        return {
            data,
            total,
            page,
            limit
        };
    }

    async getSalesOrderById(id: string) {
        return this.salesOrderRepo.findOneOrFail({ id }, {
            populate: [
                'customer',
                'items.product',
                'items.variant',
                'productionOrders',
                'productionOrders.items',
                'productionOrders.items.variant',
            ]
        });
    }

    async createSalesOrder(data: CreateSalesOrderPayload): Promise<SalesOrder> {
        return this.em.transactional(async (tx) => {
            const customer = await tx.getRepository(Customer).findOneOrFail({ id: data.customerId });

            const salesOrder = tx.getRepository(SalesOrder).create({
                customer,
                orderDate: new Date(),
                expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : undefined,
                status: SalesOrderStatus.PENDING,
                notes: data.notes,
                totalAmount: 0,
                subtotalBase: 0,
                taxTotal: 0,
                discountAmount: 0,
                netTotalAmount: 0
            } as SalesOrder);

            // Fetch operational config and lock it safely
            let [config] = await tx.find(OperationalConfig, {}, { orderBy: { createdAt: 'DESC' }, limit: 1, lockMode: 4 });

            if (!config) {
                config = tx.getRepository(OperationalConfig).create({
                    operatorSalary: 0,
                    operatorLoadFactor: 1.5,
                    operatorRealMonthlyMinutes: 9600,
                    rent: 0,
                    utilities: 0,
                    adminSalaries: 0,
                    otherExpenses: 0,
                    numberOfOperators: 1,
                    modCostPerMinute: 0,
                    cifCostPerMinute: 0,
                    costPerMinute: 0,
                    purchasePaymentMethods: [],
                    purchaseWithholdingRules: [],
                    salesOrderPrefix: 'PED',
                    salesOrderSequence: 0
                } as unknown as OperationalConfig);
                await tx.persistAndFlush(config);
            }

            const prefix = config.salesOrderPrefix || 'PED';
            const nextNumber = (config.salesOrderSequence || 0) + 1;

            config.salesOrderSequence = nextNumber;
            salesOrder.code = `${prefix}-${String(nextNumber).padStart(4, '0')}`;

            let subtotalBase = 0;
            let taxTotal = 0;

            for (const itemData of data.items) {
                const product = await tx.getRepository(Product).findOneOrFail({ id: itemData.productId });
                let variant;
                if (itemData.variantId) {
                    variant = await tx.getRepository(ProductVariant).findOneOrFail({ id: itemData.variantId });
                }

                const subtotal = itemData.quantity * itemData.unitPrice;
                const taxRate = itemData.taxRate || 0;
                const taxAmount = subtotal * (taxRate / 100);

                const item = tx.getRepository(SalesOrderItem).create({
                    salesOrder,
                    product,
                    variant,
                    quantity: itemData.quantity,
                    unitPrice: itemData.unitPrice,
                    taxRate,
                    taxAmount,
                    subtotal
                } as SalesOrderItem);

                salesOrder.items.add(item);

                subtotalBase += subtotal;
                taxTotal += taxAmount;
            }

            const totalAmount = subtotalBase + taxTotal;
            salesOrder.subtotalBase = subtotalBase;
            salesOrder.taxTotal = taxTotal;
            salesOrder.totalAmount = totalAmount;
            salesOrder.netTotalAmount = totalAmount - salesOrder.discountAmount;

            await tx.persistAndFlush(salesOrder);
            return salesOrder;
        });
    }

    async updateSalesOrder(id: string, data: CreateSalesOrderPayload): Promise<SalesOrder> {
        return this.em.transactional(async (tx) => {
            const salesOrderRepo = tx.getRepository(SalesOrder);
            const customerRepo = tx.getRepository(Customer);
            const productRepo = tx.getRepository(Product);
            const variantRepo = tx.getRepository(ProductVariant);
            const itemRepo = tx.getRepository(SalesOrderItem);

            const order = await salesOrderRepo.findOneOrFail(
                { id },
                { populate: ['items', 'productionOrders'] }
            );

            if (order.status !== SalesOrderStatus.PENDING) {
                throw new AppError('Solo se puede editar un pedido en estado pendiente', 400);
            }

            if (order.productionOrders.length > 0) {
                throw new AppError('No se puede editar: el pedido ya tiene orden(es) de producción vinculadas', 400);
            }

            const customer = await customerRepo.findOneOrFail({ id: data.customerId });
            order.customer = customer;
            order.expectedDeliveryDate = data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : undefined;
            order.notes = data.notes;

            for (const existing of order.items.getItems()) {
                await tx.remove(existing);
            }
            order.items.removeAll();

            let subtotalBase = 0;
            let taxTotal = 0;

            for (const itemData of data.items) {
                const product = await productRepo.findOneOrFail({ id: itemData.productId });
                let variant;
                if (itemData.variantId) {
                    variant = await variantRepo.findOneOrFail({ id: itemData.variantId });
                }

                const subtotal = itemData.quantity * itemData.unitPrice;
                const taxRate = itemData.taxRate || 0;
                const taxAmount = subtotal * (taxRate / 100);

                const item = itemRepo.create({
                    salesOrder: order,
                    product,
                    variant,
                    quantity: itemData.quantity,
                    unitPrice: itemData.unitPrice,
                    taxRate,
                    taxAmount,
                    subtotal,
                } as unknown as SalesOrderItem);

                order.items.add(item);
                subtotalBase += subtotal;
                taxTotal += taxAmount;
            }

            const totalAmount = subtotalBase + taxTotal;
            order.subtotalBase = subtotalBase;
            order.taxTotal = taxTotal;
            order.totalAmount = totalAmount;
            order.netTotalAmount = totalAmount - Number(order.discountAmount || 0);

            await tx.persistAndFlush(order);
            return order;
        });
    }

    async updateSalesOrderStatus(id: string, status: SalesOrderStatus): Promise<SalesOrder> {
        return this.em.transactional(async (tx) => {
            const order = await tx.getRepository(SalesOrder).findOneOrFail(
                { id },
                { populate: ['items', 'items.variant', 'items.product', 'productionOrders', 'productionOrders.items', 'productionOrders.items.variant'] }
            );

            if (status === SalesOrderStatus.CANCELLED && order.status === SalesOrderStatus.SHIPPED) {
                throw new AppError('No se puede cancelar un pedido ya despachado', 400);
            }

            if (status === SalesOrderStatus.IN_PRODUCTION) {
                const automation = await this.ensureProductionCoverage(order, tx);
                order.status = automation.nextStatus;
            } else if (status === SalesOrderStatus.CANCELLED) {
                await this.cancelPendingProductionOrders(order, tx);
                await this.revertQuotationConversion(order, tx);
                order.status = status;
            } else {
                order.status = status;
            }

            await tx.persistAndFlush(order);
            return order;
        });
    }

    async cancelSalesOrderWithSettlement(id: string, payload: CancelSalesOrderWithSettlementPayload): Promise<SalesOrder> {
        return this.em.transactional(async (tx) => {
            const order = await tx.getRepository(SalesOrder).findOneOrFail(
                { id },
                { populate: ['items', 'items.variant', 'items.product', 'productionOrders', 'productionOrders.items', 'productionOrders.items.variant'] }
            );

            if (order.status === SalesOrderStatus.SHIPPED) {
                throw new AppError('No se puede cancelar un pedido ya despachado', 400);
            }

            const activeProductionOrders = order.productionOrders.getItems().filter((productionOrder) =>
                productionOrder.status !== ProductionOrderStatus.CANCELLED
            );

            if (activeProductionOrders.length === 0) {
                throw new AppError('El pedido no tiene órdenes de producción activas para liquidar', 400);
            }

            if (activeProductionOrders.some((productionOrder) => productionOrder.status === ProductionOrderStatus.COMPLETED)) {
                throw new AppError('Existe una OP completada. Debes gestionarla manualmente antes de cancelar el pedido.', 409);
            }

            if (activeProductionOrders.every((productionOrder) =>
                productionOrder.status === ProductionOrderStatus.DRAFT || productionOrder.status === ProductionOrderStatus.PLANNED
            )) {
                throw new AppError('La producción aún no ha iniciado. Usa la cancelación normal del pedido.', 400);
            }

            const warehouseRepo = tx.getRepository(Warehouse);
            const inventoryRepo = tx.getRepository(InventoryItem);
            const variantRepo = tx.getRepository(ProductVariant);

            const warehouse = await warehouseRepo.findOneOrFail({ id: payload.warehouseId });
            if (warehouse.type !== WarehouseType.FINISHED_GOODS) {
                throw new AppError('La bodega seleccionada debe ser de producto terminado', 400);
            }

            const allowedByVariant = new Map<string, number>();
            const orderItemMetaByVariant = new Map<string, { productName: string; variantName: string; variantSku?: string }>();
            for (const orderItem of order.items.getItems()) {
                const variantId = orderItem.variant?.id;
                if (!variantId) continue;
                orderItemMetaByVariant.set(variantId, {
                    productName: orderItem.product?.name || 'Producto',
                    variantName: orderItem.variant?.name || orderItem.variant?.sku || 'Variante',
                    variantSku: orderItem.variant?.sku || undefined,
                });
            }
            for (const productionOrder of activeProductionOrders) {
                for (const item of productionOrder.items.getItems()) {
                    const variantId = item.variant?.id;
                    if (!variantId) continue;
                    allowedByVariant.set(variantId, Number(allowedByVariant.get(variantId) || 0) + Number(item.quantity || 0));
                }
            }

            const payloadByVariant = new Map(
                payload.items.map((row) => [row.variantId, row])
            );

            for (const [variantId, allowed] of allowedByVariant.entries()) {
                const row = payloadByVariant.get(variantId) || {
                    variantId,
                    completedQuantity: 0,
                    rejectedQuantity: 0,
                };
                if (allowed <= 0) {
                    throw new AppError('Se incluyó una variante que no pertenece a las OP vinculadas al pedido', 400);
                }
                const completedQuantity = Number(row.completedQuantity || 0);
                const rejectedQuantity = Number(row.rejectedQuantity || 0);
                if (completedQuantity + rejectedQuantity > allowed) {
                    throw new AppError('La suma de terminado y rechazo no puede superar la cantidad planificada en producción', 400);
                }
            }

            for (const row of payload.items) {
                if (!allowedByVariant.has(row.variantId)) {
                    throw new AppError('Se incluyó una variante que no pertenece a las OP vinculadas al pedido', 400);
                }
            }

            const settlementSummaryRows: string[] = [];
            const settlementItems: CancellationSettlement['items'] = [];
            let totalCompleted = 0;
            let totalRejected = 0;
            let totalCancelled = 0;

            for (const [variantId, plannedQuantity] of allowedByVariant.entries()) {
                const row = payloadByVariant.get(variantId) || {
                    variantId,
                    completedQuantity: 0,
                    rejectedQuantity: 0,
                };
                const completedQuantity = Number(row.completedQuantity || 0);
                const rejectedQuantity = Number(row.rejectedQuantity || 0);
                const cancelledQuantity = Math.max(0, plannedQuantity - completedQuantity - rejectedQuantity);
                const variant = await variantRepo.findOneOrFail({ id: variantId });

                totalCompleted += completedQuantity;
                totalRejected += rejectedQuantity;
                totalCancelled += cancelledQuantity;
                const orderItemMeta = orderItemMetaByVariant.get(variantId);

                settlementItems.push({
                    variantId,
                    productName: orderItemMeta?.productName || 'Producto',
                    variantName: orderItemMeta?.variantName || variant.name || variant.sku || 'Variante',
                    variantSku: orderItemMeta?.variantSku || variant.sku || undefined,
                    plannedQuantity,
                    completedQuantity,
                    rejectedQuantity,
                    cancelledQuantity,
                });

                settlementSummaryRows.push(
                    `- ${variant.sku || variant.name}: planeado ${plannedQuantity}, terminado ${completedQuantity}, rechazado ${rejectedQuantity}, cancelado ${cancelledQuantity}`
                );

                if (completedQuantity <= 0) continue;
                let inventoryRow = await inventoryRepo.findOne({ warehouse, variant });
                if (!inventoryRow) {
                    inventoryRow = inventoryRepo.create({
                        warehouse,
                        variant,
                        quantity: 0,
                    } as InventoryItem);
                }
                inventoryRow.quantity = Number(inventoryRow.quantity || 0) + completedQuantity;
                tx.persist(inventoryRow);
            }

            const settlementNote = payload.notes?.trim() || 'Cancelación con liquidación parcial de producción';
            const settlementHeader = [
                `Liquidación parcial por cancelación de pedido`,
                `Bodega destino: ${warehouse.name}`,
                `Totales -> terminado ${totalCompleted}, rechazado ${totalRejected}, cancelado ${totalCancelled}`,
                `Observación: ${settlementNote}`,
            ].join('\n');
            const settlementSummary = [settlementHeader, settlementSummaryRows.join('\n')].filter(Boolean).join('\n');
            const settlementRecord: CancellationSettlement = {
                settledAt: new Date(),
                warehouseId: warehouse.id,
                warehouseName: warehouse.name,
                notes: payload.notes?.trim() || undefined,
                totalPlanned: Array.from(allowedByVariant.values()).reduce((sum, qty) => sum + Number(qty || 0), 0),
                totalCompleted,
                totalRejected,
                totalCancelled,
                productionOrderIds: activeProductionOrders.map((productionOrder) => productionOrder.id),
                productionOrderCodes: activeProductionOrders.map((productionOrder) => productionOrder.code),
                items: settlementItems,
            };

            for (const productionOrder of activeProductionOrders) {
                if (productionOrder.status === ProductionOrderStatus.COMPLETED || productionOrder.status === ProductionOrderStatus.CANCELLED) continue;
                productionOrder.status = ProductionOrderStatus.CANCELLED;
                productionOrder.cancellationSettlement = settlementRecord;
                productionOrder.notes = [productionOrder.notes, settlementSummary]
                    .filter(Boolean)
                    .join('\n');
                tx.persist(productionOrder);
            }

            order.status = SalesOrderStatus.CANCELLED;
            order.cancellationSettlement = settlementRecord;
            order.notes = [order.notes, `Pedido cancelado con liquidación parcial.`, settlementSummary]
                .filter(Boolean)
                .join('\n');
            tx.persist(order);

            await tx.flush();
            return this.getSalesOrderById(order.id);
        });
    }

    private async ensureProductionCoverage(order: SalesOrder, tx: EntityManager): Promise<{ nextStatus: SalesOrderStatus; createdProductionOrderId?: string }> {
        if (!order.items?.length) {
            throw new AppError('El pedido no tiene ítems para planificar producción', 400);
        }

        for (const item of order.items) {
            if (!item.variant) {
                throw new AppError(`El ítem ${item.product?.name || item.id} no tiene variante definida. Selecciona variante para producción.`, 400);
            }
        }

        const variantIds = order.items.getItems().map((item) => item.variant!.id);

        const inventoryRows = await tx.getRepository(InventoryItem).find({
            variant: { $in: variantIds },
            warehouse: { type: WarehouseType.FINISHED_GOODS },
        }, { populate: ['variant'] });

        const availableByVariant = new Map<string, number>();
        for (const row of inventoryRows) {
            const key = row.variant?.id;
            if (!key) continue;
            availableByVariant.set(key, Number(availableByVariant.get(key) || 0) + Number(row.quantity || 0));
        }

        const linkedPos = order.productionOrders.getItems();
        const pipelineByVariant = new Map<string, number>();
        for (const po of linkedPos) {
            if ([ProductionOrderStatus.COMPLETED, ProductionOrderStatus.CANCELLED].includes(po.status)) continue;
            for (const poItem of po.items.getItems()) {
                const key = poItem.variant?.id;
                if (!key) continue;
                pipelineByVariant.set(key, Number(pipelineByVariant.get(key) || 0) + Number(poItem.quantity || 0));
            }
        }

        const shortages: Array<{ variant: ProductVariant; quantity: number }> = [];
        for (const item of order.items.getItems()) {
            const variant = item.variant!;
            const requested = Number(item.quantity || 0);
            const available = Number(availableByVariant.get(variant.id) || 0);
            const inPipeline = Number(pipelineByVariant.get(variant.id) || 0);
            const missing = Math.max(0, requested - available - inPipeline);
            if (missing > 0) {
                shortages.push({ variant, quantity: missing });
            }
        }

        if (shortages.length === 0) {
            return { nextStatus: SalesOrderStatus.READY_TO_SHIP };
        }

        const poRepo = tx.getRepository(ProductionOrder);
        const poItemRepo = tx.getRepository(ProductionOrderItem);

        const now = new Date();
        const code = await this.generateProductionOrderCode(tx);
        const productionOrder = poRepo.create({
            code,
            status: ProductionOrderStatus.PLANNED,
            startDate: now,
            endDate: order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate) : undefined,
            notes: `Generada automáticamente desde pedido ${order.code}`,
            salesOrder: order,
        } as unknown as ProductionOrder);

        for (const shortage of shortages) {
            const item = poItemRepo.create({
                productionOrder,
                variant: shortage.variant,
                quantity: shortage.quantity,
            } as unknown as ProductionOrderItem);
            productionOrder.items.add(item);
        }

        await tx.persistAndFlush(productionOrder);
        return { nextStatus: SalesOrderStatus.IN_PRODUCTION, createdProductionOrderId: productionOrder.id };
    }

    private async generateProductionOrderCode(tx: EntityManager): Promise<string> {
        const repo = tx.getRepository(ProductionOrder);
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
}
