import { Entity, Property, ManyToOne, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { ProductVariant as IProductVariant } from '@scaffold/types';
import { Product } from './product.entity';
import { BOMItem } from './bom-item.entity';

@Entity()
export class ProductVariant extends BaseEntity implements IProductVariant {
    @ManyToOne(() => Product)
    product!: Product;

    @Property({ persist: false })
    get productId() {
        return this.product.id;
    }

    @Property()
    name!: string;

    @Property()
    sku!: string;

    @Property()
    price!: number;

    @Property()
    cost: number = 0; // Actual Cost (Avg)

    @Property()
    referenceCost: number = 0; // Standard Cost (Reference)

    @Property()
    laborCost: number = 0;

    @Property()
    indirectCost: number = 0;

    @Property()
    targetMargin: number = 0.4;

    @OneToMany(() => BOMItem, bomItem => bomItem.variant)
    bomItems = new Collection<BOMItem>(this);
}
