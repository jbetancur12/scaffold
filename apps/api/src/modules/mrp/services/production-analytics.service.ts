import { EntityManager, EntityRepository, FilterQuery } from '@mikro-orm/core';
import {
    ProductionAnalyticsDetailGroupBy,
    ProductionAnalyticsDetailResult,
    ProductionAnalyticsSummary,
    ProductionAnalyticsTopCustomer,
    ProductionAnalyticsTopProduct,
    ProductionAnalyticsTrendPoint,
    ProductionBatchPackagingStatus,
    ProductionOrderStatus,
} from '@scaffold/types';
import { ProductionBatch } from '../entities/production-batch.entity';
import { ProductionOrder } from '../entities/production-order.entity';
import { ProductionOrderItem } from '../entities/production-order-item.entity';

type AnalyticsInput = {
    month?: string;
    from?: string;
    to?: string;
    limit?: number;
    groupBy?: ProductionAnalyticsDetailGroupBy;
    statuses?: ProductionOrderStatus[];
};

type PeriodRange = {
    from: Date;
    to: Date;
    month?: string;
};

type GroupAggregate = {
    key: string;
    label: string;
    productName?: string;
    variantName?: string;
    variantSku?: string;
    customerName?: string;
    producedQty: number;
    plannedQty: number;
    inProgressQty: number;
    orderIds: Set<string>;
};

const ACTIVE_ORDER_STATUSES: ProductionOrderStatus[] = [
    ProductionOrderStatus.PLANNED,
    ProductionOrderStatus.IN_PROGRESS,
];

const toMonthKey = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;

const startOfMonth = (year: number, monthIndex: number) => new Date(year, monthIndex, 1, 0, 0, 0, 0);
const endOfMonth = (year: number, monthIndex: number) => new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

const clampPercent = (value: number) => {
    if (!Number.isFinite(value)) return 0;
    if (value < 0) return 0;
    return Number(value.toFixed(2));
};

export class ProductionAnalyticsService {
    private readonly batchRepo: EntityRepository<ProductionBatch>;
    private readonly orderRepo: EntityRepository<ProductionOrder>;

    constructor(em: EntityManager) {
        this.batchRepo = em.getRepository(ProductionBatch);
        this.orderRepo = em.getRepository(ProductionOrder);
    }

    private resolvePeriod(input: AnalyticsInput): PeriodRange {
        if (input.month) {
            const [yearText, monthText] = input.month.split('-');
            const year = Number(yearText);
            const monthNumber = Number(monthText);
            const monthIndex = monthNumber - 1;
            return {
                from: startOfMonth(year, monthIndex),
                to: endOfMonth(year, monthIndex),
                month: input.month,
            };
        }

        if (input.from && input.to) {
            const [fromYearText, fromMonthText] = input.from.split('-');
            const [toYearText, toMonthText] = input.to.split('-');
            const fromYear = Number(fromYearText);
            const fromMonthIndex = Number(fromMonthText) - 1;
            const toYear = Number(toYearText);
            const toMonthIndex = Number(toMonthText) - 1;
            return {
                from: startOfMonth(fromYear, fromMonthIndex),
                to: endOfMonth(toYear, toMonthIndex),
            };
        }

        const now = new Date();
        return {
            from: startOfMonth(now.getFullYear(), now.getMonth()),
            to: endOfMonth(now.getFullYear(), now.getMonth()),
            month: toMonthKey(now),
        };
    }

    private buildPackedBatchesQuery(period: PeriodRange, statuses?: ProductionOrderStatus[]): FilterQuery<ProductionBatch> {
        const query: FilterQuery<ProductionBatch> = {
            packagingStatus: ProductionBatchPackagingStatus.PACKED,
            updatedAt: { $gte: period.from, $lte: period.to },
        };
        if (statuses?.length) {
            query.productionOrder = { status: { $in: statuses } } as unknown as ProductionOrder;
        }
        return query;
    }

