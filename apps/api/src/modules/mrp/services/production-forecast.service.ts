import { EntityManager, EntityRepository, FilterQuery } from '@mikro-orm/core';
import {
    ForecastGroupBy,
    ForecastInsight,
    ProductionForecastResult,
    SalesVelocityPoint,
    CustomerForecastInsight,
    CustomerVariantForecast,
} from '@scaffold/types';
import { SalesOrderItem } from '../entities/sales-order-item.entity';
import { InventoryItem } from '../entities/inventory-item.entity';

type ForecastInput = {
    months?: number;
    from?: string;
    to?: string;
    groupBy?: ForecastGroupBy;
    minStockDays?: number;
    safetyStockDays?: number;
};

type PeriodRange = {
    from: Date;
    to: Date;
};

const toMonthKey = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;

const startOfMonth = (year: number, monthIndex: number) => new Date(year, monthIndex, 1, 0, 0, 0, 0);
const endOfMonth = (year: number, monthIndex: number) => new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

export class ProductionForecastService {
    private readonly salesOrderItemRepo: EntityRepository<SalesOrderItem>;
    private readonly inventoryRepo: EntityRepository<InventoryItem>;

    constructor(em: EntityManager) {
        this.salesOrderItemRepo = em.getRepository(SalesOrderItem);
        this.inventoryRepo = em.getRepository(InventoryItem);
    }

    private resolvePeriod(input: ForecastInput): PeriodRange {
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

        const months = input.months || 6;
        const now = new Date();
        const from = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
        return {
            from: startOfMonth(from.getFullYear(), from.getMonth()),
            to: endOfMonth(now.getFullYear(), now.getMonth()),
        };
    }

    private getMonthsBetween(from: Date, to: Date): string[] {
        const months: string[] = [];
        const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
        while (cursor <= to) {
            months.push(toMonthKey(cursor));
            cursor.setMonth(cursor.getMonth() + 1);
        }
        return months;
    }

    async getForecast(input: ForecastInput): Promise<ProductionForecastResult> {
        const period = this.resolvePeriod(input);
        const groupBy = input.groupBy || 'variant';
        const minStockDays = input.minStockDays || 15;
        const safetyStockDays = input.safetyStockDays || 7;
        const monthsAnalyzed = this.getMonthsBetween(period.from, period.to).length;

        const salesItems = await this.salesOrderItemRepo.find(
            {
                salesOrder: { orderDate: { $gte: period.from, $lte: period.to } },
            } as FilterQuery<SalesOrderItem>,
            { populate: ['salesOrder', 'salesOrder.customer', 'product', 'variant'] }
        );

        const monthlyData = new Map<string, Map<string, number>>();
        const itemAggregates = new Map<string, {
            key: string;
            label: string;
            productId?: string;
            productName?: string;
            variantId?: string;
            variantName?: string;
            variantSku?: string;
            customerId?: string;
            customerName?: string;
            productionMinutesPerUnit: number;
            quantities: number[];
            months: string[];
        }>();

        // For customer grouping with nested variants
        const customerVariantMap = new Map<string, {
            customerId: string;
            customerName: string;
            variants: Map<string, {
                variantId: string;
                variantName: string;
                variantSku: string;
                productName: string;
                quantities: number[];
                months: string[];
                productionMinutesPerUnit: number;
            }>;
        }>();

        for (const item of salesItems) {
            const monthKey = toMonthKey(new Date(item.salesOrder.orderDate));
            const variant = item.variant;
            const product = item.product;
            const customer = item.salesOrder.customer;

            let key: string;
            let label: string;

            if (groupBy === 'product') {
                key = product.id;
                label = product.name;
            } else if (groupBy === 'customer') {
                key = customer?.id || 'customer:none';
                label = customer?.name || 'Sin cliente';
            } else if (groupBy === 'variant-customer') {
                const variantKey = variant?.id || `variant:none:${product.id}`;
                const customerKey = customer?.id || 'customer:none';
                key = `${variantKey}|${customerKey}`;
                label = variant 
                    ? `${product.name} - ${variant.name} → ${customer?.name || 'Sin cliente'}`
                    : `${product.name} → ${customer?.name || 'Sin cliente'}`;
            } else {
                key = variant?.id || `variant:none:${product.id}`;
                label = variant ? `${product.name} - ${variant.name}` : product.name;
            }

            const existing = itemAggregates.get(key) || {
                key,
                label,
                productId: product.id,
                productName: product.name,
                variantId: variant?.id || undefined,
                variantName: variant?.name || undefined,
                variantSku: variant?.sku || undefined,
                customerId: customer?.id || undefined,
                customerName: customer?.name || undefined,
                productionMinutesPerUnit: variant?.productionMinutes ? Number(variant.productionMinutes) : 0,
                quantities: [],
                months: [],
            };

            existing.quantities.push(Number(item.quantity || 0));
            existing.months.push(monthKey);

            if (!itemAggregates.has(key)) {
                itemAggregates.set(key, existing);
            }

            const monthMap = monthlyData.get(key) || new Map<string, number>();
            monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + Number(item.quantity || 0));
            monthlyData.set(key, monthMap);

            // Build customer-variant mapping for nested view
            if (groupBy === 'customer' && customer?.id) {
                const customerKey = customer.id;
                const customerData = customerVariantMap.get(customerKey) || {
                    customerId: customerKey,
                    customerName: customer.name || 'Sin nombre',
                    variants: new Map<string, any>(),
                };

                if (!customerVariantMap.has(customerKey)) {
                    customerVariantMap.set(customerKey, customerData);
                }

                const variantKey = variant?.id || `variant:none:${product.id}`;
                const variantData = customerData.variants.get(variantKey) || {
                    variantId: variant?.id || variantKey,
                    variantName: variant?.name || 'Sin variante',
                    variantSku: variant?.sku || 'N/A',
                    productName: product.name,
                    quantities: [],
                    months: [],
                    productionMinutesPerUnit: variant?.productionMinutes ? Number(variant.productionMinutes) : 0,
                };

                variantData.quantities.push(Number(item.quantity || 0));
                variantData.months.push(monthKey);
                customerData.variants.set(variantKey, variantData);
            }
        }

