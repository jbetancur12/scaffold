import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { PurchaseRequisition } from './purchase-requisition.entity';
import { RawMaterial } from './raw-material.entity';
import { Supplier } from './supplier.entity';

@Entity()
export class PurchaseRequisitionItem extends BaseEntity {
    @Property({ type: 'json', nullable: true })
    sourceProductionOrders?: Array<{
        productionOrderId: string;
        productionOrderCode?: string;
        quantity: number;
    }>;

    @ManyToOne(() => PurchaseRequisition)
    requisition!: PurchaseRequisition;

    @ManyToOne(() => RawMaterial)
    rawMaterial!: RawMaterial;

    @Property({ type: 'decimal', precision: 10, scale: 4 })
    quantity!: number;

    @ManyToOne(() => Supplier, { nullable: true })
    suggestedSupplier?: Supplier;

    @Property({ nullable: true, type: 'text' })
    notes?: string;
}