    private buildPlannedBatchesQuery(period: PeriodRange, statuses?: ProductionOrderStatus[]): FilterQuery<ProductionBatch> {
        const query: FilterQuery<ProductionBatch> = {
            createdAt: { $gte: period.from, $lte: period.to },
        };
        if (statuses?.length) {
            query.productionOrder = { status: { $in: statuses } } as unknown as ProductionOrder;
        }
        return query;
    }

    private buildOpenBatchesQuery(period: PeriodRange, statuses?: ProductionOrderStatus[]): FilterQuery<ProductionBatch> {
        const activeStatuses = statuses?.length
            ? ACTIVE_ORDER_STATUSES.filter((status) => statuses.includes(status))
            : ACTIVE_ORDER_STATUSES;

        const query: FilterQuery<ProductionBatch> = {
            createdAt: { $lte: period.to },
            productionOrder: { status: { $in: activeStatuses } } as unknown as ProductionOrder,
        };
        return query;
    }

    private makeGroupKey(batch: ProductionBatch, groupBy: ProductionAnalyticsDetailGroupBy): { key: string; label: string } {
        const productName = batch.variant?.product?.name || 'Sin producto';
        const variantName = batch.variant?.name || 'Sin variante';
        const variantSku = batch.variant?.sku || 'N/A';
        const customerName = batch.productionOrder?.salesOrder?.customer?.name || 'Sin cliente';
        const customerId = batch.productionOrder?.salesOrder?.customer?.id;

        if (groupBy === 'product') {
            const productId = batch.variant?.product?.id || `product:${productName}`;
            return { key: productId, label: productName };
        }

        if (groupBy === 'customer') {
            return { key: customerId || 'customer:none', label: customerName };
        }

        const variantId = batch.variant?.id || `variant:${variantName}:${variantSku}`;
        return { key: variantId, label: `${productName} - ${variantName}` };
    }

    private ensureAggregate(
        map: Map<string, GroupAggregate>,
        batch: ProductionBatch,
        groupBy: ProductionAnalyticsDetailGroupBy
    ): GroupAggregate {
        const { key, label } = this.makeGroupKey(batch, groupBy);
        const existing = map.get(key);
        if (existing) return existing;

        const row: GroupAggregate = {
            key,
            label,
            productName: batch.variant?.product?.name || undefined,
            variantName: batch.variant?.name || undefined,
            variantSku: batch.variant?.sku || undefined,
            customerName: batch.productionOrder?.salesOrder?.customer?.name || undefined,
            producedQty: 0,
            plannedQty: 0,
            inProgressQty: 0,
            orderIds: new Set<string>(),
        };
        map.set(key, row);
        return row;
    }

    private ensureAggregateFromOrderItem(
        map: Map<string, GroupAggregate>,
        order: ProductionOrder,
        item: ProductionOrderItem,
        groupBy: ProductionAnalyticsDetailGroupBy
    ): GroupAggregate {
        const productName = item.variant?.product?.name || 'Sin producto';
        const variantName = item.variant?.name || 'Sin variante';
        const variantSku = item.variant?.sku || 'N/A';
        const customerName = order.salesOrder?.customer?.name || 'Sin cliente';
        const customerId = order.salesOrder?.customer?.id;

        let key = item.variant?.id || `variant:${variantName}:${variantSku}`;
        let label = `${productName} - ${variantName}`;
        if (groupBy === 'product') {
            key = item.variant?.product?.id || `product:${productName}`;
            label = productName;
        }
        if (groupBy === 'customer') {
            key = customerId || 'customer:none';
            label = customerName;
        }

        const existing = map.get(key);
        if (existing) return existing;

        const row: GroupAggregate = {
            key,
            label,
            productName,
            variantName,
            variantSku,
            customerName,
            producedQty: 0,
            plannedQty: 0,
            inProgressQty: 0,
            orderIds: new Set<string>(),
        };
        map.set(key, row);
        return row;
    }

