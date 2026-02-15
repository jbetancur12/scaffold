import { Entity, Property } from '@mikro-orm/core';
import { AuditEvent as IAuditEvent } from '@scaffold/types';
import { BaseEntity } from '../../../shared/entities/base.entity';

@Entity()
export class QualityAuditEvent extends BaseEntity implements IAuditEvent {
    @Property()
    entityType!: string;

    @Property()
    entityId!: string;

    @Property()
    action!: string;

    @Property({ nullable: true })
    actor?: string;

    @Property({ nullable: true, type: 'text' })
    notes?: string;

    @Property({ nullable: true, type: 'json' })
    metadata?: Record<string, unknown>;
}
