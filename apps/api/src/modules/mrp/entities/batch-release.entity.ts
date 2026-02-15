import { Entity, Enum, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { BatchRelease as IBatchRelease, BatchReleaseStatus, DocumentApprovalMethod } from '@scaffold/types';
import { ProductionBatch } from './production-batch.entity';

@Entity()
@Unique({ properties: ['productionBatch'] })
export class BatchRelease extends BaseEntity implements IBatchRelease {
    @ManyToOne(() => ProductionBatch)
    productionBatch!: ProductionBatch;

    @Property({ persist: false })
    get productionBatchId() {
        return this.productionBatch.id;
    }

    @Enum(() => BatchReleaseStatus)
    status: BatchReleaseStatus = BatchReleaseStatus.PENDIENTE_LIBERACION;

    @Property({ default: false })
    qcApproved: boolean = false;

    @Property({ default: false })
    labelingValidated: boolean = false;

    @Property({ default: false })
    documentsCurrent: boolean = false;

    @Property({ default: false })
    evidencesComplete: boolean = false;

    @Property({ nullable: true, type: 'text' })
    checklistNotes?: string;

    @Property({ nullable: true, type: 'text' })
    rejectedReason?: string;

    @Property({ nullable: true })
    signedBy?: string;

    @Enum({ items: () => DocumentApprovalMethod, nullable: true })
    approvalMethod?: DocumentApprovalMethod;

    @Property({ nullable: true })
    approvalSignature?: string;

    @Property({ nullable: true })
    signedAt?: Date;

    @Property({ nullable: true })
    reviewedBy?: string;
}
