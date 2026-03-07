import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { RawMaterialSpecification as IRawMaterialSpecification, UnitType } from '@scaffold/types';
import { RawMaterial } from './raw-material.entity';

@Entity()
export class RawMaterialSpecification extends BaseEntity implements IRawMaterialSpecification {
    @ManyToOne(() => RawMaterial)
    rawMaterial!: RawMaterial;

    @Property({ persist: false })
    get rawMaterialId() {
        return this.rawMaterial.id;
    }

    @Property()
    name!: string;

    @Property({ unique: true })
    sku!: string;

    @Property({ nullable: true, type: 'text' })
    description?: string;

    @Property({ nullable: true })
    color?: string;

    @Property({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
    widthCm?: number;

    @Property({ nullable: true, type: 'decimal', precision: 10, scale: 4 })
    lengthValue?: number;

    @Enum({ items: () => UnitType, nullable: true })
    lengthUnit?: UnitType;

    @Property({ nullable: true, type: 'decimal', precision: 10, scale: 4 })
    thicknessMm?: number;

    @Property({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
    grammageGsm?: number;

    @Property({ default: false })
    isDefault: boolean = false;

    @Property({ nullable: true, type: 'text' })
    notes?: string;
}