    async getSummary(input: AnalyticsInput): Promise<ProductionAnalyticsSummary> {
        const period = this.resolvePeriod(input);

        const [producedBatches, plannedBatches, openBatches, ordersInPeriod, activeOrdersWithItems, activeOrders, completedOrders] = await Promise.all([
            this.batchRepo.find(
                this.buildPackedBatchesQuery(period, input.statuses),
                { populate: ['productionOrder'] }
            ),
            this.batchRepo.find(this.buildPlannedBatchesQuery(period, input.statuses)),
            this.batchRepo.find(this.buildOpenBatchesQuery(period, input.statuses)),
            this.orderRepo.find(
                {
                    createdAt: { $gte: period.from, $lte: period.to },
                    ...(input.statuses?.length ? { status: { $in: input.statuses } } : {}),
                },
                { populate: ['items', 'items.variant', 'items.variant.product', 'batches', 'batches.variant'] }
            ),
            this.orderRepo.find(
                {
                    status: { $in: ACTIVE_ORDER_STATUSES },
                    createdAt: { $lte: period.to },
                    ...(input.statuses?.length ? { status: { $in: input.statuses } } : {}),
                },
                { populate: ['items', 'items.variant', 'items.variant.product', 'batches', 'batches.variant'] }
            ),
            this.orderRepo.count({
                status: { $in: ACTIVE_ORDER_STATUSES },
                createdAt: { $lte: period.to },
            }),
            this.orderRepo.count({
                status: ProductionOrderStatus.COMPLETED,
                updatedAt: { $gte: period.from, $lte: period.to },
            }),
        ]);

        const producedQty = producedBatches.reduce((acc, batch) => acc + Number(batch.producedQty || 0), 0);
        const plannedQtyFromBatches = plannedBatches.reduce((acc, batch) => acc + Number(batch.plannedQty || 0), 0);
        const inProgressQtyFromBatches = openBatches.reduce((acc, batch) => {
            const pending = Math.max(Number(batch.plannedQty || 0) - Number(batch.producedQty || 0), 0);
            return acc + pending;
        }, 0);
        const fallbackPlannedQty = ordersInPeriod.reduce((acc, order) => {
            const plannedByVariant = new Map<string, number>();
            for (const batch of order.batches.getItems()) {
                const variantId = batch.variant?.id;
                if (!variantId) continue;
                plannedByVariant.set(variantId, Number(plannedByVariant.get(variantId) || 0) + Number(batch.plannedQty || 0));
            }
            for (const item of order.items.getItems()) {
                const itemVariantId = item.variant?.id;
                if (!itemVariantId) continue;
                if (Number(plannedByVariant.get(itemVariantId) || 0) === 0) {
                    acc += Number(item.quantity || 0);
                }
            }
            return acc;
        }, 0);

        const fallbackInProgressQty = activeOrdersWithItems.reduce((acc, order) => {
            const batchesByVariant = new Map<string, ProductionBatch[]>();
            for (const batch of order.batches.getItems()) {
                const variantId = batch.variant?.id;
                if (!variantId) continue;
                const list = batchesByVariant.get(variantId) || [];
                list.push(batch);
                batchesByVariant.set(variantId, list);
            }
            for (const item of order.items.getItems()) {
                const itemVariantId = item.variant?.id;
                if (!itemVariantId) continue;
                const variantBatches = batchesByVariant.get(itemVariantId) || [];
                if (variantBatches.length === 0) {
                    acc += Number(item.quantity || 0);
                }
            }
            return acc;
        }, 0);

        const plannedQty = plannedQtyFromBatches + fallbackPlannedQty;
        const inProgressQty = inProgressQtyFromBatches + fallbackInProgressQty;

        return {
            period: {
                from: period.from,
                to: period.to,
                month: period.month,
            },
            kpis: {
                producedQty,
                plannedQty,
                inProgressQty,
                completionRatePercent: plannedQty > 0 ? clampPercent((producedQty / plannedQty) * 100) : 0,
                activeOrders,
                completedOrders,
            },
        };
    }

