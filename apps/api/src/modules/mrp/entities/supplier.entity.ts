import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { Supplier as ISupplier } from '@scaffold/types';

@Entity()
export class Supplier extends BaseEntity implements ISupplier {
    @Property()
    name!: string;

    @Property({ nullable: true })
    contactName?: string;

    @Property({ nullable: true })
    email?: string;

    @Property({ nullable: true })
    phone?: string;

    @Property({ nullable: true })
    address?: string;

    @Property({ nullable: true })
    city?: string;

    @Property({ nullable: true })
    department?: string;

    @Property({ nullable: true, type: 'text' })
    bankDetails?: string;

    @Property({ nullable: true, type: 'text' })
    paymentConditions?: string;

    @Property({ nullable: true, type: 'text' })
    notes?: string;
}
