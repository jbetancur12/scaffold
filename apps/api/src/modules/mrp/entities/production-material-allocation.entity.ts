import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { ProductionOrder } from './production-order.entity';
import { RawMaterial } from './raw-material.entity';
import { RawMaterialLot } from './raw-material-lot.entity';

@Unique({ properties: ['productionOrder', 'rawMaterial'] })
@Entity()
export class ProductionMaterialAllocation extends BaseEntity {
    @ManyToOne(() => ProductionOrder)
    productionOrder!: ProductionOrder;

    @ManyToOne(() => RawMaterial)
    rawMaterial!: RawMaterial;

    @ManyToOne(() => RawMaterialLot, { nullable: true })
    lot?: RawMaterialLot;

    @Property({ nullable: true, type: 'decimal', precision: 12, scale: 4 })
    quantityRequested?: number;

    @Property({ nullable: true, type: 'text' })
    notes?: string;
}

