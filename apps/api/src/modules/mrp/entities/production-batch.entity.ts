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

    @Property({ type: 'json', nullable: true })
    packagingFormData?: Record<string, unknown>;

    @Property({ default: false })
    packagingFormCompleted: boolean = false;

    @Property({ nullable: true })
    packagingFormFilledBy?: string;

    @Property({ nullable: true })
    packagingFormFilledAt?: Date;

    @Property({ nullable: true })
    packagingFormDocumentId?: string;

    @Property({ nullable: true })
    packagingFormDocumentCode?: string;

    @Property({ nullable: true })
    packagingFormDocumentTitle?: string;

    @Property({ nullable: true })
    packagingFormDocumentVersion?: number;

    @Property({ nullable: true })
    packagingFormDocumentDate?: Date;

    @OneToMany(() => ProductionBatchUnit, (unit) => unit.batch)
    units = new Collection<ProductionBatchUnit>(this);
}
