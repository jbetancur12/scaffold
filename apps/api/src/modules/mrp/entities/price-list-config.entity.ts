import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { PriceListConfig as IPriceListConfig } from '@scaffold/types';

@Entity()
export class PriceListConfig extends BaseEntity implements IPriceListConfig {
    @Property({ default: true })
    showCover: boolean = true;

    @Property({ nullable: true })
    headerTitle?: string;

    @Property({ nullable: true })
    headerSubtitle?: string;

    @Property({ type: 'text', nullable: true })
    introText?: string;

    @Property({ type: 'json', nullable: true })
    sections: Array<{ title: string; body: string }> = [];
}
