import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { Product } from './product.entity';

@Entity()
export class ProductImage extends BaseEntity {
    @ManyToOne(() => Product)
    product!: Product;

    @Property({ persist: false })
    get productId() {
        return this.product.id;
    }

    @Property()
    fileName!: string;

    @Property()
    fileMime!: string;

    @Property({ type: 'text' })
    filePath!: string;

    @Property({ default: 0 })
    sortOrder: number = 0;
}
