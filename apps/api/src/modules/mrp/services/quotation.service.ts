import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { AppError } from '../../../shared/utils/response';
import { Quotation } from '../entities/quotation.entity';
import { QuotationItem } from '../entities/quotation-item.entity';
import { Customer } from '../entities/customer.entity';
import { Product } from '../entities/product.entity';
import { ProductVariant } from '../entities/product-variant.entity';
import { ProductTaxStatus, QuotationItemLineType, QuotationStatus, SalesOrderStatus } from '@scaffold/types';
import { SalesOrderService } from './sales-order.service';
import { OperationalConfig } from '../entities/operational-config.entity';
import { QualityAuditEvent } from '../entities/quality-audit-event.entity';

type QuotationInputItem = {
    lineType?: QuotationItemLineType | 'item' | 'note';
    isCatalogItem?: boolean;
    productId?: string;
    variantId?: string;
    customDescription?: string;
    customSku?: string;
    noteText?: string;
    itemNotes?: string;
    quantity: number;
    approvedQuantity?: number;
    unitPrice: number;
    discountPercent?: number;
    taxRate?: number;
    approved?: boolean;
};

type CreateQuotationInput = {
    customerId: string;
    validUntil?: Date;
    notes?: string;
    globalDiscountPercent?: number;
    items: QuotationInputItem[];
};

export class QuotationService {
    private readonly em: EntityManager;
    private readonly quotationRepo: EntityRepository<Quotation>;

    constructor(em: EntityManager) {
        this.em = em;
        this.quotationRepo = em.getRepository(Quotation);
    }

    private buildAuditSnapshot(quotation: Quotation) {
        return {
            code: quotation.code,
            status: quotation.status,
            customerId: quotation.customer?.id,
            subtotalBase: quotation.subtotalBase,
            taxTotal: quotation.taxTotal,
            totalAmount: quotation.totalAmount,
            netTotalAmount: quotation.netTotalAmount,
            globalDiscountPercent: quotation.globalDiscountPercent,
        };
    }

    private async logAudit(
        manager: EntityManager,
        entityId: string,
        action: string,
        metadata?: Record<string, unknown>,
        actor?: string
    ) {
        const repo = manager.getRepository(QualityAuditEvent);
        const event = repo.create({
            entityType: 'quotation',
            entityId,
            action,
            actor,
            metadata,
        } as unknown as QualityAuditEvent);
        await manager.persistAndFlush(event);
    }

    private round(value: number, decimals = 2) {
        const factor = 10 ** decimals;
        return Math.round((value + Number.EPSILON) * factor) / factor;
    }

    private parseLastNumber(code: string) {
        const match = code.match(/(\d+)$/);
        if (!match) return 0;
        return Number(match[1] || 0);
    }

    private async generateCode(tx: EntityManager) {
        const last = await tx.getRepository(Quotation).findOne(
            { deletedAt: null as never },
            { orderBy: { createdAt: 'DESC' } }
        );
        const next = (last ? this.parseLastNumber(last.code) : 0) + 1;
        return `COT-${String(next).padStart(5, '0')}`;
    }

    private minMargin(targetMargin: number) {
        return Math.max(0, targetMargin - 0.1);
    }

    private isNoteLine(item: Pick<QuotationItem, 'lineType'> | Pick<QuotationInputItem, 'lineType'>) {
        return String(item.lineType || '') === 'note';
    }

    private getPricedItems(items: QuotationItem[]) {
        return items.filter((item) => !this.isNoteLine(item));
    }

    private resolveCatalogTax(variant?: ProductVariant, fallbackRate?: number) {
        if (!variant) {
            return Number(fallbackRate || 0);
        }
        if (variant.taxStatus === ProductTaxStatus.GRAVADO) {
            return Number(variant.taxRate || fallbackRate || 0);
        }
        return 0;
    }