        const variantIds = new Set<string>();
        for (const agg of itemAggregates.values()) {
            if (agg.variantId) variantIds.add(agg.variantId);
        }

        const inventoryItems = variantIds.size > 0
            ? await this.inventoryRepo.find(
                { variant: { id: { $in: Array.from(variantIds) } } } as FilterQuery<InventoryItem>,
                { populate: ['variant'] }
            )
            : [];

        const stockByVariant = new Map<string, number>();
        for (const inv of inventoryItems) {
            const variantId = inv.variant?.id;
            if (variantId) {
                stockByVariant.set(variantId, (stockByVariant.get(variantId) || 0) + Number(inv.quantity || 0));
            }
        }

        const insights: ForecastInsight[] = [];
        const customerInsights: CustomerForecastInsight[] = [];
        let totalSuggestedProduction = 0;
        let totalEstimatedHours = 0;
        let criticalItems = 0;
        let lowStockItems = 0;

        for (const agg of itemAggregates.values()) {
            const totalQuantity = agg.quantities.reduce((sum, q) => sum + q, 0);
            const monthlyVelocity = monthsAnalyzed > 0 ? totalQuantity / monthsAnalyzed : 0;
            const dailyVelocity = monthlyVelocity / 30;

            const velocityTrend: SalesVelocityPoint[] = [];
            const allMonths = this.getMonthsBetween(period.from, period.to);
            const monthMap = monthlyData.get(agg.key) || new Map<string, number>();
            for (const month of allMonths) {
                velocityTrend.push({
                    month,
                    quantity: monthMap.get(month) || 0,
                });
            }

            const currentStock = agg.variantId ? (stockByVariant.get(agg.variantId) || 0) : 0;
            const stockCoverDays = dailyVelocity > 0 ? currentStock / dailyVelocity : 999;
            const reorderPoint = (dailyVelocity * minStockDays) + (dailyVelocity * safetyStockDays);
            const suggestedProduction = Math.max(0, Math.ceil(reorderPoint - currentStock));

            const productionMinutesPerUnit = agg.productionMinutesPerUnit || 0;
            const estimatedProductionTimeHours = (suggestedProduction * productionMinutesPerUnit) / 60;

            let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';
            if (stockCoverDays <= 0) {
                urgency = 'critical';
                criticalItems++;
            } else if (stockCoverDays <= safetyStockDays) {
                urgency = 'high';
                criticalItems++;
            } else if (stockCoverDays <= minStockDays) {
                urgency = 'medium';
                lowStockItems++;
            } else {
                lowStockItems++;
            }

            insights.push({
                key: agg.key,
                label: agg.label,
                productId: agg.productId,
                productName: agg.productName,
                variantId: agg.variantId,
                variantName: agg.variantName,
                variantSku: agg.variantSku,
                customerId: agg.customerId,
                customerName: agg.customerName,
                currentStock,
                monthlyVelocity: Math.round(monthlyVelocity * 100) / 100,
                velocityTrend,
                suggestedProduction,
                productionMinutesPerUnit,
                estimatedProductionTimeHours: Math.round(estimatedProductionTimeHours * 100) / 100,
                stockCoverDays: Math.round(stockCoverDays * 10) / 10,
                reorderPoint: Math.ceil(reorderPoint),
                urgency,
            });

            totalSuggestedProduction += suggestedProduction;
            totalEstimatedHours += estimatedProductionTimeHours;
        }

