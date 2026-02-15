import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/core';
import { CapaAction as ICapaAction, CapaStatus } from '@scaffold/types';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { NonConformity } from './non-conformity.entity';

@Entity()
export class CapaAction extends BaseEntity implements ICapaAction {
    @ManyToOne(() => NonConformity)
    nonConformity!: NonConformity;

    @Property({ persist: false })
    get nonConformityId() {
        return this.nonConformity.id;
    }

    @Property({ type: 'text' })
    actionPlan!: string;

    @Property({ nullable: true })
    owner?: string;

    @Property({ nullable: true })
    dueDate?: Date;

    @Property({ nullable: true, type: 'text' })
    verificationNotes?: string;

    @Enum(() => CapaStatus)
    status: CapaStatus = CapaStatus.ABIERTA;
}
