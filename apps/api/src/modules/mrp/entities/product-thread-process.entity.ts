import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { Product } from './product.entity';

@Entity()
export class ProductThreadProcess extends BaseEntity {
    @ManyToOne(() => Product)
    product!: Product;

    @Property({ nullable: true })
    processName?: string;

    @Property()
    machineKey!: string;

    @Property({ type: 'decimal', precision: 10, scale: 2 })
    sewnCentimeters!: number;

    @Property({ type: 'decimal', precision: 5, scale: 2, default: 8 })
    wastePercent: number = 8;

    @Property({ type: 'decimal', precision: 10, scale: 2, default: 5000 })
    coneLengthMeters: number = 5000;

    @Property({ type: 'integer' })
    needles!: number;

    @Property({ type: 'decimal', precision: 6, scale: 2 })
    stitchesPerCm!: number;

    @Property({ type: 'decimal', precision: 10, scale: 4 })
    ratio!: number;

    @Property({ type: 'integer', default: 0 })
    sortOrder: number = 0;
}
