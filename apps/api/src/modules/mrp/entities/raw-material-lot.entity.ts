import { Entity, Index, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { RawMaterial } from './raw-material.entity';
import { Warehouse } from './warehouse.entity';
import { IncomingInspection } from './incoming-inspection.entity';
import { RawMaterialSpecification } from './raw-material-specification.entity';

@Unique({ properties: ['rawMaterial', 'rawMaterialSpecification', 'warehouse', 'supplierLotCode'] })
@Index({ properties: ['rawMaterial', 'rawMaterialSpecification', 'warehouse', 'receivedAt'] })
@Entity()
export class RawMaterialLot extends BaseEntity {
    @ManyToOne(() => RawMaterial)
    rawMaterial!: RawMaterial;

    @ManyToOne(() => RawMaterialSpecification, { nullable: true })
    rawMaterialSpecification?: RawMaterialSpecification;

    @ManyToOne(() => Warehouse)
    warehouse!: Warehouse;

    @ManyToOne(() => IncomingInspection, { nullable: true })
    incomingInspection?: IncomingInspection;

    @Property({ length: 120 })
    supplierLotCode!: string;

    @Property({ type: 'decimal', precision: 12, scale: 4 })
    quantityInitial!: number;

    @Property({ type: 'decimal', precision: 12, scale: 4 })
    quantityAvailable!: number;

    @Property({ nullable: true, type: 'decimal', precision: 12, scale: 4 })
    unitCost?: number;

    @Property()
    receivedAt: Date = new Date();

    @Property({ nullable: true })
    expiresAt?: Date;

    @Property({ nullable: true, type: 'text' })
    notes?: string;
}
