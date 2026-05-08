import { EntityManager } from '@mikro-orm/core';
import { SalesOrderStatus, WarehouseType, PendingDispatchItem, CreateDispatchFromSalesOrderPayload } from '@scaffold/types';
import { AppError } from '../../../shared/utils/response';
import { SalesOrder } from '../entities/sales-order.entity';
import { SalesOrderItem } from '../entities/sales-order-item.entity';
import { Shipment } from '../entities/shipment.entity';
import { ShipmentItem } from '../entities/shipment-item.entity';
import { Customer } from '../entities/customer.entity';
import { ProductionBatch } from '../entities/production-batch.entity';
import { FinishedGoodsLotInventory } from '../entities/finished-goods-lot-inventory.entity';
import { InventoryItem } from '../entities/inventory-item.entity';

export class DispatchService {
    private readonly em: EntityManager;

    constructor(em: EntityManager) {
        this.em = em;
    }

    async getPendingDispatchItems(customerId: string): Promise<PendingDispatchItem[]> {
        const salesOrderRepo = this.em.getRepository(SalesOrder);
        const lotInventoryRepo = this.em.getRepository(FinishedGoodsLotInventory);
        const inventoryRepo = this.em.getRepository(InventoryItem);

        const orders = await salesOrderRepo.find(
            {
                customer: customerId,
                status: { $nin: [SalesOrderStatus.CANCELLED, SalesOrderStatus.SHIPPED] },
            },
            {
                populate: ['items', 'items.product', 'items.variant'],
                orderBy: { orderDate: 'ASC' },
            }
        );

        const result: PendingDispatchItem[] = [];

        for (const order of orders) {
            const items = order.items.getItems();
            for (const item of items) {
                const pending = Number(item.quantity) - Number(item.dispatchedQuantity);
                if (pending <= 0) continue;

                const variantId = item.variant?.id;
                let availableStock = 0;
                const availableLots: Array<{ lotId: string; lotCode: string; warehouseId: string; warehouseName: string; quantity: number }> = [];

                if (variantId) {
                    const lotInventory = await lotInventoryRepo.find(
                        {
                            productionBatch: { variant: variantId },
                            warehouse: { type: WarehouseType.FINISHED_GOODS },
                            quantity: { $gt: 0 },
                        },
                        { populate: ['warehouse', 'productionBatch'] }
                    );

                    for (const lot of lotInventory) {
                        const qty = Number(lot.quantity || 0);
                        if (qty <= 0) continue;
                        availableStock += qty;
                        availableLots.push({
                            lotId: lot.id,
                            lotCode: lot.productionBatch.code,
                            warehouseId: lot.warehouse.id,
                            warehouseName: lot.warehouse.name,
                            quantity: qty,
                        });
                    }

                    if (availableStock <= 0) {
                        const invItems = await inventoryRepo.find(
                            { variant: variantId, warehouse: { type: WarehouseType.FINISHED_GOODS }, quantity: { $gt: 0 } }
                        );
                        availableStock = invItems.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
                    }
                }

                result.push({
                    salesOrderId: order.id,
                    salesOrderCode: order.code,
                    salesOrderItemId: item.id,
                    productId: item.product.id,
                    productName: item.product.name,
                    productSku: item.product.sku,
                    variantId: item.variant?.id,
                    variantName: item.variant?.name,
                    variantSku: item.variant?.sku,
                    orderedQuantity: Number(item.quantity),
                    dispatchedQuantity: Number(item.dispatchedQuantity),
                    pendingQuantity: pending,
                    availableStock,
                    availableLots,
                });
            }
        }

        return result;
    }

    async getCustomersWithPendingDispatch(): Promise<Customer[]> {
        const salesOrderItemRepo = this.em.getRepository(SalesOrderItem);
        const salesOrderRepo = this.em.getRepository(SalesOrder);

        const ordersWithPending = await salesOrderRepo.find(
            {
                status: { $nin: [SalesOrderStatus.CANCELLED, SalesOrderStatus.SHIPPED] },
            },
            { populate: ['customer'] }
        );

        const customerMap = new Map<string, Customer>();
        for (const order of ordersWithPending) {
            if (!order.customer) continue;
            const items = await salesOrderItemRepo.find(
                { salesOrder: order.id },
                { populate: ['salesOrder'] }
            );
            const hasPending = items.some(
                (item) => Number(item.quantity) > Number(item.dispatchedQuantity)
            );
            if (hasPending && !customerMap.has(order.customer.id)) {
                customerMap.set(order.customer.id, order.customer);
            }
        }

        return Array.from(customerMap.values());
    }

