import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/core';
import { ChangeApprovalDecision, ChangeControlApproval as IChangeControlApproval } from '@scaffold/types';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { ChangeControl } from './change-control.entity';

@Entity()
export class ChangeControlApproval extends BaseEntity implements IChangeControlApproval {
    @ManyToOne(() => ChangeControl)
    changeControl!: ChangeControl;

    @Property({ persist: false })
    get changeControlId() {
        return this.changeControl.id;
    }

    @Property()
    role!: string;

    @Property({ nullable: true })
    approver?: string;

    @Enum(() => ChangeApprovalDecision)
    decision: ChangeApprovalDecision = ChangeApprovalDecision.PENDIENTE;

    @Property({ nullable: true, type: 'text' })
    decisionNotes?: string;

    @Property({ nullable: true })
    decidedAt?: Date;
}
