import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { RecallNotification as IRecallNotification, RecallNotificationChannel, RecallNotificationStatus } from '@scaffold/types';
import { RecallCase } from './recall-case.entity';

@Entity()
export class RecallNotification extends BaseEntity implements IRecallNotification {
    @ManyToOne(() => RecallCase)
    recallCase!: RecallCase;

    @Property({ persist: false })
    get recallCaseId() {
        return this.recallCase?.id;
    }

    @Property()
    recipientName!: string;

    @Property()
    recipientContact!: string;

    @Enum(() => RecallNotificationChannel)
    channel!: RecallNotificationChannel;

    @Enum(() => RecallNotificationStatus)
    status: RecallNotificationStatus = RecallNotificationStatus.PENDIENTE;

    @Property({ nullable: true })
    sentAt?: Date;

    @Property({ nullable: true })
    acknowledgedAt?: Date;

    @Property({ nullable: true, type: 'text' })
    evidenceNotes?: string;

    @Property({ nullable: true })
    createdBy?: string;
}