    async createDispatchFromSalesOrder(payload: CreateDispatchFromSalesOrderPayload, _actor?: string) {
        const itemIds = payload.items.map((i) => i.salesOrderItemId);
        if (itemIds.length === 0) {
            throw new AppError('Debe seleccionar al menos un item para despachar', 400);
        }

        const salesOrderItemRepo = this.em.getRepository(SalesOrderItem);
        const items = await salesOrderItemRepo.find(
            { id: { $in: itemIds } },
            { populate: ['salesOrder', 'product', 'variant', 'variant.product'] }
        );

        const itemById = new Map(items.map((i) => [i.id, i]));
        const customerIds = new Set(items.map((i) => i.salesOrder.customer.id));
        if (customerIds.size > 1) {
            throw new AppError('Todos los items deben pertenecer al mismo cliente', 400);
        }
        if (payload.customerId && !customerIds.has(payload.customerId)) {
            throw new AppError('El cliente indicado no coincide con los items seleccionados', 400);
        }

        const customerRepo = this.em.getRepository(Customer);
        const customer = await customerRepo.findOneOrFail({ id: payload.customerId || customerIds.values().next().value });

        return this.em.transactional(async (tx) => {
            const shipmentRepo = tx.getRepository(Shipment);
            const shipmentItemRepo = tx.getRepository(ShipmentItem);
            const lotInventoryRepo = tx.getRepository(FinishedGoodsLotInventory);
            const inventoryRepo = tx.getRepository(InventoryItem);

            const shipment = shipmentRepo.create({
                customer,
                commercialDocument: payload.commercialDocument,
                shippedAt: payload.shippedAt ?? new Date(),
                dispatchedBy: payload.dispatchedBy,
                notes: payload.notes,
            } as unknown as Shipment);

            const dispatchedByVariant = new Map<string, number>();

            for (const input of payload.items) {
                const soItem = itemById.get(input.salesOrderItemId);
                if (!soItem) {
                    throw new AppError(`Item de orden de venta no encontrado: ${input.salesOrderItemId}`, 404);
                }

                const pending = Number(soItem.quantity) - Number(soItem.dispatchedQuantity);
                if (input.quantity > pending) {
                    throw new AppError(
                        `Cantidad a despachar (${input.quantity}) supera el pendiente (${pending}) del item ${soItem.product?.name || ''}`,
                        400
                    );
                }

                const variantId = soItem.variant?.id;
                if (!variantId) {
                    throw new AppError(`El item ${soItem.product?.name || ''} no tiene variante asociada`, 400);
                }

                dispatchedByVariant.set(variantId, (dispatchedByVariant.get(variantId) || 0) + Number(input.quantity));

                if (input.lotAllocations && input.lotAllocations.length > 0) {
                    const allocationTotal = input.lotAllocations.reduce((s, a) => s + Number(a.quantity), 0);
                    if (Math.abs(allocationTotal - Number(input.quantity)) > 0.001) {
                        throw new AppError(
                            `La suma de asignaciones por lote (${allocationTotal}) no coincide con la cantidad a despachar (${input.quantity}) para ${soItem.product?.name || ''}`,
                            400
                        );
                    }

                    for (const alloc of input.lotAllocations) {
                        const lot = await lotInventoryRepo.findOne(
                            { id: alloc.lotId },
                            { populate: ['productionBatch', 'warehouse'] }
                        );
                        if (!lot) {
                            throw new AppError(`Lote no encontrado: ${alloc.lotId}`, 404);
                        }
                        const currentQty = Number(lot.quantity || 0);
                        if (alloc.quantity > currentQty) {
                            throw new AppError(
                                `Stock insuficiente en lote ${lot.productionBatch.code}. Requerido: ${alloc.quantity}, disponible: ${currentQty}`,
                                400
                            );
                        }

                        const shipmentItem = shipmentItemRepo.create({
                            shipment,
                            productionBatch: lot.productionBatch,
                            quantity: alloc.quantity,
                            salesOrderItem: soItem,
                        } as unknown as ShipmentItem);
                        shipment.items.add(shipmentItem);

                        lot.quantity = currentQty - Number(alloc.quantity);
                        tx.persist(lot);
                    }
                } else {
                    const lots = await lotInventoryRepo.find(
                        {
                            productionBatch: { variant: variantId },
                            warehouse: { type: WarehouseType.FINISHED_GOODS },
                        },
                        {
                            populate: ['productionBatch', 'warehouse'],
                            orderBy: { quantity: 'DESC' },
                        }
                    );

                    let remaining = Number(input.quantity);
                    for (const lot of lots) {
                        if (remaining <= 0) break;
                        const currentQty = Number(lot.quantity || 0);
                        if (currentQty <= 0) continue;
                        const consume = Math.min(currentQty, remaining);

                        const batch = lot.productionBatch;
                        const shipmentItem = shipmentItemRepo.create({
                            shipment,
                            productionBatch: batch,
                            quantity: consume,
                            salesOrderItem: soItem,
                        } as unknown as ShipmentItem);
                        shipment.items.add(shipmentItem);

                        lot.quantity = currentQty - consume;
                        tx.persist(lot);
                        remaining -= consume;
                    }

                    if (remaining > 0) {
                        const invItems = await inventoryRepo.find(
                            { variant: variantId, warehouse: { type: WarehouseType.FINISHED_GOODS } },
                            { populate: ['warehouse'], orderBy: { quantity: 'DESC' } }
                        );
                        for (const inv of invItems) {
                            if (remaining <= 0) break;
                            const currentQty = Number(inv.quantity || 0);
                            if (currentQty <= 0) continue;
                            const consume = Math.min(currentQty, remaining);

                            const batchRepo = tx.getRepository(ProductionBatch);
                            const fallbackBatch = await batchRepo.findOne({ variant: variantId }, { orderBy: { createdAt: 'DESC' } });

                            const shipmentItem = shipmentItemRepo.create({
                                shipment,
                                productionBatch: fallbackBatch,
                                quantity: consume,
                                salesOrderItem: soItem,
                            } as unknown as ShipmentItem);
                            shipment.items.add(shipmentItem);

                            inv.quantity = currentQty - consume;
                            tx.persist(inv);
                            remaining -= consume;
                        }
                    }

                    if (remaining > 0) {
                        throw new AppError(
                            `Stock insuficiente para despachar ${soItem.product?.name || ''}. Faltan ${remaining} unidades`,
                            400
                        );
                    }
                }

                soItem.dispatchedQuantity = Number(soItem.dispatchedQuantity) + Number(input.quantity);
                tx.persist(soItem);
            }

            const soItemsByOrder = new Map<string, SalesOrderItem[]>();
            for (const item of items) {
                const orderId = item.salesOrder.id;
                if (!soItemsByOrder.has(orderId)) soItemsByOrder.set(orderId, []);
                soItemsByOrder.get(orderId)!.push(item);
            }

            const updatedOrders = await salesOrderItemRepo.find(
                { salesOrder: { $in: Array.from(soItemsByOrder.keys()) } },
                { populate: ['salesOrder'] }
            );

            const orderTotals = new Map<string, { total: number; dispatched: number; order: SalesOrder }>();
            for (const soItem of updatedOrders) {
                const order = soItem.salesOrder;
                if (!orderTotals.has(order.id)) {
                    orderTotals.set(order.id, { total: 0, dispatched: 0, order });
                }
                const entry = orderTotals.get(order.id)!;
                entry.total += Number(soItem.quantity);
                entry.dispatched += Number(soItem.dispatchedQuantity);
            }

            for (const [, entry] of orderTotals.entries()) {
                if (entry.dispatched >= entry.total && entry.order.status !== SalesOrderStatus.SHIPPED) {
                    entry.order.status = SalesOrderStatus.SHIPPED;
                    tx.persist(entry.order);
                }
            }

            await tx.persistAndFlush(shipment);

            return shipmentRepo.findOneOrFail(
                { id: shipment.id },
                { populate: ['customer', 'items', 'items.productionBatch', 'items.productionBatch.variant'] }
            );
        });
    }
}
