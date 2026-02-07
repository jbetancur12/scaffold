import { Entity, Property, ManyToOne } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { InventoryItem as IInventoryItem } from '@scaffold/types';
import { Warehouse } from './warehouse.entity';
import { RawMaterial } from './raw-material.entity';
import { ProductVariant } from './product-variant.entity';

@Entity()
export class InventoryItem extends BaseEntity implements IInventoryItem {
    @ManyToOne(() => Warehouse)
    warehouse!: Warehouse;

    @Property({ persist: false })
    get warehouseId() {
        return this.warehouse.id;
    }

    @ManyToOne(() => RawMaterial, { nullable: true })
    rawMaterial?: RawMaterial;

    @Property({ persist: false })
    get rawMaterialId() {
        return this.rawMaterial?.id;
    }

    @ManyToOne(() => ProductVariant, { nullable: true })
    variant?: ProductVariant;

    @Property({ persist: false })
    get variantId() {
        return this.variant?.id;
    }

    @Property({ type: 'decimal', precision: 10, scale: 4 })
    quantity!: number;

    @Property({ onUpdate: () => new Date() })
    lastUpdated: Date = new Date();
}