    async getTrend(input: AnalyticsInput): Promise<ProductionAnalyticsTrendPoint[]> {
        const period = this.resolvePeriod(input);
        const months: Array<{ key: string; from: Date; to: Date }> = [];

        const cursor = new Date(period.from.getFullYear(), period.from.getMonth(), 1);
        while (cursor <= period.to) {
            const year = cursor.getFullYear();
            const monthIndex = cursor.getMonth();
            months.push({
                key: toMonthKey(cursor),
                from: startOfMonth(year, monthIndex),
                to: endOfMonth(year, monthIndex),
            });
            cursor.setMonth(cursor.getMonth() + 1);
        }

        const [packedBatches, plannedBatches, openBatches, ordersForFallback] = await Promise.all([
            this.batchRepo.find(this.buildPackedBatchesQuery(period, input.statuses)),
            this.batchRepo.find(this.buildPlannedBatchesQuery(period, input.statuses)),
            this.batchRepo.find(this.buildOpenBatchesQuery(period, input.statuses)),
            this.orderRepo.find(
                {
                    createdAt: { $gte: period.from, $lte: period.to },
                    ...(input.statuses?.length ? { status: { $in: input.statuses } } : {}),
                },
                { populate: ['items', 'items.variant', 'batches', 'batches.variant'] }
            ),
        ]);

        const producedByMonth = new Map<string, number>();
        const plannedByMonth = new Map<string, number>();

        for (const batch of packedBatches) {
            const key = toMonthKey(new Date(batch.updatedAt));
            producedByMonth.set(key, Number(producedByMonth.get(key) || 0) + Number(batch.producedQty || 0));
        }
        for (const batch of plannedBatches) {
            const key = toMonthKey(new Date(batch.createdAt));
            plannedByMonth.set(key, Number(plannedByMonth.get(key) || 0) + Number(batch.plannedQty || 0));
        }
        for (const order of ordersForFallback) {
            const key = toMonthKey(new Date(order.createdAt));
            const plannedByVariant = new Map<string, number>();
            for (const batch of order.batches.getItems()) {
                const variantId = batch.variant?.id;
                if (!variantId) continue;
                plannedByVariant.set(variantId, Number(plannedByVariant.get(variantId) || 0) + Number(batch.plannedQty || 0));
            }
            let fallback = 0;
            for (const item of order.items.getItems()) {
                const itemVariantId = item.variant?.id;
                if (!itemVariantId) continue;
                if (Number(plannedByVariant.get(itemVariantId) || 0) === 0) {
                    fallback += Number(item.quantity || 0);
                }
            }
            plannedByMonth.set(key, Number(plannedByMonth.get(key) || 0) + fallback);
        }

        return months.map((month) => {
            const inProgressQty = openBatches.reduce((acc, batch) => {
                if (new Date(batch.createdAt) > month.to) return acc;
                const pending = Math.max(Number(batch.plannedQty || 0) - Number(batch.producedQty || 0), 0);
                return acc + pending;
            }, 0);

            return {
                month: month.key,
                producedQty: Number(producedByMonth.get(month.key) || 0),
                plannedQty: Number(plannedByMonth.get(month.key) || 0),
                inProgressQty,
            };
        });
    }

    async getTopProducts(input: AnalyticsInput): Promise<ProductionAnalyticsTopProduct[]> {
        const period = this.resolvePeriod(input);
        const limit = Math.max(1, input.limit || 5);
        const batches = await this.batchRepo.find(
            this.buildPackedBatchesQuery(period, input.statuses),
            { populate: ['variant', 'variant.product', 'productionOrder'] }
        );

        const map = new Map<string, ProductionAnalyticsTopProduct & { orderIds: Set<string> }>();
        for (const batch of batches) {
            const variantId = batch.variant?.id || 'variant:none';
            const current = map.get(variantId) || {
                productId: batch.variant?.product?.id || 'product:none',
                productName: batch.variant?.product?.name || 'Sin producto',
                variantId,
                variantName: batch.variant?.name || 'Sin variante',
                variantSku: batch.variant?.sku || 'N/A',
                producedQty: 0,
                plannedQty: 0,
                orderCount: 0,
                orderIds: new Set<string>(),
            };
            current.producedQty += Number(batch.producedQty || 0);
            current.plannedQty += Number(batch.plannedQty || 0);
            if (batch.productionOrder?.id) {
                current.orderIds.add(batch.productionOrder.id);
            }
            map.set(variantId, current);
        }

        return Array.from(map.values())
            .map((row) => ({
                productId: row.productId,
                productName: row.productName,
                variantId: row.variantId,
                variantName: row.variantName,
                variantSku: row.variantSku,
                producedQty: row.producedQty,
                plannedQty: row.plannedQty,
                orderCount: row.orderIds.size,
            }))
            .sort((a, b) => b.producedQty - a.producedQty)
            .slice(0, limit);
    }

