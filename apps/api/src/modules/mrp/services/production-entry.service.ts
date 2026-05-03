import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { ProductionEntry } from '../entities/production-entry.entity';
import { ProductionOrderItem } from '../entities/production-order-item.entity';
import { Operator } from '../entities/operator.entity';
import { AppError } from '../../../shared/utils/response';
import { CreateProductionEntrySchema } from '@scaffold/schemas';

export class ProductionEntryService {
    private readonly em: EntityManager;
    private readonly repo: EntityRepository<ProductionEntry>;

    constructor(em: EntityManager) {
        this.em = em;
        this.repo = em.getRepository(ProductionEntry);
    }

    async list(page: number, limit: number, from?: Date, to?: Date, operatorId?: string) {
        const where: Record<string, unknown> = {};
        const dateFilter: Record<string, Date> = {};
        if (from) dateFilter.$gte = from;
        if (to) dateFilter.$lte = to;
        if (Object.keys(dateFilter).length > 0) where.entryDate = dateFilter;
        if (operatorId) where.operator = operatorId;

        const [rows, total] = await this.repo.findAndCount(where, {
            populate: ['operator', 'variant.product', 'productionOrderItem.productionOrder'],
            orderBy: [{ entryDate: 'DESC' }, { createdAt: 'DESC' }],
            limit,
            offset: (page - 1) * limit,
        });

        return { data: rows, total, page, limit };
    }

    async getById(id: string) {
        const entry = await this.repo.findOne(
            { id },
            { populate: ['operator', 'variant.product', 'productionOrderItem.productionOrder'] }
        );
        if (!entry) {
            throw new AppError('Registro de producción no encontrado', 404);
        }
        return entry;
    }

    async create(payload: unknown) {
        const data = CreateProductionEntrySchema.parse(payload);

        const operator = await this.em.getRepository(Operator).findOne({ id: data.operatorId });
        if (!operator) {
            throw new AppError('Operador no encontrado', 404);
        }

        const entries: ProductionEntry[] = [];
        for (const item of data.items) {
            const orderItem = await this.em.getRepository(ProductionOrderItem).findOne(
                { id: item.productionOrderItemId },
                { populate: ['variant', 'variant.product', 'productionOrder'] }
            );
            if (!orderItem) {
                throw new AppError('Ítem de orden de producción no encontrado', 404);
            }

            const remaining = Math.floor(Number(orderItem.quantity) - Number(orderItem.producedQuantity));
            if (item.quantity > remaining) {
                throw new AppError(
                    `Cantidad excede lo pendiente para ${orderItem.variant.sku || orderItem.variant.name}. Restante: ${remaining}`,
                    400
                );
            }

            const entry = Object.assign(new ProductionEntry(), {
                entryDate: data.entryDate,
                operator,
                productionOrderItem: orderItem,
                variant: orderItem.variant,
                quantity: item.quantity,
                notes: data.notes,
            });
            entries.push(entry);

            orderItem.producedQuantity = Number(orderItem.producedQuantity) + Number(item.quantity);
        }

        await this.em.persistAndFlush(entries);
        return entries;
    }

    async delete(id: string) {
        const entry = await this.getById(id);

        const orderItem = entry.productionOrderItem as ProductionOrderItem;
        if (orderItem && orderItem.id) {
            const managed = await this.em.getRepository(ProductionOrderItem).findOne({ id: orderItem.id });
            if (managed) {
                managed.producedQuantity = Math.max(0, Number(managed.producedQuantity) - Number(entry.quantity));
            }
        }

        await this.em.removeAndFlush(entry);
    }

    async getByDateRange(from: Date, to: Date, operatorId?: string) {
        const dateFilter: Record<string, Date> = { $gte: from, $lte: to };
        const where: Record<string, unknown> = { entryDate: dateFilter };
        if (operatorId) where.operator = operatorId;

        const entries = await this.repo.find(where, {
            populate: ['operator', 'variant.product', 'productionOrderItem.productionOrder'],
            orderBy: [{ operator: 'ASC' }, { entryDate: 'ASC' }, { variant: 'ASC' }],
        });

        return entries;
    }

