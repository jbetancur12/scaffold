import { Entity, Enum, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { OosCase as IOosCase, OosCaseStatus, OosDisposition } from '@scaffold/types';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { CapaAction } from './capa-action.entity';
import { ProductionBatch } from './production-batch.entity';
import { ProductionBatchUnit } from './production-batch-unit.entity';
import { ProductionOrder } from './production-order.entity';

@Entity()
@Unique({ properties: ['code'] })
export class OosCase extends BaseEntity implements IOosCase {
    @Property()
    code!: string;

    @Property()
    testName!: string;

    @Property()
    resultValue!: string;

    @Property()
    specification!: string;

    @Enum(() => OosCaseStatus)
    status: OosCaseStatus = OosCaseStatus.ABIERTO;

    @Property({ nullable: true, type: 'text' })
    investigationSummary?: string;

    @Enum({ items: () => OosDisposition, nullable: true })
    disposition?: OosDisposition;

    @Property({ nullable: true, type: 'text' })
    decisionNotes?: string;

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

    @Property()
    blockedAt: Date = new Date();

    @Property({ nullable: true })
    releasedAt?: Date;

    @Property({ nullable: true })
    openedBy?: string;

    @Property({ nullable: true })
    closedBy?: string;
}
