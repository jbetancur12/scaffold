import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { OperationalConfig as IOperationalConfig } from '@scaffold/types';

@Entity()
export class OperationalConfig extends BaseEntity implements IOperationalConfig {
    @Property()
    operatorSalary!: number;

    @Property({ type: 'decimal', precision: 10, scale: 2 })
    operatorLoadFactor!: number;

    @Property()
    operatorRealMonthlyMinutes!: number;

    @Property()
    rent!: number;

    @Property()
    utilities!: number;

    @Property()
    adminSalaries!: number;

    @Property()
    otherExpenses!: number;

    @Property()
    numberOfOperators!: number;

    @Property()
    modCostPerMinute!: number;

    @Property()
    cifCostPerMinute!: number;

    @Property()
    costPerMinute!: number;
}
