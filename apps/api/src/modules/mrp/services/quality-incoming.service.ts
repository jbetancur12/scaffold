import { EntityManager, EntityRepository, FilterQuery } from '@mikro-orm/core';
import {
    IncomingInspectionResult,
    IncomingInspectionStatus,
    WarehouseType,
} from '@scaffold/types';
import { AppError } from '../../../shared/utils/response';
import { IncomingInspection } from '../entities/incoming-inspection.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { Warehouse } from '../entities/warehouse.entity';
import { MrpService } from './mrp.service';

type QualityAuditLogger = (payload: {
    entityType: string;
    entityId: string;
    action: string;
    actor?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
}) => Promise<unknown>;

export class QualityIncomingService {
    private readonly em: EntityManager;
    private readonly incomingInspectionRepo: EntityRepository<IncomingInspection>;
    private readonly inventoryRepo: EntityRepository<InventoryItem>;
    private readonly warehouseRepo: EntityRepository<Warehouse>;
    private readonly logEvent: QualityAuditLogger;

    constructor(em: EntityManager, logEvent: QualityAuditLogger) {
        this.em = em;
        this.logEvent = logEvent;
        this.incomingInspectionRepo = em.getRepository(IncomingInspection);
        this.inventoryRepo = em.getRepository(InventoryItem);
        this.warehouseRepo = em.getRepository(Warehouse);
    }

    async listIncomingInspections(filters: {
        status?: IncomingInspectionStatus;
        rawMaterialId?: string;
        purchaseOrderId?: string;
    }) {
        const query: FilterQuery<IncomingInspection> = {};
        if (filters.status) query.status = filters.status;
        if (filters.rawMaterialId) query.rawMaterial = filters.rawMaterialId;
        if (filters.purchaseOrderId) query.purchaseOrder = filters.purchaseOrderId;
        return this.incomingInspectionRepo.find(query, {
            populate: ['rawMaterial', 'warehouse', 'purchaseOrder', 'purchaseOrder.supplier', 'purchaseOrderItem', 'purchaseOrderItem.rawMaterial'],
            orderBy: { createdAt: 'DESC' },
        });
    }

    async resolveIncomingInspection(id: string, payload: {
        inspectionResult: IncomingInspectionResult;
        supplierLotCode?: string;
        certificateRef?: string;
        notes?: string;
        quantityAccepted: number;
        quantityRejected: number;
        acceptedUnitCost?: number;
        actor?: string;
    }) {
        const row = await this.incomingInspectionRepo.findOneOrFail(
            { id },
            { populate: ['rawMaterial', 'warehouse'] }
        );
        if (row.status !== IncomingInspectionStatus.PENDIENTE) {
            throw new AppError('La inspeccion ya fue resuelta', 409);
        }

        const totalResolved = Number(payload.quantityAccepted) + Number(payload.quantityRejected);
        if (totalResolved !== Number(row.quantityReceived)) {
            throw new AppError('La suma aceptada/rechazada debe ser igual a la cantidad recibida', 400);
        }

        const quarantineInventory = await this.inventoryRepo.findOne({
            rawMaterial: row.rawMaterial.id,
            warehouse: row.warehouse.id,
        });
        if (!quarantineInventory || Number(quarantineInventory.quantity) < totalResolved) {
            throw new AppError('No hay stock suficiente en cuarentena para resolver la inspeccion', 400);
        }

        row.inspectionResult = payload.inspectionResult;
        row.supplierLotCode = payload.supplierLotCode;
        row.certificateRef = payload.certificateRef;
        row.notes = payload.notes;
        row.quantityAccepted = payload.quantityAccepted;
        row.quantityRejected = payload.quantityRejected;
        row.acceptedUnitCost = payload.acceptedUnitCost;
        row.inspectedBy = payload.actor;
        row.inspectedAt = new Date();
        row.releasedBy = payload.actor;
        row.releasedAt = new Date();
        row.status = payload.quantityAccepted > 0
            ? IncomingInspectionStatus.LIBERADO
            : IncomingInspectionStatus.RECHAZADO;

        quarantineInventory.quantity = Number(quarantineInventory.quantity) - totalResolved;

        if (payload.quantityAccepted > 0) {
            let releasedWarehouse = await this.warehouseRepo.findOne({ type: WarehouseType.RAW_MATERIALS });
            if (!releasedWarehouse) {
                releasedWarehouse = this.warehouseRepo.create({
                    name: 'Main Warehouse',
                    location: 'Default Location',
                    type: WarehouseType.RAW_MATERIALS,
                } as Warehouse);
                await this.em.persistAndFlush(releasedWarehouse);
            }

            let releasedInventory = await this.inventoryRepo.findOne({
                rawMaterial: row.rawMaterial.id,
                warehouse: releasedWarehouse.id,
            });
            if (!releasedInventory) {
                releasedInventory = this.inventoryRepo.create({
                    rawMaterial: row.rawMaterial,
                    warehouse: releasedWarehouse,
                    quantity: 0,
                } as InventoryItem);
            }

            const currentStock = Number(releasedInventory.quantity);
            const acceptedQty = Number(payload.quantityAccepted);
            releasedInventory.quantity = currentStock + acceptedQty;

            const purchasePrice = Number(payload.acceptedUnitCost ?? row.rawMaterial.lastPurchasePrice ?? row.rawMaterial.averageCost ?? 0);
            const currentAvg = Number(row.rawMaterial.averageCost || 0);
            if (currentStock + acceptedQty > 0 && purchasePrice > 0) {
                row.rawMaterial.averageCost = ((currentStock * currentAvg) + (acceptedQty * purchasePrice)) / (currentStock + acceptedQty);
                row.rawMaterial.lastPurchasePrice = purchasePrice;
                row.rawMaterial.lastPurchaseDate = new Date();
            }

            await this.em.persistAndFlush([releasedInventory, row.rawMaterial]);
            const mrpService = new MrpService(this.em);
            await mrpService.recalculateVariantsByMaterial(row.rawMaterial.id);
        }

        await this.em.persistAndFlush([row, quarantineInventory]);
        await this.logEvent({
            entityType: 'incoming_inspection',
            entityId: row.id,
            action: 'resolved',
            actor: payload.actor,
            metadata: {
                status: row.status,
                inspectionResult: row.inspectionResult,
                quantityAccepted: row.quantityAccepted,
                quantityRejected: row.quantityRejected,
                acceptedUnitCost: row.acceptedUnitCost,
                rawMaterialId: row.rawMaterial.id,
            },
        });
        return row;
    }
}
