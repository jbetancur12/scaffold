import { Entity, Property, ManyToOne } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { SalesOrder } from './sales-order.entity';
import { Product } from './product.entity';
import { ProductVariant } from './product-variant.entity';

@Entity()
export class SalesOrderItem extends BaseEntity {
    @ManyToOne(() => SalesOrder)
    salesOrder!: SalesOrder;

    // Interface
    get salesOrderId(): string {
        return this.salesOrder.id;
    }

    @ManyToOne(() => Product)
    product!: Product;

    // Interface
    get productId(): string {
        return this.product.id;
    }

    @ManyToOne(() => ProductVariant, { nullable: true })
    variant?: ProductVariant;

    // Interface
    get variantId(): string | undefined {
        return this.variant?.id;
    }

    @Property({ type: 'integer' })
    quantity!: number;

    @Property({ type: 'decimal', precision: 12, scale: 2 })
    unitPrice!: number;

    @Property({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    taxRate: number = 0;

    @Property({ type: 'decimal', precision: 12, scale: 2 })
    taxAmount!: number;

    @Property({ type: 'decimal', precision: 12, scale: 2 })
    subtotal!: number;
}