    private validateMarginAndDiscount(params: {
        baseUnitCost: number;
        targetMargin: number;
        listedUnitPrice: number;
        finalUnitPrice: number;
        itemLabel: string;
        allowBelowMargin?: boolean;
    }) {
        const minAllowedMargin = this.minMargin(params.targetMargin);
        if (params.finalUnitPrice <= 0) {
            throw new AppError(`Precio final inválido en ítem ${params.itemLabel}`, 400);
        }
        const finalMargin = (params.finalUnitPrice - params.baseUnitCost) / params.finalUnitPrice;
        if (finalMargin + 1e-9 < minAllowedMargin) {
            if (params.allowBelowMargin) {
                return minAllowedMargin;
            }
            const minAllowedUnitPrice = minAllowedMargin >= 1
                ? Number.POSITIVE_INFINITY
                : (params.baseUnitCost / (1 - minAllowedMargin));
            const maxDiscountPercent = params.listedUnitPrice > 0
                ? Math.max(0, (1 - (minAllowedUnitPrice / params.listedUnitPrice)) * 100)
                : 0;
            const maxDiscountValue = Math.max(0, params.listedUnitPrice - minAllowedUnitPrice);
            const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
            }).format(Number.isFinite(value) ? value : 0);
            throw new AppError(
                `Descuento excede límite en ítem ${params.itemLabel}. Máximo ${(maxDiscountPercent).toFixed(2)}% (${formatCurrency(maxDiscountValue)}). Margen mínimo ${(minAllowedMargin * 100).toFixed(2)}%.`,
                400
            );
        }
        return minAllowedMargin;
    }

    private async buildItem(
        tx: EntityManager,
        quotation: Quotation,
        row: QuotationInputItem,
        index: number,
        globalDiscountPercent: number,
        allowBelowMargin: boolean
    ) {
        if (row.lineType === QuotationItemLineType.NOTE) {
            const noteText = (row.noteText || '').trim();
            if (!noteText) {
                throw new AppError(`Línea ${index + 1}: texto de nota requerido`, 400);
            }
            const item = new QuotationItem();
            item.quotation = quotation;
            item.lineType = QuotationItemLineType.NOTE;
            item.isCatalogItem = false;
            item.noteText = noteText;
            item.customDescription = 'Nota';
            item.customSku = undefined;
            item.sortOrder = index;
            item.quantity = 0;
            item.approvedQuantity = 0;
            item.convertedQuantity = 0;
            item.unitPrice = 0;
            item.baseUnitCost = 0;
            item.targetMargin = 0;
            item.minAllowedMargin = 0;
            item.discountPercent = 0;
            item.taxRate = 0;
            item.taxAmount = 0;
            item.subtotal = 0;
            item.netSubtotal = 0;
            item.approved = false;
            return item;
        }

        const isCatalogItem = row.isCatalogItem !== false;
        let product: Product | undefined;
        let variant: ProductVariant | undefined;
        let baseUnitCost = 0;
        let targetMargin = 0.4;
        let label = `#${index + 1}`;

        if (isCatalogItem) {
            if (!row.productId) throw new AppError(`Ítem ${index + 1}: productId requerido`, 400);
            product = await tx.getRepository(Product).findOneOrFail({ id: row.productId, deletedAt: null as never });
            if (row.variantId) {
                variant = await tx.getRepository(ProductVariant).findOneOrFail({ id: row.variantId, deletedAt: null as never });
                baseUnitCost = Number(variant.cost || 0);
                targetMargin = Number(variant.targetMargin ?? 0.4);
                label = variant.sku || product.sku;
            } else {
                baseUnitCost = 0;
                targetMargin = 0.4;
                label = product.sku;
            }
        } else {
            if (!row.customDescription) throw new AppError(`Ítem ${index + 1}: descripción requerida para ítem libre`, 400);
            baseUnitCost = 0;
            targetMargin = 0.1;
            label = row.customDescription;
        }

        const quantity = Number(row.quantity || 0);
        const approvedQuantity = Number(row.approvedQuantity ?? quantity);
        const discountPercent = globalDiscountPercent > 0
            ? globalDiscountPercent
            : Number(row.discountPercent || 0);
        const taxRate = isCatalogItem
            ? this.resolveCatalogTax(variant, row.taxRate)
            : Number(row.taxRate || 0);
        const listedUnitPrice = Number(row.unitPrice || 0);
        const finalUnitPrice = this.round(listedUnitPrice * (1 - (discountPercent / 100)), 4);

        if (quantity <= 0) throw new AppError(`Ítem ${label}: cantidad debe ser > 0`, 400);
        if (approvedQuantity < 0 || approvedQuantity > quantity) {
            throw new AppError(`Ítem ${label}: approvedQuantity fuera de rango`, 400);
        }
        if (finalUnitPrice <= 0) throw new AppError(`Ítem ${label}: precio final debe ser > 0`, 400);

        const minAllowedMargin = this.validateMarginAndDiscount({
            baseUnitCost,
            targetMargin,
            listedUnitPrice,
            finalUnitPrice,
            itemLabel: label,
            allowBelowMargin,
        });

        const subtotal = this.round(quantity * finalUnitPrice);
        const taxAmount = this.round(subtotal * (taxRate / 100));
        const netSubtotal = this.round(subtotal + taxAmount);

        const item = new QuotationItem();
        item.quotation = quotation;
        item.lineType = QuotationItemLineType.ITEM;
        item.isCatalogItem = isCatalogItem;
        item.product = product;
        item.variant = variant;
        item.customDescription = row.customDescription;
        item.customSku = row.customSku;
        item.itemNotes = row.itemNotes;
        item.noteText = undefined;
        item.sortOrder = index;
        item.quantity = quantity;
        item.approvedQuantity = approvedQuantity;
        item.convertedQuantity = 0;
        item.unitPrice = finalUnitPrice;
        item.baseUnitCost = baseUnitCost;
        item.targetMargin = targetMargin;
        item.minAllowedMargin = minAllowedMargin;
        item.discountPercent = discountPercent;
        item.taxRate = taxRate;
        item.taxAmount = taxAmount;
        item.subtotal = subtotal;
        item.netSubtotal = netSubtotal;
        item.approved = row.approved ?? approvedQuantity > 0;
        return item;
    }

    private recalculateHeader(quotation: Quotation) {
        let subtotalBase = 0;
        let taxTotal = 0;
        let grossTotal = 0;
        let discountTotal = 0;
        for (const item of this.getPricedItems(quotation.items.getItems())) {
            subtotalBase += Number(item.subtotal || 0);
            taxTotal += Number(item.taxAmount || 0);
            grossTotal += Number(item.netSubtotal || 0);
            const discountPercent = Number(item.discountPercent || 0);
            const finalUnitPrice = Number(item.unitPrice || 0);
            const qty = Number(item.quantity || 0);
            if (discountPercent > 0 && discountPercent < 100 && finalUnitPrice > 0 && qty > 0) {
                const listUnitPrice = finalUnitPrice / (1 - (discountPercent / 100));
                discountTotal += (listUnitPrice - finalUnitPrice) * qty;
            }
        }
        const netTotal = grossTotal;
        quotation.subtotalBase = this.round(subtotalBase);
        quotation.taxTotal = this.round(taxTotal);
        quotation.discountAmount = this.round(discountTotal);
        quotation.totalAmount = this.round(grossTotal);
        quotation.netTotalAmount = this.round(netTotal);
    }

    private quoteStatusFromItems(quotation: Quotation) {
        const items = this.getPricedItems(quotation.items.getItems());
        if (items.length === 0) return QuotationStatus.DRAFT;
        const approvedCount = items.filter((i) => i.approved && Number(i.approvedQuantity) > 0).length;
        if (approvedCount === 0) return QuotationStatus.REJECTED;
        if (approvedCount === items.length && items.every((i) => Number(i.approvedQuantity) >= Number(i.quantity))) {
            return QuotationStatus.APPROVED_FULL;
        }
        return QuotationStatus.APPROVED_PARTIAL;
    }

    private resolveVariantCostComposition(
        variant: ProductVariant | undefined,
        baseUnitCost: number,
        config?: OperationalConfig | null,
    ) {
        if (!variant) {
            return {
                materialCost: 0,
                laborCost: 0,
                indirectCost: 0,
                totalCost: 0,
            };
        }

        let laborCost = Number(variant.laborCost || 0);
        let indirectCost = Number(variant.indirectCost || 0);

        if (variant.productionMinutes && variant.productionMinutes > 0 && config) {
            laborCost = Number(variant.productionMinutes || 0) * Number(config.modCostPerMinute || 0);
            indirectCost = Number(variant.productionMinutes || 0) * Number(config.cifCostPerMinute || 0);
        }

        const totalCost = Number(baseUnitCost || 0);
        const materialCost = Math.max(0, totalCost - laborCost - indirectCost);

        return {
            materialCost: this.round(materialCost),
            laborCost: this.round(laborCost),
            indirectCost: this.round(indirectCost),
            totalCost: this.round(totalCost),
        };
    }

    private resolveAnalyticsWindow(month?: string) {
        if (!month) return null;
        const [yearRaw, monthRaw] = month.split('-');
        const year = Number(yearRaw);
        const monthIndex = Number(monthRaw) - 1;
        if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) {
            throw new AppError('Mes inválido para analíticas de cotización', 400);
        }
        const from = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
        const to = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));
        return { from, to };
    }

    private async getAnalyticsRows(filters?: { month?: string; status?: QuotationStatus }) {
        const where: Record<string, unknown> = { deletedAt: null };
        if (filters?.status) {
            where.status = filters.status;
        }
        const window = this.resolveAnalyticsWindow(filters?.month);
        if (window) {
            where.quotationDate = { $gte: window.from, $lt: window.to };
        }

        return this.quotationRepo.find(where, {
            populate: ['customer', 'items', 'items.product', 'items.variant'],
            orderBy: { quotationDate: 'ASC' },
        });
    }

    async getAnalyticsSummary(filters?: { month?: string; status?: QuotationStatus }) {
        const rows = await this.getAnalyticsRows(filters);
        const [operationalConfig] = await this.em.getRepository(OperationalConfig).find({}, {
            orderBy: { createdAt: 'DESC' },
            limit: 1,
        });
        const now = new Date();
        const breakdownMap = new Map<QuotationStatus, { count: number; amount: number }>();

        let totalQuotedAmount = 0;
        let approvedAmount = 0;
        let convertedAmount = 0;
        let expiredPendingCount = 0;
        let convertedCount = 0;
        let materialCostAmount = 0;
        let laborCostAmount = 0;
        let indirectCostAmount = 0;

        for (const row of rows) {
            const amount = Number(row.netTotalAmount || 0);
            totalQuotedAmount += amount;
            if (
                row.status === QuotationStatus.APPROVED_FULL ||
                row.status === QuotationStatus.APPROVED_PARTIAL ||
                row.status === QuotationStatus.CONVERTED
            ) {
                approvedAmount += amount;
            }
            if (row.status === QuotationStatus.CONVERTED) {
                convertedAmount += amount;
                convertedCount += 1;
            }
            if (
                row.validUntil &&
                new Date(row.validUntil) < now &&
                row.status !== QuotationStatus.CONVERTED &&
                row.status !== QuotationStatus.REJECTED
            ) {
                expiredPendingCount += 1;
            }

            const current = breakdownMap.get(row.status) || { count: 0, amount: 0 };
            current.count += 1;
                current.amount += amount;
            breakdownMap.set(row.status, current);

            for (const item of this.getPricedItems(row.items.getItems())) {
                const quantity = Number(item.quantity || 0);
                const composition = this.resolveVariantCostComposition(
                    item.variant,
                    Number(item.baseUnitCost || 0),
                    operationalConfig,
                );
                materialCostAmount += composition.materialCost * quantity;
                laborCostAmount += composition.laborCost * quantity;
                indirectCostAmount += composition.indirectCost * quantity;
            }
        }

        const quotationCount = rows.length;
        const averageTicket = quotationCount > 0 ? totalQuotedAmount / quotationCount : 0;
        const conversionRatePercent = quotationCount > 0 ? (convertedCount / quotationCount) * 100 : 0;
        const totalCostAmount = materialCostAmount + laborCostAmount + indirectCostAmount;
        const estimatedGrossMarginAmount = totalQuotedAmount - totalCostAmount;
        const estimatedGrossMarginPercent = totalQuotedAmount > 0 ? (estimatedGrossMarginAmount / totalQuotedAmount) * 100 : 0;

        return {
            kpis: {
                quotationCount,
                totalQuotedAmount: this.round(totalQuotedAmount),
                approvedAmount: this.round(approvedAmount),
                convertedAmount: this.round(convertedAmount),
                averageTicket: this.round(averageTicket),
                conversionRatePercent: this.round(conversionRatePercent),
                expiredPendingCount,
                materialCostAmount: this.round(materialCostAmount),
                laborCostAmount: this.round(laborCostAmount),
                indirectCostAmount: this.round(indirectCostAmount),
                totalCostAmount: this.round(totalCostAmount),
                estimatedGrossMarginAmount: this.round(estimatedGrossMarginAmount),
                estimatedGrossMarginPercent: this.round(estimatedGrossMarginPercent),
            },
            breakdown: Array.from(breakdownMap.entries()).map(([status, data]) => ({
                status,
                count: data.count,
                amount: this.round(data.amount),
            })),
        };
    }

    async getAnalyticsTrend(filters?: { month?: string; status?: QuotationStatus }) {
        const rows = await this.getAnalyticsRows(filters);
        const points = new Map<string, { quotationCount: number; totalQuotedAmount: number; convertedAmount: number }>();

        for (const row of rows) {
            const date = new Date(row.quotationDate);
            const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
            const current = points.get(monthKey) || { quotationCount: 0, totalQuotedAmount: 0, convertedAmount: 0 };
            current.quotationCount += 1;
            current.totalQuotedAmount += Number(row.netTotalAmount || 0);
            if (row.status === QuotationStatus.CONVERTED) {
                current.convertedAmount += Number(row.netTotalAmount || 0);
            }
            points.set(monthKey, current);
        }

        return Array.from(points.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, data]) => ({
                month,
                quotationCount: data.quotationCount,
                totalQuotedAmount: this.round(data.totalQuotedAmount),
                convertedAmount: this.round(data.convertedAmount),
            }));
    }

    async getAnalyticsTopCustomers(filters?: { month?: string; status?: QuotationStatus; limit?: number }) {
        const rows = await this.getAnalyticsRows(filters);
        const grouped = new Map<string, { customerName: string; quotationCount: number; totalQuotedAmount: number; convertedAmount: number }>();

        for (const row of rows) {
            const customerId = row.customer.id;
            const current = grouped.get(customerId) || {
                customerName: row.customer.name,
                quotationCount: 0,
                totalQuotedAmount: 0,
                convertedAmount: 0,
            };
            current.quotationCount += 1;
            current.totalQuotedAmount += Number(row.netTotalAmount || 0);
            if (row.status === QuotationStatus.CONVERTED) {
                current.convertedAmount += Number(row.netTotalAmount || 0);
            }
            grouped.set(customerId, current);
        }

        return Array.from(grouped.entries())
            .map(([customerId, data]) => ({
                customerId,
                customerName: data.customerName,
                quotationCount: data.quotationCount,
                totalQuotedAmount: this.round(data.totalQuotedAmount),
                convertedAmount: this.round(data.convertedAmount),
            }))
            .sort((a, b) => b.totalQuotedAmount - a.totalQuotedAmount)
            .slice(0, filters?.limit || 5);
    }

    async getAnalyticsTopProducts(filters?: { month?: string; status?: QuotationStatus; limit?: number }) {
        const rows = await this.getAnalyticsRows(filters);
        const grouped = new Map<string, {
            productId?: string;
            label: string;
            variantHighlights: Set<string>;
            quotationCount: number;
            quantity: number;
            totalQuotedAmount: number;
        }>();

        for (const row of rows) {
            const seenKeys = new Set<string>();
            for (const item of this.getPricedItems(row.items.getItems())) {
                const key = item.product?.id || item.customSku || item.customDescription || item.id;
                const label = item.product?.name || item.customDescription || item.customSku || 'Ítem libre';
                const current = grouped.get(key) || {
                    productId: item.product?.id,
                    label,
                    variantHighlights: new Set<string>(),
                    quotationCount: 0,
                    quantity: 0,
                    totalQuotedAmount: 0,
                };
                if (!seenKeys.has(key)) {
                    current.quotationCount += 1;
                    seenKeys.add(key);
                }
                current.quantity += Number(item.quantity || 0);
                current.totalQuotedAmount += Number(item.netSubtotal || 0);
                if (item.variant?.name && item.product?.name) {
                    current.variantHighlights.add(item.variant.name);
                }
                grouped.set(key, current);
            }
        }

        return Array.from(grouped.values())
            .map((row) => ({
                productId: row.productId,
                label: row.label,
                variantHighlights: Array.from(row.variantHighlights).slice(0, 3),
                quotationCount: row.quotationCount,
                quantity: this.round(row.quantity, 3),
                totalQuotedAmount: this.round(row.totalQuotedAmount),
            }))
            .sort((a, b) => b.totalQuotedAmount - a.totalQuotedAmount)
            .slice(0, filters?.limit || 5);
    }

    async list(page = 1, limit = 20, search?: string, status?: QuotationStatus) {
        const query: Record<string, unknown> = { deletedAt: null };
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { code: { $ilike: `%${search}%` } },
                { customer: { name: { $ilike: `%${search}%` } } },
            ];
        }
        const [data, total] = await this.quotationRepo.findAndCount(query, {
            populate: ['customer'],
            limit,
            offset: (page - 1) * limit,
            orderBy: { createdAt: 'DESC' },
        });
        return { data, total, page, limit };
    }

    async getById(id: string) {
        return this.quotationRepo.findOneOrFail({ id, deletedAt: null as never }, {
            populate: ['customer', 'items', 'items.product', 'items.variant', 'convertedSalesOrder'],
        });
    }

    async create(payload: CreateQuotationInput, actor?: string) {
        return this.em.transactional(async (tx) => {
            const customer = await tx.getRepository(Customer).findOneOrFail({ id: payload.customerId, deletedAt: null as never });
            const [config] = await tx.getRepository(OperationalConfig).find({}, { orderBy: { createdAt: 'DESC' }, limit: 1 });
            const allowBelowMargin = Boolean(config?.allowQuotationBelowMargin);
            const quotation = new Quotation();
            quotation.customer = customer;
            quotation.code = await this.generateCode(tx);
            quotation.quotationDate = new Date();
            quotation.validUntil = payload.validUntil ? new Date(payload.validUntil) : undefined;
            quotation.notes = payload.notes;
            quotation.globalDiscountPercent = Number(payload.globalDiscountPercent || 0);
            quotation.status = QuotationStatus.DRAFT;

            const pricedItems = payload.items.filter((item) => item.lineType !== QuotationItemLineType.NOTE);
            if (pricedItems.length === 0) {
                throw new AppError('La cotización debe tener al menos un ítem cobrable', 400);
            }

            if (quotation.globalDiscountPercent > 0) {
                const hasPerItemDiscount = pricedItems.some((it) => Number(it.discountPercent || 0) > 0);
                if (hasPerItemDiscount) {
                    throw new AppError('No puedes aplicar descuento global y descuento por ítem al mismo tiempo', 400);
                }
            }

            for (let i = 0; i < payload.items.length; i += 1) {
                const item = await this.buildItem(tx, quotation, payload.items[i], i, quotation.globalDiscountPercent, allowBelowMargin);
                quotation.items.add(item);
            }
            this.recalculateHeader(quotation);
            tx.persist(quotation);
            await tx.flush();
            await this.logAudit(tx, quotation.id, 'created', {
                code: quotation.code,
                status: quotation.status,
                customerId: quotation.customer.id,
                totalAmount: quotation.totalAmount,
                netTotalAmount: quotation.netTotalAmount,
            }, actor);
            return this.getById(quotation.id);
        });
    }

    async update(id: string, payload: CreateQuotationInput, actor?: string) {
        return this.em.transactional(async (tx) => {
            const quotation = await tx.getRepository(Quotation).findOneOrFail(
                { id, deletedAt: null as never },
                { populate: ['items'] }
            );
            const [config] = await tx.getRepository(OperationalConfig).find({}, { orderBy: { createdAt: 'DESC' }, limit: 1 });
            const allowBelowMargin = Boolean(config?.allowQuotationBelowMargin);
            if (![QuotationStatus.DRAFT, QuotationStatus.SENT].includes(quotation.status)) {
                throw new AppError('Solo se puede editar una cotización en borrador o enviada', 400);
            }

            const before = this.buildAuditSnapshot(quotation);

            quotation.customer = await tx.getRepository(Customer).findOneOrFail({ id: payload.customerId, deletedAt: null as never });
            quotation.validUntil = payload.validUntil ? new Date(payload.validUntil) : undefined;
            quotation.notes = payload.notes;
            quotation.globalDiscountPercent = Number(payload.globalDiscountPercent || 0);

            const pricedItems = payload.items.filter((item) => item.lineType !== QuotationItemLineType.NOTE);
            if (pricedItems.length === 0) {
                throw new AppError('La cotización debe tener al menos un ítem cobrable', 400);
            }

            if (quotation.globalDiscountPercent > 0) {
                const hasPerItemDiscount = pricedItems.some((it) => Number(it.discountPercent || 0) > 0);
                if (hasPerItemDiscount) {
                    throw new AppError('No puedes aplicar descuento global y descuento por ítem al mismo tiempo', 400);
                }
            }

            for (const old of quotation.items.getItems()) {
                tx.remove(old);
            }
            quotation.items.removeAll();

            for (let i = 0; i < payload.items.length; i += 1) {
                const item = await this.buildItem(tx, quotation, payload.items[i], i, quotation.globalDiscountPercent, allowBelowMargin);
                quotation.items.add(item);
            }

            this.recalculateHeader(quotation);
            await tx.flush();
            const after = this.buildAuditSnapshot(quotation);
            await this.logAudit(tx, quotation.id, 'updated', { code: quotation.code, before, after }, actor);
            return this.getById(quotation.id);
        });
    }

    async updateStatus(id: string, status: QuotationStatus, actor?: string) {
        const quotation = await this.getById(id);
        const previousStatus = quotation.status;
        quotation.status = status;
        await this.em.flush();
        await this.logAudit(this.em, quotation.id, 'status_updated', {
            previousStatus,
            status: quotation.status,
            code: quotation.code,
        }, actor);
        return quotation;
    }

    async approve(id: string, payload: { items?: Array<{ quotationItemId: string; approved?: boolean; approvedQuantity?: number }> }, actor?: string) {
        return this.em.transactional(async (tx) => {
            const quotation = await tx.getRepository(Quotation).findOneOrFail({ id, deletedAt: null as never }, { populate: ['items'] });

            if (payload.items?.length) {
                const map = new Map(payload.items.map((r) => [r.quotationItemId, r]));
                for (const item of quotation.items.getItems()) {
                    if (this.isNoteLine(item)) continue;
                    const patch = map.get(item.id);
                    if (!patch) continue;
                    if (patch.approved !== undefined) item.approved = patch.approved;
                    if (patch.approvedQuantity !== undefined) {
                        const approvedQty = Number(patch.approvedQuantity);
                        if (approvedQty < 0 || approvedQty > Number(item.quantity)) {
                            throw new AppError(`approvedQuantity inválido en item ${item.id}`, 400);
                        }
                        item.approvedQuantity = approvedQty;
                    } else if (patch.approved === false) {
                        item.approvedQuantity = 0;
                    }
                }
            } else {
                for (const item of quotation.items.getItems()) {
                    if (this.isNoteLine(item)) continue;
                    item.approved = true;
                    item.approvedQuantity = Number(item.quantity);
                }
            }

            quotation.status = this.quoteStatusFromItems(quotation);
            await tx.flush();
            await this.logAudit(tx, quotation.id, 'approved', {
                status: quotation.status,
                code: quotation.code,
            }, actor);
            return this.getById(id);
        });
    }

    async convertToSalesOrder(id: string, payload?: { quotationItemIds?: string[] }, actor?: string) {
        return this.em.transactional(async (tx) => {
            const quotation = await tx.getRepository(Quotation).findOneOrFail(
                { id, deletedAt: null as never },
                { populate: ['items', 'items.product', 'items.variant', 'customer'] }
            );

            const selectedIds = new Set(payload?.quotationItemIds || []);
            const approvedPending = quotation.items.getItems().filter((item) => {
                if (this.isNoteLine(item)) return false;
                const idSelected = selectedIds.size === 0 || selectedIds.has(item.id);
                const pendingQty = Number(item.approvedQuantity || 0) - Number(item.convertedQuantity || 0);
                return idSelected && item.approved && pendingQty > 0;
            });

            if (approvedPending.length === 0) {
                throw new AppError('No hay ítems aprobados pendientes por convertir', 400);
            }

            const selected = approvedPending.filter((item) => item.isCatalogItem);
            if (selected.length === 0) {
                throw new AppError('No hay ítems de catálogo aprobados pendientes por convertir', 400);
            }

            const invalidCatalogSelected = selected.filter((item) => !item.product);
            if (invalidCatalogSelected.length > 0) {
                throw new AppError('Hay ítems de catálogo sin producto asociado. Revisa la cotización antes de convertir.', 409);
            }

            const salesOrderPayload = {
                customerId: quotation.customer.id,
                expectedDeliveryDate: quotation.validUntil,
                notes: `Generado desde cotización ${quotation.code}`,
                items: selected.map((item) => ({
                    productId: item.product!.id,
                    variantId: item.variant?.id,
                    quantity: Number(item.approvedQuantity) - Number(item.convertedQuantity || 0),
                    unitPrice: Number(item.unitPrice || 0),
                    taxRate: Number(item.taxRate || 0),
                })),
            };

            const soService = new SalesOrderService(tx);
            const order = await soService.createSalesOrder(salesOrderPayload, actor);

            for (const item of selected) {
                const pendingQty = Number(item.approvedQuantity || 0) - Number(item.convertedQuantity || 0);
                item.convertedQuantity = Number(item.convertedQuantity || 0) + pendingQty;
            }

            const pendingAfter = quotation.items.getItems().some((item) => {
                if (this.isNoteLine(item)) return false;
                if (!item.isCatalogItem) return false;
                const pendingQty = Number(item.approvedQuantity || 0) - Number(item.convertedQuantity || 0);
                return item.approved && pendingQty > 0;
            });

            quotation.convertedSalesOrder = order;
            quotation.status = pendingAfter ? QuotationStatus.APPROVED_PARTIAL : QuotationStatus.CONVERTED;

            if (order.status === SalesOrderStatus.PENDING) {
                order.notes = order.notes || quotation.notes;
            }

            await tx.flush();
            await this.logAudit(tx, quotation.id, 'converted_to_sales_order', {
                salesOrderId: order.id,
                status: quotation.status,
                code: quotation.code,
            }, actor);
            return {
                quotationId: quotation.id,
                quotationCode: quotation.code,
                salesOrderId: order.id,
                salesOrderCode: order.code,
                status: quotation.status,
            };
        });
    }
}
