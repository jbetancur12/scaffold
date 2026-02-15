import { Entity, Property, Unique } from '@mikro-orm/core';
import { Customer as ICustomer } from '@scaffold/types';
import { BaseEntity } from '../../../shared/entities/base.entity';

@Entity()
@Unique({ properties: ['name', 'documentNumber'] })
export class Customer extends BaseEntity implements ICustomer {
    @Property()
    name!: string;

    @Property({ nullable: true })
    documentType?: string;

    @Property({ nullable: true })
    documentNumber?: string;

    @Property({ nullable: true })
    contactName?: string;

    @Property({ nullable: true })
    email?: string;

    @Property({ nullable: true })
    phone?: string;

    @Property({ nullable: true })
    address?: string;

    @Property({ nullable: true, type: 'text' })
    notes?: string;
}
