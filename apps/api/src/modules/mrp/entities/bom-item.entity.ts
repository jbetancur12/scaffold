import { Entity, Property, ManyToOne } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { BOMItem as IBOMItem } from '@scaffold/types';
import { ProductVariant } from './product-variant.entity';
import { RawMaterial } from './raw-material.entity';

@Entity()
export class BOMItem extends BaseEntity implements IBOMItem {
    @ManyToOne(() => ProductVariant)
    variant!: ProductVariant;

    @Property({ persist: false })
    get variantId() {
        return this.variant.id;
    }

    @ManyToOne(() => RawMaterial)
    rawMaterial!: RawMaterial;

    @Property({ persist: false })
    get rawMaterialId() {
        return this.rawMaterial.id;
    }

    @Property()
    quantity!: number;
}