    async getKpis(from?: Date, to?: Date, operatorId?: string) {
        const where: Record<string, unknown> = {};
        const dateFilter: Record<string, Date> = {};
        if (from) dateFilter.$gte = from;
        if (to) dateFilter.$lte = to;
        if (Object.keys(dateFilter).length > 0) where.entryDate = dateFilter;
        if (operatorId) where.operator = operatorId;

        const entries = await this.repo.find(where, {
            populate: ['operator', 'variant.product', 'productionOrderItem.productionOrder'],
        });

        const byOperator = new Map<string, { operator: string; code?: string; total: number; count: number }>();
        const byProductByOperator = new Map<string, Map<string, { product: string; sku: string; total: number }>>();
        const byOperatorByProduct = new Map<string, Map<string, { operator: string; code?: string; total: number }>>();
        const byDateByOperator = new Map<string, Map<string, number>>();
        const productNameToSku = new Map<string, Set<string>>();
        let grandTotal = 0;
        const totalEntries = entries.length;

        for (const entry of entries) {
            const opId = entry.operator.id;
            const opName = entry.operator.name;
            const opCode = entry.operator.code;
            const variant = entry.variant;
            const productName = variant.product?.name || 'Sin nombre';
            const sku = variant.sku || '';
            const qty = Number(entry.quantity || 0);
            const dateStr = new Date(entry.entryDate).toISOString().slice(0, 10);

            if (!byOperator.has(opId)) {
                byOperator.set(opId, { operator: opName, code: opCode, total: 0, count: 0 });
            }
            const opData = byOperator.get(opId)!;
            opData.total += qty;
            opData.count += 1;

            if (!byProductByOperator.has(opId)) {
                byProductByOperator.set(opId, new Map());
            }
            const prodMap = byProductByOperator.get(opId)!;
            if (!prodMap.has(sku)) {
                prodMap.set(sku, { product: productName, sku, total: 0 });
            }
            prodMap.get(sku)!.total += qty;

            if (!productNameToSku.has(productName)) {
                productNameToSku.set(productName, new Set());
            }
            if (sku) productNameToSku.get(productName)!.add(sku);

            if (!byOperatorByProduct.has(productName)) {
                byOperatorByProduct.set(productName, new Map());
            }
            const opMap = byOperatorByProduct.get(productName)!;
            if (!opMap.has(opId)) {
                opMap.set(opId, { operator: opName, code: opCode, total: 0 });
            }
            opMap.get(opId)!.total += qty;

            if (!byDateByOperator.has(opId)) {
                byDateByOperator.set(opId, new Map());
            }
            const dateMap = byDateByOperator.get(opId)!;
            dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + qty);

            grandTotal += qty;
        }

        const operatorStats = Array.from(byOperator.entries()).map(([id, data]) => {
            const products = Array.from(byProductByOperator.get(id)?.values() ?? []);
            products.sort((a, b) => b.total - a.total);
            const topProduct = products[0] ?? null;
            return {
                id,
                operator: data.operator,
                code: data.code,
                totalQuantity: data.total,
                entryCount: data.count,
                topProduct,
            };
        });
        operatorStats.sort((a, b) => b.totalQuantity - a.totalQuantity);

        const allProducts = new Map<string, { product: string; sku: string; total: number; operators: Map<string, number> }>();
        for (const [opId, prodMap] of byProductByOperator.entries()) {
            const opName = byOperator.get(opId)!.operator;
            for (const [sku, data] of prodMap.entries()) {
                if (!allProducts.has(sku)) {
                    allProducts.set(sku, { product: data.product, sku, total: 0, operators: new Map() });
                }
                const existing = allProducts.get(sku)!;
                existing.total += data.total;
                existing.operators.set(opName, (existing.operators.get(opName) || 0) + data.total);
            }
        }

        const productSpecialization = Array.from(allProducts.values()).map((data) => {
            const sorted = Array.from(data.operators.entries()).sort((a, b) => b[1] - a[1]);
            return {
                product: data.product,
                sku: data.sku,
                total: data.total,
                specialists: sorted.slice(0, 3).map(([name, qty]) => ({ operator: name, quantity: qty })),
            };
        });
        productSpecialization.sort((a, b) => b.total - a.total);

        const globalTopProducts = productSpecialization.map((p) => ({
            product: p.product,
            sku: p.sku,
            total: p.total,
            operator: p.specialists.length > 0 ? p.specialists[0].operator : '-',
        }));

        const operatorDailyHistory = Array.from(byOperator.entries()).map(([opId, data]) => {
            const daily = Array.from(byDateByOperator.get(opId)?.entries() ?? []);
            daily.sort((a, b) => b[0].localeCompare(a[0]));
            return {
                id: opId,
                operator: data.operator,
                code: data.code,
                total: data.total,
                daily: daily.map(([date, qty]) => ({ date, quantity: qty })),
            };
        });
        operatorDailyHistory.sort((a, b) => b.total - a.total);

        const crossMatrix: Array<{ product: string; sku: string; byOperator: Array<{ operator: string; quantity: number }> }> = [];
        for (const [productName, opMap] of byOperatorByProduct.entries()) {
            const breakdown = Array.from(opMap.values()).map((o) => ({ operator: o.operator, quantity: o.total }));
            breakdown.sort((a, b) => b.quantity - a.quantity);
            const skus = Array.from(productNameToSku.get(productName) || []);
            crossMatrix.push({
                product: productName,
                sku: skus.join(', '),
                byOperator: breakdown,
            });
        }

        return {
            summary: {
                grandTotal,
                totalEntries,
                operatorCount: byOperator.size,
            },
            byOperator: operatorStats,
            globalTopProducts: globalTopProducts.slice(0, 10),
            productSpecialization: productSpecialization.slice(0, 20),
            operatorDailyHistory,
            crossMatrix,
        };
    }
}
