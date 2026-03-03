import { Collection, Entity, Enum, ManyToOne, OneToMany, Property, Cascade } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { Customer } from './customer.entity';
import { QuotationStatus } from '@scaffold/types';
import { QuotationItem } from './quotation-item.entity';
import { SalesOrder } from './sales-order.entity';

@Entity()
export class Quotation extends BaseEntity {
    @Property({ unique: true })
    code!: string;

    @ManyToOne(() => Customer)
    customer!: Customer;

    @Property()
    quotationDate: Date = new Date();

    @Property({ nullable: true })
    validUntil?: Date;

    @Enum(() => QuotationStatus)
    status: QuotationStatus = QuotationStatus.DRAFT;

    @Property({ nullable: true, type: 'text' })
    notes?: string;

    @Property({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    subtotalBase: number = 0;

    @Property({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    taxTotal: number = 0;

    @Property({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    discountAmount: number = 0;

    @Property({ type: 'decimal', precision: 6, scale: 2, default: 0 })
    globalDiscountPercent: number = 0;

    @Property({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    totalAmount: number = 0;

    @Property({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    netTotalAmount: number = 0;

    @ManyToOne(() => SalesOrder, { nullable: true })
    convertedSalesOrder?: SalesOrder;

    @OneToMany(() => QuotationItem, item => item.quotation, { cascade: [Cascade.ALL] })
    items = new Collection<QuotationItem>(this);
}
