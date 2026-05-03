import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { Operator } from './operator.entity';
import { ProductVariant } from './product-variant.entity';
import { ProductionOrderItem } from './production-order-item.entity';

@Entity()
export class ProductionEntry extends BaseEntity {
    @Property({ type: 'date' })
    entryDate!: Date;

    @ManyToOne(() => Operator)
    operator!: Operator;

    @ManyToOne(() => ProductionOrderItem, { nullable: true })
    productionOrderItem?: ProductionOrderItem;

    @ManyToOne(() => ProductVariant)
    variant!: ProductVariant;

    @Property({ type: 'decimal', precision: 12, scale: 3 })
    quantity!: number;

    @Property({ nullable: true, type: 'text' })
    notes?: string;
}
