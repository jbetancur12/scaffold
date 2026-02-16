import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/core';
import { EquipmentCalibration as IEquipmentCalibration, EquipmentCalibrationResult } from '@scaffold/types';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { Equipment } from './equipment.entity';

@Entity()
export class EquipmentCalibration extends BaseEntity implements IEquipmentCalibration {
    @ManyToOne(() => Equipment)
    equipment!: Equipment;

    @Property({ persist: false })
    get equipmentId() {
        return this.equipment.id;
    }

    @Property()
    executedAt!: Date;

    @Property({ nullable: true })
    dueAt?: Date;

    @Enum(() => EquipmentCalibrationResult)
    result: EquipmentCalibrationResult = EquipmentCalibrationResult.APROBADA;

    @Property({ nullable: true })
    certificateRef?: string;

    @Property({ nullable: true })
    evidenceRef?: string;

    @Property({ nullable: true })
    performedBy?: string;

    @Property({ nullable: true, type: 'text' })
    notes?: string;
}