        // Build customer insights with nested variants
        if (groupBy === 'customer') {
            for (const [customerId, customerData] of customerVariantMap) {
                let customerSuggestedProduction = 0;
                let customerEstimatedHours = 0;
                let customerCriticalItems = 0;
                const variants: CustomerVariantForecast[] = [];

                for (const variantData of customerData.variants.values()) {
                    const totalQuantity = variantData.quantities.reduce((sum, q: number) => sum + q, 0);
                    const monthlyVelocity = monthsAnalyzed > 0 ? totalQuantity / monthsAnalyzed : 0;
                    const dailyVelocity = monthlyVelocity / 30;
                    const currentStock = stockByVariant.get(variantData.variantId) || 0;
                    const stockCoverDays = dailyVelocity > 0 ? currentStock / dailyVelocity : 999;
                    const reorderPoint = (dailyVelocity * minStockDays) + (dailyVelocity * safetyStockDays);
                    const suggestedProduction = Math.max(0, Math.ceil(reorderPoint - currentStock));
                    const estimatedHours = (suggestedProduction * variantData.productionMinutesPerUnit) / 60;

                    let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';
                    if (stockCoverDays <= 0 || stockCoverDays <= safetyStockDays) {
                        urgency = stockCoverDays <= 0 ? 'critical' : 'high';
                        customerCriticalItems++;
                    } else if (stockCoverDays <= minStockDays) {
                        urgency = 'medium';
                    }

                    variants.push({
                        variantId: variantData.variantId,
                        variantName: variantData.variantName,
                        variantSku: variantData.variantSku,
                        productName: variantData.productName,
                        currentStock,
                        monthlyVelocity: Math.round(monthlyVelocity * 100) / 100,
                        stockCoverDays: Math.round(stockCoverDays * 10) / 10,
                        suggestedProduction,
                        estimatedProductionTimeHours: Math.round(estimatedHours * 100) / 100,
                        urgency,
                    });

                    customerSuggestedProduction += suggestedProduction;
                    customerEstimatedHours += estimatedHours;
                }

                customerInsights.push({
                    key: customerId,
                    customerId,
                    customerName: customerData.customerName,
                    totalSuggestedProduction: customerSuggestedProduction,
                    totalEstimatedHours: Math.round(customerEstimatedHours * 100) / 100,
                    criticalItems: customerCriticalItems,
                    variants,
                });
            }
        }

        insights.sort((a, b) => {
            const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
                return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
            }
            return b.suggestedProduction - a.suggestedProduction;
        });

        return {
            period: {
                from: period.from,
                to: period.to,
                monthsAnalyzed,
            },
            groupBy,
            insights,
            customerInsights: customerInsights.length > 0 ? customerInsights : undefined,
            summary: {
                totalSuggestedProduction,
                totalEstimatedHours: Math.round(totalEstimatedHours * 100) / 100,
                criticalItems,
                lowStockItems,
            },
        };
    }
}
