import { Entity, Property, ManyToOne, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { SupplierMaterial as ISupplierMaterial } from '@scaffold/types';
import { Supplier } from './supplier.entity';
import { RawMaterial } from './raw-material.entity';

@Unique({ properties: ['supplier', 'rawMaterial'] })
@Entity()
export class SupplierMaterial extends BaseEntity implements ISupplierMaterial {
    @ManyToOne(() => Supplier)
    supplier!: Supplier;

    @ManyToOne(() => RawMaterial)
    rawMaterial!: RawMaterial;

    @Property({ type: 'decimal', precision: 10, scale: 2 })
    lastPurchasePrice: number = 0;

    @Property()
    lastPurchaseDate: Date = new Date();

    @Property({ persist: false })
    get supplierId() {
        return this.supplier.id;
    }

    @Property({ persist: false })
    get rawMaterialId() {
        return this.rawMaterial.id;
    }
}
