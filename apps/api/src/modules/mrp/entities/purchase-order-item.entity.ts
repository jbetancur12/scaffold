import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { v4 as uuid } from 'uuid';
import { PurchaseOrder } from './purchase-order.entity';
import { RawMaterial } from './raw-material.entity';

@Entity()
export class PurchaseOrderItem {
    @PrimaryKey()
    id: string = uuid();

    @ManyToOne(() => PurchaseOrder)
    purchaseOrder!: PurchaseOrder;

    @Property({ default: true })
    isCatalogItem: boolean = true;

    @ManyToOne(() => RawMaterial, { nullable: true })
    rawMaterial?: RawMaterial;

    @Property({ nullable: true })
    customDescription?: string;

    @Property({ nullable: true })
    customUnit?: string;

    @Property({ default: true })
    isInventoriable: boolean = true;

    @Property({ type: 'decimal', precision: 10, scale: 2 })
    quantity!: number;

    @Property({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    unitPrice!: number;

    @Property({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    taxAmount: number = 0;

    @Property({ type: 'decimal', precision: 10, scale: 2 })
    subtotal!: number;

    @Property()
    createdAt: Date = new Date();

    @Property({ onUpdate: () => new Date() })
    updatedAt: Date = new Date();
}
