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

    @Property({ type: 'json', nullable: true })
    purchasePaymentMethods: string[] = [];

    @Property({ nullable: true })
    defaultPurchaseOrderControlledDocumentId?: string | null;

    @Property({ nullable: true })
    defaultPurchaseOrderControlledDocumentCode?: string | null;

    @Property({ nullable: true })
    defaultIncomingInspectionControlledDocumentCode?: string | null;

    @Property({ nullable: true })
    defaultPackagingControlledDocumentCode?: string | null;

    @Property({ nullable: true })
    defaultLabelingControlledDocumentCode?: string | null;

    @Property({ nullable: true })
    defaultBatchReleaseControlledDocumentCode?: string | null;

    @Property({ nullable: true })
    operationMode?: 'lote' | 'serial' | null;

    @Property({ type: 'integer', nullable: true })
    uvtValue?: number | null;

    @Property({ type: 'json', nullable: true })
    purchaseWithholdingRules: Array<{ key: string; label: string; rate: number; active: boolean; baseUvtLimit?: number }> = [];
}
