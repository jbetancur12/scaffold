import { Entity, Enum, OneToMany, Property, Unique, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { RecallCase as IRecallCase, RecallScopeType, RecallStatus } from '@scaffold/types';
import { RecallNotification } from './recall-notification.entity';

@Entity()
@Unique({ properties: ['code'] })
export class RecallCase extends BaseEntity implements Omit<IRecallCase, 'notifications'> {
    @Property()
    code!: string;

    @Property()
    title!: string;

    @Property({ type: 'text' })
    reason!: string;

    @Enum(() => RecallScopeType)
    scopeType!: RecallScopeType;

    @Property({ nullable: true })
    lotCode?: string;

    @Property({ nullable: true })
    serialCode?: string;

    @Property()
    affectedQuantity!: number;

    @Property({ default: 0 })
    retrievedQuantity: number = 0;

    @Property({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    coveragePercent: number = 0;

    @Enum(() => RecallStatus)
    status: RecallStatus = RecallStatus.ABIERTO;

    @Property({ default: false })
    isMock: boolean = false;

    @Property({ nullable: true })
    targetResponseMinutes?: number;

    @Property({ nullable: true })
    actualResponseMinutes?: number;

    @Property()
    startedAt: Date = new Date();

    @Property({ nullable: true })
    endedAt?: Date;

    @Property({ nullable: true, type: 'text' })
    closureEvidence?: string;

    @Property({ nullable: true })
    createdBy?: string;

    @OneToMany(() => RecallNotification, (notification) => notification.recallCase, { orphanRemoval: true })
    notifications = new Collection<RecallNotification>(this);
}
