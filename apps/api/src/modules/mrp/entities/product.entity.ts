import { Entity, Property, OneToMany, Collection, Cascade, ManyToOne } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { ProductVariant } from './product-variant.entity';
import { InvimaRegistration } from './invima-registration.entity';

@Entity()
export class Product extends BaseEntity {
    @Property()
    name!: string;

    @Property({ nullable: true })
    description?: string;

    @Property({ nullable: true })
    dimensions?: string;

    @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    lengthCm?: number;

    @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    widthCm?: number;

    @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    heightCm?: number;

    @Property({ type: 'decimal', precision: 10, scale: 3, nullable: true })
    weightKg?: number;

    @Property({ unique: true })
    sku!: string;

    @Property({ nullable: true })
    categoryId?: string;

    @Property({ default: false })
    requiresInvima: boolean = false;

    @Property({ nullable: true })
    productReference?: string;

    @ManyToOne(() => InvimaRegistration, { nullable: true })
    invimaRegistration?: InvimaRegistration;

    @Property({ persist: false })
    get invimaRegistrationId() {
        return this.invimaRegistration?.id;
    }

    @OneToMany(() => ProductVariant, variant => variant.product, { cascade: [Cascade.ALL], orphanRemoval: true })
    variants = new Collection<ProductVariant>(this);
}
