import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { QualityTrainingEvidence as IQualityTrainingEvidence } from '@scaffold/types';

@Entity()
export class QualityTrainingEvidence extends BaseEntity implements IQualityTrainingEvidence {
    @Property()
    role!: string;

    @Property()
    personName!: string;

    @Property()
    trainingTopic!: string;

    @Property()
    completedAt!: Date;

    @Property({ nullable: true })
    validUntil?: Date;

    @Property({ nullable: true })
    trainerName?: string;

    @Property({ nullable: true })
    evidenceRef?: string;

    @Property({ nullable: true })
    createdBy?: string;
}
