import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entities/base.entity';
import {
    IncomingInspection as IIncomingInspection,
    IncomingInspectionResult,
    IncomingInspectionStatus,
} from '@scaffold/types';
import { PurchaseOrder } from './purchase-order.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';
import { RawMaterial } from './raw-material.entity';
import { Warehouse } from './warehouse.entity';

@Entity()
export class IncomingInspection extends BaseEntity implements IIncomingInspection {
    @ManyToOne(() => PurchaseOrder, { nullable: true })
    purchaseOrder?: PurchaseOrder;

    @Property({ persist: false })
    get purchaseOrderId() {
        return this.purchaseOrder?.id;
    }

    @ManyToOne(() => PurchaseOrderItem, { nullable: true })
    purchaseOrderItem?: PurchaseOrderItem;

    @Property({ persist: false })
    get purchaseOrderItemId() {
        return this.purchaseOrderItem?.id;
    }

    @ManyToOne(() => RawMaterial)
    rawMaterial!: RawMaterial;

    @Property({ persist: false })
    get rawMaterialId() {
        return this.rawMaterial.id;
    }

    @ManyToOne(() => Warehouse)
    warehouse!: Warehouse;

    @Property({ persist: false })
    get warehouseId() {
        return this.warehouse.id;
    }

    @Enum(() => IncomingInspectionStatus)
    status: IncomingInspectionStatus = IncomingInspectionStatus.PENDIENTE;

    @Enum(() => IncomingInspectionResult)
    inspectionResult?: IncomingInspectionResult;

    @Property({ nullable: true })
    supplierLotCode?: string;

    @Property({ nullable: true })
    certificateRef?: string;

    @Property({ nullable: true })
    certificateFileName?: string;

    @Property({ nullable: true })
    certificateFileMime?: string;

    @Property({ nullable: true })
    certificateFilePath?: string;

    @Property({ nullable: true })
    invoiceNumber?: string;

    @Property({ nullable: true })
    invoiceFileName?: string;

    @Property({ nullable: true })
    invoiceFileMime?: string;

    @Property({ nullable: true })
    invoiceFilePath?: string;

    @Property({ nullable: true })
    documentControlCode?: string;

    @Property({ nullable: true })
    documentControlTitle?: string;

    @Property({ nullable: true })
    documentControlVersion?: number;

    @Property({ nullable: true })
    documentControlDate?: Date;

    @Property({ nullable: true, type: 'text' })
    notes?: string;

    @Property({ type: 'decimal', precision: 10, scale: 4 })
    quantityReceived!: number;

    @Property({ type: 'decimal', precision: 10, scale: 4, default: 0 })
    quantityAccepted: number = 0;

    @Property({ type: 'decimal', precision: 10, scale: 4, default: 0 })
    quantityRejected: number = 0;

    @Property({ type: 'decimal', precision: 12, scale: 4, nullable: true })
    acceptedUnitCost?: number;

    @Property({ nullable: true })
    inspectedBy?: string;

    @Property({ nullable: true })
    inspectedAt?: Date;

    @Property({ nullable: true })
    releasedBy?: string;

    @Property({ nullable: true })
    releasedAt?: Date;
}
