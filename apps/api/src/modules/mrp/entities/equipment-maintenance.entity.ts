import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/core';
import {
    EquipmentMaintenance as IEquipmentMaintenance,
    EquipmentMaintenanceType,
    EquipmentMaintenanceResult,
} from '@scaffold/types';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { Equipment } from './equipment.entity';

@Entity()
export class EquipmentMaintenance extends BaseEntity implements IEquipmentMaintenance {
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

    @Enum(() => EquipmentMaintenanceType)
    type: EquipmentMaintenanceType = EquipmentMaintenanceType.PREVENTIVO;

    @Enum(() => EquipmentMaintenanceResult)
    result: EquipmentMaintenanceResult = EquipmentMaintenanceResult.COMPLETADO;

    @Property({ nullable: true })
    evidenceRef?: string;

    @Property({ nullable: true })
    performedBy?: string;

    @Property({ nullable: true, type: 'text' })
    notes?: string;
}
