import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/core';
import { NonConformity as INonConformity, NonConformityStatus, QualitySeverity } from '@scaffold/types';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { ProductionBatch } from './production-batch.entity';
import { ProductionBatchUnit } from './production-batch-unit.entity';
import { ProductionOrder } from './production-order.entity';

@Entity()
export class NonConformity extends BaseEntity implements INonConformity {
    @Property()
    title!: string;

    @Property({ type: 'text' })
    description!: string;

    @Enum(() => QualitySeverity)
    severity: QualitySeverity = QualitySeverity.MEDIA;

    @Enum(() => NonConformityStatus)
    status: NonConformityStatus = NonConformityStatus.ABIERTA;

    @Property()
    source: string = 'produccion';

    @ManyToOne(() => ProductionOrder, { nullable: true })
    productionOrder?: ProductionOrder;

    @Property({ persist: false })
    get productionOrderId() {
        return this.productionOrder?.id;
    }

    @ManyToOne(() => ProductionBatch, { nullable: true })
    productionBatch?: ProductionBatch;

    @Property({ persist: false })
    get productionBatchId() {
        return this.productionBatch?.id;
    }

    @ManyToOne(() => ProductionBatchUnit, { nullable: true })
    productionBatchUnit?: ProductionBatchUnit;

    @Property({ persist: false })
    get productionBatchUnitId() {
        return this.productionBatchUnit?.id;
    }

    @Property({ nullable: true, type: 'text' })
    rootCause?: string;

    @Property({ nullable: true, type: 'text' })
    correctiveAction?: string;

    @Property({ nullable: true })
    createdBy?: string;
}
