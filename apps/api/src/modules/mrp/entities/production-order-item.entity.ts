import { Entity, Property, ManyToOne } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { ProductionOrderItem as IProductionOrderItem } from '@scaffold/types';
import { ProductionOrder } from './production-order.entity';
import { ProductVariant } from './product-variant.entity';

@Entity()
export class ProductionOrderItem extends BaseEntity implements IProductionOrderItem {
    @ManyToOne(() => ProductionOrder)
    productionOrder!: ProductionOrder;

    @Property({ persist: false })
    get productionOrderId() {
        return this.productionOrder.id;
    }

    @ManyToOne(() => ProductVariant)
    variant!: ProductVariant;

    @Property({ persist: false })
    get variantId() {
        return this.variant.id;
    }

    @Property({ type: 'decimal', precision: 12, scale: 3, default: 0 })
    quantity!: number;

    @Property({ type: 'decimal', precision: 12, scale: 3, default: 0 })
    producedQuantity: number = 0;

    get remainingQuantity() {
        return Number(this.quantity) - Number(this.producedQuantity);
    }
}
