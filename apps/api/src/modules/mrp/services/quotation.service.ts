import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { AppError } from '../../../shared/utils/response';
import { Quotation } from '../entities/quotation.entity';
import { QuotationItem } from '../entities/quotation-item.entity';
import { Customer } from '../entities/customer.entity';
import { Product } from '../entities/product.entity';
import { ProductVariant } from '../entities/product-variant.entity';
import { QuotationStatus, SalesOrderStatus } from '@scaffold/types';
import { SalesOrderService } from './sales-order.service';

type QuotationInputItem = {
    isCatalogItem?: boolean;
    productId?: string;
    variantId?: string;
    customDescription?: string;
    customSku?: string;
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

    private validateMarginAndDiscount(params: {
        baseUnitCost: number;
        targetMargin: number;
        listedUnitPrice: number;
        finalUnitPrice: number;
        itemLabel: string;
    }) {
        const minAllowedMargin = this.minMargin(params.targetMargin);
        if (params.finalUnitPrice <= 0) {
            throw new AppError(`Precio final inválido en ítem ${params.itemLabel}`, 400);
        }
        const finalMargin = (params.finalUnitPrice - params.baseUnitCost) / params.finalUnitPrice;
        if (finalMargin + 1e-9 < minAllowedMargin) {
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
        globalDiscountPercent: number
    ) {
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
        const taxRate = Number(row.taxRate || 0);
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
        });

        const subtotal = this.round(quantity * finalUnitPrice);
        const taxAmount = this.round(subtotal * (taxRate / 100));
        const netSubtotal = this.round(subtotal + taxAmount);

        const item = new QuotationItem();
        item.quotation = quotation;
        item.isCatalogItem = isCatalogItem;
        item.product = product;
        item.variant = variant;
        item.customDescription = row.customDescription;
        item.customSku = row.customSku;
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
        for (const item of quotation.items.getItems()) {
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
        const items = quotation.items.getItems();
        const approvedCount = items.filter((i) => i.approved && Number(i.approvedQuantity) > 0).length;
        if (approvedCount === 0) return QuotationStatus.REJECTED;
        if (approvedCount === items.length && items.every((i) => Number(i.approvedQuantity) >= Number(i.quantity))) {
            return QuotationStatus.APPROVED_FULL;
        }
        return QuotationStatus.APPROVED_PARTIAL;
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

    async create(payload: CreateQuotationInput) {
        return this.em.transactional(async (tx) => {
            const customer = await tx.getRepository(Customer).findOneOrFail({ id: payload.customerId, deletedAt: null as never });
            const quotation = new Quotation();
            quotation.customer = customer;
            quotation.code = await this.generateCode(tx);
            quotation.quotationDate = new Date();
            quotation.validUntil = payload.validUntil ? new Date(payload.validUntil) : undefined;
            quotation.notes = payload.notes;
            quotation.globalDiscountPercent = Number(payload.globalDiscountPercent || 0);
            quotation.status = QuotationStatus.DRAFT;

            if (quotation.globalDiscountPercent > 0) {
                const hasPerItemDiscount = payload.items.some((it) => Number(it.discountPercent || 0) > 0);
                if (hasPerItemDiscount) {
                    throw new AppError('No puedes aplicar descuento global y descuento por ítem al mismo tiempo', 400);
                }
            }

            for (let i = 0; i < payload.items.length; i += 1) {
                const item = await this.buildItem(tx, quotation, payload.items[i], i, quotation.globalDiscountPercent);
                quotation.items.add(item);
            }
            this.recalculateHeader(quotation);
            tx.persist(quotation);
            await tx.flush();
            return this.getById(quotation.id);
        });
    }

    async update(id: string, payload: CreateQuotationInput) {
        return this.em.transactional(async (tx) => {
            const quotation = await tx.getRepository(Quotation).findOneOrFail(
                { id, deletedAt: null as never },
                { populate: ['items'] }
            );
            if (![QuotationStatus.DRAFT, QuotationStatus.SENT].includes(quotation.status)) {
                throw new AppError('Solo se puede editar una cotización en borrador o enviada', 400);
            }

            quotation.customer = await tx.getRepository(Customer).findOneOrFail({ id: payload.customerId, deletedAt: null as never });
            quotation.validUntil = payload.validUntil ? new Date(payload.validUntil) : undefined;
            quotation.notes = payload.notes;
            quotation.globalDiscountPercent = Number(payload.globalDiscountPercent || 0);

            if (quotation.globalDiscountPercent > 0) {
                const hasPerItemDiscount = payload.items.some((it) => Number(it.discountPercent || 0) > 0);
                if (hasPerItemDiscount) {
                    throw new AppError('No puedes aplicar descuento global y descuento por ítem al mismo tiempo', 400);
                }
            }

            for (const old of quotation.items.getItems()) {
                tx.remove(old);
            }
            quotation.items.removeAll();

            for (let i = 0; i < payload.items.length; i += 1) {
                const item = await this.buildItem(tx, quotation, payload.items[i], i, quotation.globalDiscountPercent);
                quotation.items.add(item);
            }

            this.recalculateHeader(quotation);
            await tx.flush();
            return this.getById(quotation.id);
        });
    }

    async updateStatus(id: string, status: QuotationStatus) {
        const quotation = await this.getById(id);
        quotation.status = status;
        await this.em.flush();
        return quotation;
    }

    async approve(id: string, payload: { items?: Array<{ quotationItemId: string; approved?: boolean; approvedQuantity?: number }> }) {
        return this.em.transactional(async (tx) => {
            const quotation = await tx.getRepository(Quotation).findOneOrFail({ id, deletedAt: null as never }, { populate: ['items'] });

            if (payload.items?.length) {
                const map = new Map(payload.items.map((r) => [r.quotationItemId, r]));
                for (const item of quotation.items.getItems()) {
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
                    item.approved = true;
                    item.approvedQuantity = Number(item.quantity);
                }
            }

            quotation.status = this.quoteStatusFromItems(quotation);
            await tx.flush();
            return this.getById(id);
        });
    }

    async convertToSalesOrder(id: string, payload?: { quotationItemIds?: string[] }) {
        return this.em.transactional(async (tx) => {
            const quotation = await tx.getRepository(Quotation).findOneOrFail(
                { id, deletedAt: null as never },
                { populate: ['items', 'items.product', 'items.variant', 'customer'] }
            );

            const selectedIds = new Set(payload?.quotationItemIds || []);
            const selected = quotation.items.getItems().filter((item) => {
                const idSelected = selectedIds.size === 0 || selectedIds.has(item.id);
                const pendingQty = Number(item.approvedQuantity || 0) - Number(item.convertedQuantity || 0);
                return idSelected && item.approved && pendingQty > 0;
            });

            if (selected.length === 0) {
                throw new AppError('No hay ítems aprobados pendientes por convertir', 400);
            }

            const customSelected = selected.filter((item) => !item.isCatalogItem || !item.product);
            if (customSelected.length > 0) {
                throw new AppError('Hay ítems libres sin producto de catálogo. Convierte solo ítems de catálogo.', 409);
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
            const order = await soService.createSalesOrder(salesOrderPayload);

            for (const item of selected) {
                const pendingQty = Number(item.approvedQuantity || 0) - Number(item.convertedQuantity || 0);
                item.convertedQuantity = Number(item.convertedQuantity || 0) + pendingQty;
            }

            const pendingAfter = quotation.items.getItems().some((item) => {
                const pendingQty = Number(item.approvedQuantity || 0) - Number(item.convertedQuantity || 0);
                return item.approved && pendingQty > 0;
            });

            quotation.convertedSalesOrder = order;
            quotation.status = pendingAfter ? QuotationStatus.APPROVED_PARTIAL : QuotationStatus.CONVERTED;

            if (order.status === SalesOrderStatus.PENDING) {
                order.notes = order.notes || quotation.notes;
            }

            await tx.flush();
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
