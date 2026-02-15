import { Entity, Enum, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { DocumentProcess, QualityRiskControl as IQualityRiskControl, QualityRiskControlStatus } from '@scaffold/types';

@Entity()
export class QualityRiskControl extends BaseEntity implements IQualityRiskControl {
    @Enum(() => DocumentProcess)
    process!: DocumentProcess;

    @Property({ type: 'text' })
    risk!: string;

    @Property({ type: 'text' })
    control!: string;

    @Property()
    ownerRole!: string;

    @Enum(() => QualityRiskControlStatus)
    status: QualityRiskControlStatus = QualityRiskControlStatus.ACTIVO;

    @Property({ nullable: true })
    evidenceRef?: string;

    @Property({ nullable: true })
    createdBy?: string;
}
