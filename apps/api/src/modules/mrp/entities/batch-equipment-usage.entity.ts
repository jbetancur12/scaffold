import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { BatchEquipmentUsage as IBatchEquipmentUsage } from '@scaffold/types';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { ProductionBatch } from './production-batch.entity';
import { Equipment } from './equipment.entity';

@Entity()
export class BatchEquipmentUsage extends BaseEntity implements IBatchEquipmentUsage {
    @ManyToOne(() => ProductionBatch)
    productionBatch!: ProductionBatch;

    @Property({ persist: false })
    get productionBatchId() {
        return this.productionBatch.id;
    }

    @ManyToOne(() => Equipment)
    equipment!: Equipment;

    @Property({ persist: false })
    get equipmentId() {
        return this.equipment.id;
    }

    @Property()
    usedAt!: Date;

    @Property({ nullable: true })
    usedBy?: string;

    @Property({ nullable: true, type: 'text' })
    notes?: string;
}
