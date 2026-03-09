import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { Quotation } from './quotation.entity';
import { Product } from './product.entity';
import { ProductVariant } from './product-variant.entity';
import { QuotationItemLineType } from '@scaffold/types';

@Entity()
export class QuotationItem extends BaseEntity {
    @ManyToOne(() => Quotation)
    quotation!: Quotation;

    @Property({ default: QuotationItemLineType.ITEM })
    lineType: QuotationItemLineType = QuotationItemLineType.ITEM;

    @Property({ default: true })
    isCatalogItem: boolean = true;

    @ManyToOne(() => Product, { nullable: true })
    product?: Product;

    @ManyToOne(() => ProductVariant, { nullable: true })
    variant?: ProductVariant;

    @Property({ nullable: true })
    customDescription?: string;

    @Property({ nullable: true })
    customSku?: string;

    @Property({ nullable: true, type: 'text' })
    noteText?: string;

    @Property({ default: 0 })
    sortOrder: number = 0;

    @Property({ type: 'decimal', precision: 12, scale: 3 })
    quantity!: number;

    @Property({ type: 'decimal', precision: 12, scale: 3, default: 0 })
    approvedQuantity: number = 0;

    @Property({ type: 'decimal', precision: 12, scale: 3, default: 0 })
    convertedQuantity: number = 0;

    @Property({ type: 'decimal', precision: 12, scale: 2 })
    unitPrice!: number;

    @Property({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    baseUnitCost: number = 0;

    @Property({ type: 'decimal', precision: 6, scale: 4, default: 0 })
    targetMargin: number = 0;

    @Property({ type: 'decimal', precision: 6, scale: 4, default: 0 })
    minAllowedMargin: number = 0;

    @Property({ type: 'decimal', precision: 6, scale: 2, default: 0 })
    discountPercent: number = 0;

    @Property({ type: 'decimal', precision: 6, scale: 2, default: 0 })
    taxRate: number = 0;

    @Property({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    taxAmount: number = 0;

    @Property({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    subtotal: number = 0;

    @Property({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    netSubtotal: number = 0;

    @Property({ default: false })
    approved: boolean = false;
}
