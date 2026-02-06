import { Entity, Property, Enum, ManyToOne } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { RawMaterial as IRawMaterial, UnitType } from '@scaffold/types';
import { Supplier } from './supplier.entity';

@Entity()
export class RawMaterial extends BaseEntity implements IRawMaterial {
    @Property()
    name!: string;

    @Property({ unique: true })
    sku!: string;

    @Enum(() => UnitType)
    unit!: UnitType;

    @Property()
    cost!: number;

    @Property()
    minStockLevel?: number;

    @ManyToOne(() => Supplier, { nullable: true })
    supplier?: Supplier;

    @Property({ persist: false })
    get supplierId() {
        return this.supplier?.id;
    }
}
