import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { ProductionBatch } from './production-batch.entity';
import { Warehouse } from './warehouse.entity';

@Unique({ properties: ['productionBatch', 'warehouse'] })
@Entity()
export class FinishedGoodsLotInventory extends BaseEntity {
    @ManyToOne(() => ProductionBatch)
    productionBatch!: ProductionBatch;

    @Property({ persist: false })
    get productionBatchId() {
        return this.productionBatch.id;
    }

    @ManyToOne(() => Warehouse)
    warehouse!: Warehouse;

    @Property({ persist: false })
    get warehouseId() {
        return this.warehouse.id;
    }

    @Property({ type: 'decimal', precision: 10, scale: 4 })
    quantity!: number;
}
