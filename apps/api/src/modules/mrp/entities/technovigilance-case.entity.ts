import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/core';
import {
    TechnovigilanceCase as ITechnovigilanceCase,
    TechnovigilanceCaseType,
    TechnovigilanceCausality,
    TechnovigilanceSeverity,
    TechnovigilanceStatus,
    TechnovigilanceReportChannel,
} from '@scaffold/types';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { ProductionBatch } from './production-batch.entity';
import { ProductionBatchUnit } from './production-batch-unit.entity';
import { ProductionOrder } from './production-order.entity';

@Entity()
export class TechnovigilanceCase extends BaseEntity implements ITechnovigilanceCase {
    @Property()
    title!: string;

    @Property({ type: 'text' })
    description!: string;

    @Enum(() => TechnovigilanceCaseType)
    type: TechnovigilanceCaseType = TechnovigilanceCaseType.QUEJA;

    @Enum(() => TechnovigilanceSeverity)
    severity: TechnovigilanceSeverity = TechnovigilanceSeverity.MODERADA;

    @Enum({ items: () => TechnovigilanceCausality, nullable: true })
    causality?: TechnovigilanceCausality;

    @Enum(() => TechnovigilanceStatus)
    status: TechnovigilanceStatus = TechnovigilanceStatus.ABIERTO;

    @Property({ default: false })
    reportedToInvima: boolean = false;

    @Property({ nullable: true })
    reportedAt?: Date;

    @Property({ nullable: true })
    invimaReportNumber?: string;

    @Enum({ items: () => TechnovigilanceReportChannel, nullable: true })
    invimaReportChannel?: TechnovigilanceReportChannel;

    @Property({ nullable: true, type: 'text' })
    invimaReportPayloadRef?: string;

    @Property({ nullable: true })
    invimaAckAt?: Date;

    @Property({ nullable: true })
    reportedBy?: string;

    @Property({ nullable: true, type: 'text' })
    investigationSummary?: string;

    @Property({ nullable: true, type: 'text' })
    resolution?: string;

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

    @Property({ nullable: true })
    lotCode?: string;

    @Property({ nullable: true })
    serialCode?: string;

    @Property({ nullable: true })
    createdBy?: string;
}
