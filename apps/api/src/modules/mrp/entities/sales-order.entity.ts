import { Entity, Property, ManyToOne, OneToMany, Collection, Cascade } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { SalesOrderStatus } from '@scaffold/types';
import { Customer } from './customer.entity';
import { SalesOrderItem } from './sales-order-item.entity';
import { ProductionOrder } from './production-order.entity';

@Entity()
export class SalesOrder extends BaseEntity {
    @Property({ unique: true })
    code!: string;

    @ManyToOne(() => Customer)
    customer!: Customer;

    // We expose a getter to satisfy the interface ISalesOrder
    get customerId(): string {
        return this.customer.id;
    }

    @Property()
    orderDate!: Date;

    @Property({ nullable: true })
    expectedDeliveryDate?: Date;

    @Property()
    status: SalesOrderStatus = SalesOrderStatus.PENDING;

    @Property({ type: 'text', nullable: true })
    notes?: string;

    @Property({ type: 'decimal', precision: 12, scale: 2 })
    totalAmount!: number;

    @Property({ type: 'decimal', precision: 12, scale: 2 })
    subtotalBase!: number;

    @Property({ type: 'decimal', precision: 12, scale: 2 })
    taxTotal!: number;

    @Property({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    discountAmount: number = 0;

    @Property({ type: 'decimal', precision: 12, scale: 2 })
    netTotalAmount!: number;

    @OneToMany(() => SalesOrderItem, item => item.salesOrder, { cascade: [Cascade.ALL] })
    items = new Collection<SalesOrderItem>(this);

    @OneToMany(() => ProductionOrder, po => po.salesOrder)
    productionOrders = new Collection<ProductionOrder>(this);
}
