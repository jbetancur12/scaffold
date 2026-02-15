import { Cascade, Collection, Entity, ManyToOne, OneToMany, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { Customer } from './customer.entity';
import { ShipmentItem } from './shipment-item.entity';

@Entity()
export class Shipment extends BaseEntity {
    @ManyToOne(() => Customer)
    customer!: Customer;

    @Property({ persist: false })
    get customerId() {
        return this.customer.id;
    }

    @Property()
    commercialDocument!: string;

    @Property()
    shippedAt: Date = new Date();

    @Property({ nullable: true })
    dispatchedBy?: string;

    @Property({ nullable: true, type: 'text' })
    notes?: string;

    @OneToMany(() => ShipmentItem, (item) => item.shipment, { cascade: [Cascade.ALL], orphanRemoval: true })
    items = new Collection<ShipmentItem>(this);
}
