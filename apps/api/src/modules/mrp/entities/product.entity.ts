import { Entity, Property, OneToMany, Collection, Cascade } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { Product as IProduct } from '@scaffold/types';
import { ProductVariant } from './product-variant.entity';

@Entity()
export class Product extends BaseEntity implements IProduct {
    @Property()
    name!: string;

    @Property({ nullable: true })
    description?: string;

    @Property({ unique: true })
    sku!: string;

    @Property({ nullable: true })
    categoryId?: string;

    @OneToMany(() => ProductVariant, variant => variant.product, { cascade: [Cascade.ALL], orphanRemoval: true })
    // @ts-expect-error: Collection is compatible with array during serialization
    variants = new Collection<ProductVariant>(this);
}
