import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { ProductionBatch } from './production-batch.entity';

@Entity()
@Unique({ properties: ['batch', 'serialCode'] })
export class ProductionBatchUnit extends BaseEntity {
    @ManyToOne(() => ProductionBatch)
    batch!: ProductionBatch;

    @Property({ persist: false })
    get productionBatchId() {
        return this.batch.id;
    }

    @Property()
    serialCode!: string;

    @Property({ default: false })
    qcPassed: boolean = false;

    @Property({ default: false })
    packaged: boolean = false;

    @Property({ default: false })
    rejected: boolean = false;
}
