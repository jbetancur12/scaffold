import { Entity, Property, OneToMany, Collection, Cascade } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { ProductVariant } from './product-variant.entity';

@Entity()
export class Product extends BaseEntity {
    @Property()
    name!: string;

    @Property({ nullable: true })
    description?: string;

    @Property({ unique: true })
    sku!: string;

    @Property({ nullable: true })
    categoryId?: string;

    @OneToMany(() => ProductVariant, variant => variant.product, { cascade: [Cascade.ALL], orphanRemoval: true })
    variants = new Collection<ProductVariant>(this);
}
