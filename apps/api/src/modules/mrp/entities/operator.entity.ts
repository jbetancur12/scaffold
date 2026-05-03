import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';

@Entity()
export class Operator extends BaseEntity {
    @Property()
    name!: string;

    @Property({ nullable: true, unique: true })
    code?: string;

    @Property({ default: true })
    active: boolean = true;
}
