import { Collection, Entity, Enum, ManyToOne, OneToMany, Property } from '@mikro-orm/core';
import {
    ProductionBatchPackagingStatus,
    ProductionBatchQcStatus,
    ProductionBatchStatus,
} from '@scaffold/types';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { ProductionOrder } from './production-order.entity';
import { ProductVariant } from './product-variant.entity';
import { ProductionBatchUnit } from './production-batch-unit.entity';

@Entity()
export class ProductionBatch extends BaseEntity {
    @ManyToOne(() => ProductionOrder)
    productionOrder!: ProductionOrder;

    @Property({ persist: false })
    get productionOrderId() {
        return this.productionOrder.id;
    }

    @ManyToOne(() => ProductVariant)
    variant!: ProductVariant;

    @Property({ persist: false })
    get variantId() {
        return this.variant.id;
    }

    @Property({ unique: true })
    code!: string;

    @Property()
    plannedQty!: number;

    @Property({ default: 0 })
    producedQty: number = 0;

    @Enum(() => ProductionBatchQcStatus)
    qcStatus: ProductionBatchQcStatus = ProductionBatchQcStatus.PENDING;

    @Enum(() => ProductionBatchPackagingStatus)
    packagingStatus: ProductionBatchPackagingStatus = ProductionBatchPackagingStatus.PENDING;

    @Enum(() => ProductionBatchStatus)
    status: ProductionBatchStatus = ProductionBatchStatus.IN_PROGRESS;

    @Property({ nullable: true })
    notes?: string;

    @OneToMany(() => ProductionBatchUnit, (unit) => unit.batch)
    units = new Collection<ProductionBatchUnit>(this);
}
