import { Entity, PrimaryKey, Property, ManyToOne, Enum } from '@mikro-orm/core';
import { v4 as uuid } from 'uuid';
import { UnitType } from '@scaffold/types';
import { PurchaseOrder } from './purchase-order.entity';
import { RawMaterial } from './raw-material.entity';
import { RawMaterialSpecification } from './raw-material-specification.entity';
import { PurchasePresentation } from './purchase-presentation.entity';

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

    @ManyToOne(() => RawMaterialSpecification, { nullable: true })
    rawMaterialSpecification?: RawMaterialSpecification;

    @ManyToOne(() => PurchasePresentation, { nullable: true })
    purchasePresentation?: PurchasePresentation;

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

    @Property({ nullable: true })
    purchaseUnitLabel?: string;

    @Enum({ items: () => UnitType, nullable: true })
    inventoryUnit?: UnitType;

    @Property({ type: 'decimal', precision: 12, scale: 4, nullable: true })
    inventoryQuantity?: number;

    @Property({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    taxAmount: number = 0;

    @Property({ type: 'decimal', precision: 10, scale: 2 })
    subtotal!: number;

    @Property()
    createdAt: Date = new Date();

    @Property({ onUpdate: () => new Date() })
    updatedAt: Date = new Date();
}
