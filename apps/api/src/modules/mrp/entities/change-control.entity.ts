import { Collection, Entity, Enum, ManyToOne, OneToMany, Property, Unique } from '@mikro-orm/core';
import { ChangeControl as IChangeControl, ChangeControlStatus, ChangeControlType, ChangeImpactLevel } from '@scaffold/types';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { ControlledDocument } from './controlled-document.entity';
import { ProductionBatch } from './production-batch.entity';
import { ProductionOrder } from './production-order.entity';
import { ChangeControlApproval } from './change-control-approval.entity';

@Entity()
@Unique({ properties: ['code'] })
export class ChangeControl extends BaseEntity implements IChangeControl {
    @Property()
    code!: string;

    @Property()
    title!: string;

    @Property({ type: 'text' })
    description!: string;

    @Enum(() => ChangeControlType)
    type!: ChangeControlType;

    @Enum(() => ChangeImpactLevel)
    impactLevel: ChangeImpactLevel = ChangeImpactLevel.MEDIO;

    @Enum(() => ChangeControlStatus)
    status: ChangeControlStatus = ChangeControlStatus.BORRADOR;

    @Property({ nullable: true, type: 'text' })
    evaluationSummary?: string;

    @Property({ nullable: true })
    requestedBy?: string;

    @Property({ nullable: true })
    effectiveDate?: Date;

    @ManyToOne(() => ControlledDocument, { nullable: true })
    linkedDocument?: ControlledDocument;

    @Property({ persist: false })
    get linkedDocumentId() {
        return this.linkedDocument?.id;
    }

    @ManyToOne(() => ProductionOrder, { nullable: true })
    affectedProductionOrder?: ProductionOrder;

    @Property({ persist: false })
    get affectedProductionOrderId() {
        return this.affectedProductionOrder?.id;
    }

    @ManyToOne(() => ProductionBatch, { nullable: true })
    affectedProductionBatch?: ProductionBatch;

    @Property({ persist: false })
    get affectedProductionBatchId() {
        return this.affectedProductionBatch?.id;
    }

    @Property({ nullable: true })
    beforeChangeBatchCode?: string;

    @Property({ nullable: true })
    afterChangeBatchCode?: string;

    @OneToMany(() => ChangeControlApproval, (approval) => approval.changeControl, { orphanRemoval: true })
    approvalRows = new Collection<ChangeControlApproval>(this);

    @Property({ persist: false })
    get approvals() {
        return this.approvalRows.getItems();
    }
}
