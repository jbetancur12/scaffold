import { Entity, Enum, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { DocumentProcess, DmrTemplate as IDmrTemplate } from '@scaffold/types';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { Product } from './product.entity';

@Entity()
@Unique({ properties: ['code', 'version'] })
@Unique({ properties: ['product', 'process', 'version'] })
export class DmrTemplate extends BaseEntity implements IDmrTemplate {
    @ManyToOne(() => Product, { nullable: true })
    product?: Product;

    @Property({ persist: false })
    get productId() {
        return this.product?.id;
    }

    @Enum(() => DocumentProcess)
    process!: DocumentProcess;

    @Property()
    code!: string;

    @Property()
    title!: string;

    @Property({ default: 1 })
    version: number = 1;

    @Property({ type: 'json' })
    sections: string[] = [];

    @Property({ type: 'json' })
    requiredEvidence: string[] = [];

    @Property({ default: true })
    isActive: boolean = true;

    @Property({ nullable: true })
    createdBy?: string;

    @Property({ nullable: true })
    approvedBy?: string;

    @Property({ nullable: true })
    approvedAt?: Date;
}