    async getTopCustomers(input: AnalyticsInput): Promise<ProductionAnalyticsTopCustomer[]> {
        const period = this.resolvePeriod(input);
        const limit = Math.max(1, input.limit || 5);
        const batches = await this.batchRepo.find(
            this.buildPackedBatchesQuery(period, input.statuses),
            { populate: ['productionOrder', 'productionOrder.salesOrder', 'productionOrder.salesOrder.customer'] }
        );

        const map = new Map<string, ProductionAnalyticsTopCustomer & { orderIds: Set<string> }>();
        for (const batch of batches) {
            const customerId = batch.productionOrder?.salesOrder?.customer?.id;
            const key = customerId || 'customer:none';
            const current = map.get(key) || {
                customerId,
                customerName: batch.productionOrder?.salesOrder?.customer?.name || 'Sin cliente',
                producedQty: 0,
                orderCount: 0,
                orderIds: new Set<string>(),
            };
            current.producedQty += Number(batch.producedQty || 0);
            if (batch.productionOrder?.id) {
                current.orderIds.add(batch.productionOrder.id);
            }
            map.set(key, current);
        }

        return Array.from(map.values())
            .map((row) => ({
                customerId: row.customerId,
                customerName: row.customerName,
                producedQty: row.producedQty,
                orderCount: row.orderIds.size,
            }))
            .sort((a, b) => b.producedQty - a.producedQty)
            .slice(0, limit);
    }

