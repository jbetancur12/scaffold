import { Entity, Property, ManyToOne, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { Warehouse } from './warehouse.entity';
import { RawMaterial } from './raw-material.entity';
import { ProductVariant } from './product-variant.entity';
import { RawMaterialSpecification } from './raw-material-specification.entity';

@Unique({ properties: ['warehouse', 'rawMaterial', 'rawMaterialSpecification'] })
@Unique({ properties: ['warehouse', 'variant'] })
@Entity()
export class InventoryItem extends BaseEntity {
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

    @ManyToOne(() => RawMaterialSpecification, { nullable: true })
    rawMaterialSpecification?: RawMaterialSpecification;

    @Property({ persist: false })
    get rawMaterialSpecificationId() {
        return this.rawMaterialSpecification?.id;
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
