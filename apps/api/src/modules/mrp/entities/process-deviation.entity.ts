import { Entity, Enum, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { ProcessDeviation as IProcessDeviation, ProcessDeviationStatus } from '@scaffold/types';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { CapaAction } from './capa-action.entity';
import { ProductionBatch } from './production-batch.entity';
import { ProductionBatchUnit } from './production-batch-unit.entity';
import { ProductionOrder } from './production-order.entity';

@Entity()
@Unique({ properties: ['code'] })
export class ProcessDeviation extends BaseEntity implements IProcessDeviation {
    @Property()
    code!: string;

    @Property()
    title!: string;

    @Property({ type: 'text' })
    description!: string;

    @Property({ default: 'general' })
    classification: string = 'general';

    @Enum(() => ProcessDeviationStatus)
    status: ProcessDeviationStatus = ProcessDeviationStatus.ABIERTA;

    @Property({ nullable: true, type: 'text' })
    containmentAction?: string;

    @Property({ nullable: true, type: 'text' })
    investigationSummary?: string;

    @Property({ nullable: true, type: 'text' })
    closureEvidence?: string;

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

    @ManyToOne(() => CapaAction, { nullable: true })
    capaAction?: CapaAction;

    @Property({ persist: false })
    get capaActionId() {
        return this.capaAction?.id;
    }

    @Property({ nullable: true })
    openedBy?: string;

    @Property({ nullable: true })
    closedBy?: string;

    @Property({ nullable: true })
    closedAt?: Date;
}
