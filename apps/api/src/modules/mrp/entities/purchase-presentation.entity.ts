import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { PurchasePresentation as IPurchasePresentation, UnitType } from '@scaffold/types';
import { RawMaterial } from './raw-material.entity';
import { Supplier } from './supplier.entity';
import { RawMaterialSpecification } from './raw-material-specification.entity';

@Entity()
export class PurchasePresentation extends BaseEntity implements IPurchasePresentation {
    @ManyToOne(() => RawMaterial)
    rawMaterial!: RawMaterial;

    @Property({ persist: false })
    get rawMaterialId() {
        return this.rawMaterial.id;
    }

    @ManyToOne(() => Supplier, { nullable: true })
    supplier?: Supplier;

    @Property({ persist: false })
    get supplierId() {
        return this.supplier?.id;
    }

    @ManyToOne(() => RawMaterialSpecification, { nullable: true })
    specification?: RawMaterialSpecification;

    @Property({ persist: false })
    get specificationId() {
        return this.specification?.id;
    }

    @Property()
    name!: string;

    @Property()
    purchaseUnitLabel!: string;

    @Property({ type: 'decimal', precision: 12, scale: 4 })
    quantityPerPurchaseUnit!: number;

    @Enum(() => UnitType)
    contentUnit!: UnitType;

    @Property({ default: false })
    allowsFractionalQuantity: boolean = false;

    @Property({ default: false })
    isDefault: boolean = false;

    @Property({ nullable: true, type: 'text' })
    notes?: string;
}
