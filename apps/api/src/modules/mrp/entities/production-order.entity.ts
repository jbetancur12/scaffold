import { Entity, Property, Enum, OneToMany, Collection, ManyToOne } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { ProductionOrderStatus } from '@scaffold/types';
import { ProductionOrderItem } from './production-order-item.entity';
import { ProductionBatch } from './production-batch.entity';
import { SalesOrder } from './sales-order.entity';

@Entity()
export class ProductionOrder extends BaseEntity {
    @Property({ unique: true })
    code!: string;

    @Enum(() => ProductionOrderStatus)
    status: ProductionOrderStatus = ProductionOrderStatus.DRAFT;

    @Property({ nullable: true })
    startDate?: Date;

    @Property({ nullable: true })
    endDate?: Date;

    @Property({ nullable: true })
    notes?: string;

    @OneToMany(() => ProductionOrderItem, item => item.productionOrder)
    items = new Collection<ProductionOrderItem>(this);

    @OneToMany(() => ProductionBatch, batch => batch.productionOrder)
    batches = new Collection<ProductionBatch>(this);

    @ManyToOne(() => SalesOrder, { nullable: true })
    salesOrder?: SalesOrder;
}
