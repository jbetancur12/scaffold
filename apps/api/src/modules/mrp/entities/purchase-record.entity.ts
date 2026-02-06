import { Entity, Property, ManyToOne } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { PurchaseRecord as IPurchaseRecord } from '@scaffold/types';
import { RawMaterial } from './raw-material.entity';
import { Supplier } from './supplier.entity';

@Entity()
export class PurchaseRecord extends BaseEntity implements IPurchaseRecord {
    @ManyToOne(() => RawMaterial)
    rawMaterial!: RawMaterial;

    @Property({ persist: false })
    get rawMaterialId() {
        return this.rawMaterial.id;
    }

    @ManyToOne(() => Supplier)
    supplier!: Supplier;

    @Property({ persist: false })
    get supplierId() {
        return this.supplier.id;
    }

    @Property()
    price!: number;

    @Property()
    date: Date = new Date();
}
