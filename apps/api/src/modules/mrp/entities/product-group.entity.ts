import { Cascade, Collection, Entity, ManyToOne, OneToMany, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { Product } from './product.entity';

@Entity()
export class ProductGroup extends BaseEntity {
    @Property()
    name!: string;

    @Property({ unique: true })
    slug!: string;

    @Property({ nullable: true, type: 'text' })
    description?: string;

    @ManyToOne(() => ProductGroup, { nullable: true })
    parent?: ProductGroup;

    @Property({ persist: false })
    get parentId() {
        return this.parent?.id;
    }

    @Property({ default: 0 })
    sortOrder: number = 0;

    @Property({ default: true })
    active: boolean = true;

    @OneToMany(() => ProductGroup, (group) => group.parent, { cascade: [Cascade.ALL] })
    children = new Collection<ProductGroup>(this);

    @OneToMany(() => Product, (product) => product.category)
    products = new Collection<Product>(this);
}
