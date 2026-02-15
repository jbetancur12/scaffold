import { Entity, Property, Enum, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { ProductionOrder as IProductionOrder, ProductionOrderStatus } from '@scaffold/types';
import { ProductionOrderItem } from './production-order-item.entity';

@Entity()
export class ProductionOrder extends BaseEntity implements IProductionOrder {
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
    // @ts-expect-error: Collection is compatible with array during serialization
    items = new Collection<ProductionOrderItem>(this);
}
