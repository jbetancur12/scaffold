import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { PriceListSnapshot as IPriceListSnapshot } from '@scaffold/types';

@Entity()
export class PriceListSnapshot extends BaseEntity implements IPriceListSnapshot {
    @Property()
    month!: string; // YYYY-MM

    @Property({ type: 'integer' })
    version!: number;

    @Property({ type: 'json' })
    configSnapshot!: IPriceListSnapshot['configSnapshot'];

    @Property({ type: 'json' })
    items!: IPriceListSnapshot['items'];

    @Property({ nullable: true })
    source?: 'auto' | 'manual';
}
