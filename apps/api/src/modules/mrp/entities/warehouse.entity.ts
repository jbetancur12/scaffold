import { Entity, Property, Enum } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { Warehouse as IWarehouse, WarehouseType } from '@scaffold/types';

@Entity()
export class Warehouse extends BaseEntity implements IWarehouse {
    @Property()
    name!: string;

    @Property({ nullable: true })
    location?: string;

    @Enum(() => WarehouseType)
    type!: WarehouseType;
}
