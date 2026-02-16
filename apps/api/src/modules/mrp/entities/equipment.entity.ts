import { Collection, Entity, Enum, OneToMany, Property, Unique } from '@mikro-orm/core';
import { Equipment as IEquipment, EquipmentStatus } from '@scaffold/types';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { EquipmentCalibration } from './equipment-calibration.entity';
import { EquipmentMaintenance } from './equipment-maintenance.entity';
import { BatchEquipmentUsage } from './batch-equipment-usage.entity';

@Entity()
@Unique({ properties: ['code'] })
export class Equipment extends BaseEntity implements IEquipment {
    @Property()
    code!: string;

    @Property()
    name!: string;

    @Property({ nullable: true })
    area?: string;

    @Property({ default: false })
    isCritical: boolean = false;

    @Enum(() => EquipmentStatus)
    status: EquipmentStatus = EquipmentStatus.ACTIVO;

    @Property({ nullable: true })
    calibrationFrequencyDays?: number;

    @Property({ nullable: true })
    maintenanceFrequencyDays?: number;

    @Property({ nullable: true })
    lastCalibrationAt?: Date;

    @Property({ nullable: true })
    nextCalibrationDueAt?: Date;

    @Property({ nullable: true })
    lastMaintenanceAt?: Date;

    @Property({ nullable: true })
    nextMaintenanceDueAt?: Date;

    @Property({ nullable: true, type: 'text' })
    notes?: string;

    @OneToMany(() => EquipmentCalibration, (calibration) => calibration.equipment, { orphanRemoval: true })
    calibrationRows = new Collection<EquipmentCalibration>(this);

    @OneToMany(() => EquipmentMaintenance, (maintenance) => maintenance.equipment, { orphanRemoval: true })
    maintenanceRows = new Collection<EquipmentMaintenance>(this);

    @OneToMany(() => BatchEquipmentUsage, (usage) => usage.equipment, { orphanRemoval: true })
    usageRows = new Collection<BatchEquipmentUsage>(this);
}
