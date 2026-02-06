import { Entity, PrimaryKey, Property, ManyToOne, OneToMany, Collection, Enum } from '@mikro-orm/core';
import { v4 as uuid } from 'uuid';
import { Supplier } from './supplier.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';

export enum PurchaseOrderStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    RECEIVED = 'RECEIVED',
    CANCELLED = 'CANCELLED',
}

@Entity()
export class PurchaseOrder {
    @PrimaryKey()
    id: string = uuid();

    @ManyToOne(() => Supplier)
    supplier!: Supplier;

    @Property()
    orderDate: Date = new Date();

    @Property({ nullable: true })
    expectedDeliveryDate?: Date;

    @Property({ nullable: true })
    receivedDate?: Date;

    @Enum(() => PurchaseOrderStatus)
    status: PurchaseOrderStatus = PurchaseOrderStatus.PENDING;

    @Property({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    totalAmount: number = 0;

    @Property({ nullable: true })
    notes?: string;

    @OneToMany(() => PurchaseOrderItem, item => item.purchaseOrder, { orphanRemoval: true })
    items = new Collection<PurchaseOrderItem>(this);

    @Property()
    createdAt: Date = new Date();

    @Property({ onUpdate: () => new Date() })
    updatedAt: Date = new Date();
}
