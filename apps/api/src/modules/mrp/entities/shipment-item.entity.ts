import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { ProductionBatch } from './production-batch.entity';
import { ProductionBatchUnit } from './production-batch-unit.entity';
import { Shipment } from './shipment.entity';

@Entity()
export class ShipmentItem extends BaseEntity {
    @ManyToOne(() => Shipment)
    shipment!: Shipment;

    @Property({ persist: false })
    get shipmentId() {
        return this.shipment.id;
    }

    @ManyToOne(() => ProductionBatch)
    productionBatch!: ProductionBatch;

    @Property({ persist: false })
    get productionBatchId() {
        return this.productionBatch.id;
    }

    @ManyToOne(() => ProductionBatchUnit, { nullable: true })
    productionBatchUnit?: ProductionBatchUnit;

    @Property({ persist: false })
    get productionBatchUnitId() {
        return this.productionBatchUnit?.id;
    }

    @Property()
    quantity!: number;
}
