import { Entity, Enum, OneToMany, Property, Collection } from '@mikro-orm/core';
import { PurchaseRequisitionStatus } from '@scaffold/types';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { PurchaseRequisitionItem } from './purchase-requisition-item.entity';

@Entity()
export class PurchaseRequisition extends BaseEntity {
    @Property()
    requestedBy!: string;

    @Property({ nullable: true })
    productionOrderId?: string;

    @Property({ nullable: true })
    neededBy?: Date;

    @Property({ nullable: true, type: 'text' })
    notes?: string;

    @Enum(() => PurchaseRequisitionStatus)
    status: PurchaseRequisitionStatus = PurchaseRequisitionStatus.PENDIENTE;

    @Property({ nullable: true })
    convertedPurchaseOrderId?: string;

    @OneToMany(() => PurchaseRequisitionItem, (item) => item.requisition, { orphanRemoval: true })
    items = new Collection<PurchaseRequisitionItem>(this);
}
