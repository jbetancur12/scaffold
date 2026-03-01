import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { SalesOrder } from '../entities/sales-order.entity';
import { SalesOrderItem } from '../entities/sales-order-item.entity';
import { Customer } from '../entities/customer.entity';
import { Product } from '../entities/product.entity';
import { ProductVariant } from '../entities/product-variant.entity';
import { OperationalConfig } from '../entities/operational-config.entity';
import { CreateSalesOrderPayload, SalesOrderStatus } from '@scaffold/types';

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

    async updateSalesOrderStatus(id: string, status: SalesOrderStatus): Promise<SalesOrder> {
        return this.em.transactional(async (tx) => {
            const order = await tx.getRepository(SalesOrder).findOneOrFail({ id });
            order.status = status;
            await tx.persistAndFlush(order);
            return order;
        });
    }
}
