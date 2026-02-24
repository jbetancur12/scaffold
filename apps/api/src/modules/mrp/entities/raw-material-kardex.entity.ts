import { Entity, Index, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { RawMaterial } from './raw-material.entity';
import { Warehouse } from './warehouse.entity';
import { RawMaterialLot } from './raw-material-lot.entity';

@Index({ properties: ['rawMaterial', 'occurredAt'] })
@Entity()
export class RawMaterialKardex extends BaseEntity {
    @ManyToOne(() => RawMaterial)
    rawMaterial!: RawMaterial;

    @ManyToOne(() => Warehouse)
    warehouse!: Warehouse;

    @ManyToOne(() => RawMaterialLot, { nullable: true })
    lot?: RawMaterialLot;

    @Property({ length: 60 })
    movementType!: string;

    @Property({ type: 'decimal', precision: 12, scale: 4 })
    quantity!: number;

    @Property({ type: 'decimal', precision: 12, scale: 4 })
    balanceAfter!: number;

    @Property({ nullable: true, length: 80 })
    referenceType?: string;

    @Property({ nullable: true, length: 255 })
    referenceId?: string;

    @Property({ nullable: true, type: 'text' })
    notes?: string;

    @Property()
    occurredAt: Date = new Date();
}