    async getDetail(input: AnalyticsInput): Promise<ProductionAnalyticsDetailResult> {
        const period = this.resolvePeriod(input);
        const groupBy = input.groupBy || 'variant';

        const [packedBatches, plannedBatches, openBatches, ordersInPeriod, activeOrders] = await Promise.all([
            this.batchRepo.find(
                this.buildPackedBatchesQuery(period, input.statuses),
                { populate: ['variant', 'variant.product', 'productionOrder', 'productionOrder.salesOrder', 'productionOrder.salesOrder.customer'] }
            ),
            this.batchRepo.find(
                this.buildPlannedBatchesQuery(period, input.statuses),
                { populate: ['variant', 'variant.product', 'productionOrder', 'productionOrder.salesOrder', 'productionOrder.salesOrder.customer'] }
            ),
            this.batchRepo.find(
                this.buildOpenBatchesQuery(period, input.statuses),
                { populate: ['variant', 'variant.product', 'productionOrder', 'productionOrder.salesOrder', 'productionOrder.salesOrder.customer'] }
            ),
            this.orderRepo.find(
                {
                    createdAt: { $gte: period.from, $lte: period.to },
                    ...(input.statuses?.length ? { status: { $in: input.statuses } } : {}),
                },
                { populate: ['items', 'items.variant', 'items.variant.product', 'batches', 'batches.variant', 'salesOrder', 'salesOrder.customer'] }
            ),
            this.orderRepo.find(
                {
                    status: { $in: ACTIVE_ORDER_STATUSES },
                    createdAt: { $lte: period.to },
                    ...(input.statuses?.length ? { status: { $in: input.statuses } } : {}),
                },
                { populate: ['items', 'items.variant', 'items.variant.product', 'batches', 'batches.variant', 'salesOrder', 'salesOrder.customer'] }
            ),
        ]);

        const aggregate = new Map<string, GroupAggregate>();

        for (const batch of packedBatches) {
            const row = this.ensureAggregate(aggregate, batch, groupBy);
            row.producedQty += Number(batch.producedQty || 0);
            if (batch.productionOrder?.id) {
                row.orderIds.add(batch.productionOrder.id);
            }
        }

        for (const batch of plannedBatches) {
            const row = this.ensureAggregate(aggregate, batch, groupBy);
            row.plannedQty += Number(batch.plannedQty || 0);
            if (batch.productionOrder?.id) {
                row.orderIds.add(batch.productionOrder.id);
            }
        }

        for (const batch of openBatches) {
            const row = this.ensureAggregate(aggregate, batch, groupBy);
            row.inProgressQty += Math.max(Number(batch.plannedQty || 0) - Number(batch.producedQty || 0), 0);
            if (batch.productionOrder?.id) {
                row.orderIds.add(batch.productionOrder.id);
            }
        }

        for (const order of ordersInPeriod) {
            const plannedByVariant = new Map<string, number>();
            for (const batch of order.batches.getItems()) {
                const variantId = batch.variant?.id;
                if (!variantId) continue;
                plannedByVariant.set(variantId, Number(plannedByVariant.get(variantId) || 0) + Number(batch.plannedQty || 0));
            }
            for (const item of order.items.getItems()) {
                const itemVariantId = item.variant?.id;
                if (!itemVariantId) continue;
                if (Number(plannedByVariant.get(itemVariantId) || 0) === 0) {
                    const row = this.ensureAggregateFromOrderItem(aggregate, order, item, groupBy);
                    row.plannedQty += Number(item.quantity || 0);
                    row.orderIds.add(order.id);
                }
            }
        }

        for (const order of activeOrders) {
            const batchesByVariant = new Map<string, ProductionBatch[]>();
            for (const batch of order.batches.getItems()) {
                const variantId = batch.variant?.id;
                if (!variantId) continue;
                const list = batchesByVariant.get(variantId) || [];
                list.push(batch);
                batchesByVariant.set(variantId, list);
            }
            for (const item of order.items.getItems()) {
                const itemVariantId = item.variant?.id;
                if (!itemVariantId) continue;
                const variantBatches = batchesByVariant.get(itemVariantId) || [];
                if (variantBatches.length === 0) {
                    const row = this.ensureAggregateFromOrderItem(aggregate, order, item, groupBy);
                    row.inProgressQty += Number(item.quantity || 0);
                    row.orderIds.add(order.id);
                }
            }
        }

        const rows = Array.from(aggregate.values())
            .map((row) => ({
                key: row.key,
                label: row.label,
                producedQty: row.producedQty,
                plannedQty: row.plannedQty,
                inProgressQty: row.inProgressQty,
                completionRatePercent: row.plannedQty > 0 ? clampPercent((row.producedQty / row.plannedQty) * 100) : 0,
                orderCount: row.orderIds.size,
                productName: row.productName,
                variantName: row.variantName,
                variantSku: row.variantSku,
                customerName: row.customerName,
            }))
            .sort((a, b) => b.producedQty - a.producedQty);

        return {
            period: {
                from: period.from,
                to: period.to,
                month: period.month,
            },
            groupBy,
            rows,
        };
    }

    async exportDetailCsv(input: AnalyticsInput): Promise<{ fileName: string; content: string }> {
        const detail = await this.getDetail(input);
        const headers = [
            'grupo',
            'etiqueta',
            'producto',
            'variante',
            'sku_variante',
            'cliente',
            'cantidad_producida',
            'cantidad_planificada',
            'cantidad_en_proceso',
            'porcentaje_cumplimiento',
            'ordenes',
        ];

        const lines = detail.rows.map((row) => [
            row.key,
            row.label,
            row.productName || '',
            row.variantName || '',
            row.variantSku || '',
            row.customerName || '',
            String(row.producedQty),
            String(row.plannedQty),
            String(row.inProgressQty),
            String(row.completionRatePercent),
            String(row.orderCount),
        ].map((value) => `"${value.replace(/"/g, '""')}"`).join(','));

        const suffix = detail.period.month || `${toMonthKey(new Date(detail.period.from))}_${toMonthKey(new Date(detail.period.to))}`;
        return {
            fileName: `production_analytics_${detail.groupBy}_${suffix}.csv`,
            content: [headers.join(','), ...lines].join('\n'),
        };
    }
}
