import { Collection, Entity, Property, Enum, ManyToOne, OneToMany } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { UnitType } from '@scaffold/types';
import { Supplier } from './supplier.entity';
import { RawMaterialSpecification } from './raw-material-specification.entity';
import { PurchasePresentation } from './purchase-presentation.entity';

@Entity()
export class RawMaterial extends BaseEntity {
    @Property()
    name!: string;

    @Property({ unique: true })
    sku!: string;

    @Enum(() => UnitType)
    unit!: UnitType;

    @Property()
    cost!: number;

    @Property({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    averageCost: number = 0;

    @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    lastPurchasePrice?: number;

    @Property({ nullable: true })
    lastPurchaseDate?: Date;

    @Property({ default: 0 })
    minStockLevel: number = 0;

    @ManyToOne(() => Supplier, { nullable: true })
    supplier?: Supplier;

    @OneToMany(() => RawMaterialSpecification, specification => specification.rawMaterial, { orphanRemoval: true })
    specifications = new Collection<RawMaterialSpecification>(this);

    @OneToMany(() => PurchasePresentation, presentation => presentation.rawMaterial, { orphanRemoval: true })
    purchasePresentations = new Collection<PurchasePresentation>(this);

    @Property({ persist: false })
    get supplierId() {
        return this.supplier?.id;
    }

    @Property({ persist: false })
    get supplierName() {
        return this.supplier?.name;
    }
}
