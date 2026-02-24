import { Entity, Enum, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import {
    RegulatoryCodingStandard,
    RegulatoryDeviceType,
    RegulatoryLabel as IRegulatoryLabel,
    RegulatoryLabelScopeType,
    RegulatoryLabelStatus,
} from '@scaffold/types';
import { ProductionBatch } from './production-batch.entity';
import { ProductionBatchUnit } from './production-batch-unit.entity';

@Entity()
@Unique({ properties: ['productionBatch', 'scopeType', 'productionBatchUnit'] })
export class RegulatoryLabel extends BaseEntity implements IRegulatoryLabel {
    @ManyToOne(() => ProductionBatch)
    productionBatch!: ProductionBatch;

    @Property({ persist: false })
    get productionBatchId() {
        return this.productionBatch?.id;
    }

    @ManyToOne(() => ProductionBatchUnit, { nullable: true })
    productionBatchUnit?: ProductionBatchUnit;

    @Property({ persist: false })
    get productionBatchUnitId() {
        return this.productionBatchUnit?.id;
    }

    @Enum(() => RegulatoryLabelScopeType)
    scopeType!: RegulatoryLabelScopeType;

    @Enum(() => RegulatoryLabelStatus)
    status: RegulatoryLabelStatus = RegulatoryLabelStatus.BORRADOR;

    @Enum(() => RegulatoryDeviceType)
    deviceType!: RegulatoryDeviceType;

    @Enum(() => RegulatoryCodingStandard)
    codingStandard!: RegulatoryCodingStandard;

    @Property()
    productName!: string;

    @Property()
    manufacturerName!: string;

    @Property()
    invimaRegistration!: string;

    @Property()
    lotCode!: string;

    @Property({ nullable: true })
    serialCode?: string;

    @Property()
    manufactureDate!: Date;

    @Property({ nullable: true })
    expirationDate?: Date;

    @Property({ nullable: true })
    gtin?: string;

    @Property({ nullable: true })
    udiDi?: string;

    @Property({ nullable: true })
    udiPi?: string;

    @Property({ nullable: true })
    internalCode?: string;

    @Property({ nullable: true })
    codingValue?: string;

    @Property({ nullable: true, type: 'json' })
    validationErrors?: string[];

    @Property({ nullable: true })
    createdBy?: string;

    @Property({ nullable: true })
    documentControlId?: string;

    @Property({ nullable: true })
    documentControlCode?: string;

    @Property({ nullable: true })
    documentControlTitle?: string;

    @Property({ nullable: true })
    documentControlVersion?: number;

    @Property({ nullable: true })
    documentControlDate?: Date;
}
