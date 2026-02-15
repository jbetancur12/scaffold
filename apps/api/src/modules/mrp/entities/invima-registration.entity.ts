import { Collection, Entity, Enum, OneToMany, Property, Unique } from '@mikro-orm/core';
import { InvimaRegistration as IInvimaRegistration, InvimaRegistrationStatus } from '@scaffold/types';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { Product } from './product.entity';

@Entity()
@Unique({ properties: ['code'] })
export class InvimaRegistration extends BaseEntity implements IInvimaRegistration {
    @Property()
    code!: string;

    @Property()
    holderName!: string;

    @Property({ nullable: true })
    manufacturerName?: string;

    @Property({ nullable: true })
    validFrom?: Date;

    @Property({ nullable: true })
    validUntil?: Date;

    @Enum(() => InvimaRegistrationStatus)
    status: InvimaRegistrationStatus = InvimaRegistrationStatus.ACTIVO;

    @Property({ nullable: true, type: 'text' })
    notes?: string;

    @OneToMany(() => Product, (product) => product.invimaRegistration)
    products = new Collection<Product>(this);
}
