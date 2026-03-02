import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { SalesOrder } from '../entities/sales-order.entity';
import { SalesOrderItem } from '../entities/sales-order-item.entity';
import { Customer } from '../entities/customer.entity';
import { Product } from '../entities/product.entity';
import { ProductVariant } from '../entities/product-variant.entity';
import { OperationalConfig } from '../entities/operational-config.entity';
import { CreateSalesOrderPayload, ProductionOrderStatus, SalesOrderStatus, WarehouseType } from '@scaffold/types';
import { ProductionOrder } from '../entities/production-order.entity';
import { ProductionOrderItem } from '../entities/production-order-item.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { AppError } from '../../../shared/utils/response';

export class SalesOrderService {
    private salesOrderRepo: EntityRepository<SalesOrder>;

    constructor(
        private em: EntityManager
    ) {
        this.salesOrderRepo = em.getRepository(SalesOrder);
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
            } else {
                order.status = status;
            }

            await tx.persistAndFlush(order);
            return order;
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
        let tries = 0;
        while (tries < 10) {
            const token = Date.now().toString(36).toUpperCase();
            const candidate = `PO-${token}${tries > 0 ? String(tries) : ''}`;
            const exists = await repo.findOne({ code: candidate });
            if (!exists) return candidate;
            tries += 1;
        }
        throw new AppError('No se pudo generar código único para orden de producción', 500);
    }
}
