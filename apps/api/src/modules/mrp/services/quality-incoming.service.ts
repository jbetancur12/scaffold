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
        inspectedBy: string;
        approvedBy: string;
        managerApprovedBy?: string;
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
        const isConditional = payload.inspectionResult === IncomingInspectionResult.CONDICIONAL;
        if (!isConditional && totalResolved !== Number(row.quantityReceived)) {
            throw new AppError('La suma aceptada/rechazada debe ser igual a la cantidad recibida', 400);
        }
        if (payload.inspectionResult === IncomingInspectionResult.APROBADO && Number(payload.quantityRejected) > 0) {
            throw new AppError('Si el resultado es aprobado, la cantidad rechazada debe ser 0', 400);
        }
        if (payload.inspectionResult === IncomingInspectionResult.RECHAZADO && Number(payload.quantityAccepted) > 0) {
            throw new AppError('Si el resultado es rechazado, la cantidad aceptada debe ser 0', 400);
        }
        if (payload.inspectionResult === IncomingInspectionResult.CONDICIONAL && totalResolved !== 0) {
            throw new AppError('Resultado condicional no libera cantidades: registra 0 aceptado y 0 rechazado', 400);
        }
        if (Number(payload.quantityAccepted) > 0 && !payload.supplierLotCode?.trim()) {
            throw new AppError('Debes registrar el lote del proveedor cuando existe cantidad aceptada', 400);
        }
        if (
            (payload.inspectionResult === IncomingInspectionResult.CONDICIONAL ||
                payload.inspectionResult === IncomingInspectionResult.RECHAZADO) &&
            (!payload.notes || payload.notes.trim().length < 10)
        ) {
            throw new AppError('Para resultado condicional o rechazado debes registrar notas de al menos 10 caracteres', 400);
        }
        if (
            (payload.inspectionResult === IncomingInspectionResult.CONDICIONAL ||
                payload.inspectionResult === IncomingInspectionResult.RECHAZADO) &&
            !payload.managerApprovedBy?.trim()
        ) {
            throw new AppError('Para condicional o rechazado debes registrar aprobación del jefe de calidad', 400);
        }

        let quarantineInventory: InventoryItem | null = null;
        if (!isConditional) {
            quarantineInventory = await this.inventoryRepo.findOne({
                rawMaterial: row.rawMaterial.id,
                warehouse: row.warehouse.id,
            });
            if (!quarantineInventory || Number(quarantineInventory.quantity) < totalResolved) {
                throw new AppError('No hay stock suficiente en cuarentena para resolver la inspeccion', 400);
            }
        }

        row.inspectionResult = payload.inspectionResult;
        row.supplierLotCode = payload.supplierLotCode;
        row.certificateRef = payload.certificateRef;
        row.notes = payload.notes;
        row.quantityAccepted = payload.quantityAccepted;
        row.quantityRejected = payload.quantityRejected;
        row.acceptedUnitCost = payload.acceptedUnitCost;
        row.inspectedBy = payload.inspectedBy;
        row.inspectedAt = new Date();
        row.releasedBy = isConditional ? undefined : payload.approvedBy;
        row.releasedAt = isConditional ? undefined : new Date();
        row.status = isConditional
            ? IncomingInspectionStatus.PENDIENTE
            : payload.quantityAccepted > 0
                ? IncomingInspectionStatus.LIBERADO
                : IncomingInspectionStatus.RECHAZADO;

        if (!isConditional && quarantineInventory) {
            quarantineInventory.quantity = Number(quarantineInventory.quantity) - totalResolved;
        }

        if (!isConditional && payload.quantityAccepted > 0) {
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

        if (quarantineInventory) {
            await this.em.persistAndFlush([row, quarantineInventory]);
        } else {
            await this.em.persistAndFlush(row);
        }
        await this.logEvent({
            entityType: 'incoming_inspection',
            entityId: row.id,
            action: 'resolved',
            actor: payload.approvedBy,
            metadata: {
                status: row.status,
                inspectionResult: row.inspectionResult,
                quantityAccepted: row.quantityAccepted,
                quantityRejected: row.quantityRejected,
                acceptedUnitCost: row.acceptedUnitCost,
                rawMaterialId: row.rawMaterial.id,
                inspectedBy: payload.inspectedBy,
                approvedBy: payload.approvedBy,
                managerApprovedBy: payload.managerApprovedBy,
                conditionalHold: isConditional,
            },
        });
        return row;
    }

    async correctResolvedIncomingInspectionCost(id: string, payload: {
        acceptedUnitCost: number;
        reason: string;
        actor?: string;
    }) {
        const row = await this.incomingInspectionRepo.findOneOrFail(
            { id },
            { populate: ['rawMaterial'] }
        );

        if (row.status === IncomingInspectionStatus.PENDIENTE) {
            throw new AppError('Primero debes resolver la inspeccion antes de corregir costo', 409);
        }
        if (Number(row.quantityAccepted) <= 0) {
            throw new AppError('La inspeccion no tiene cantidad aceptada para corregir costo', 409);
        }

        const previousAcceptedUnitCost = Number(row.acceptedUnitCost ?? row.rawMaterial.lastPurchasePrice ?? row.rawMaterial.averageCost ?? 0);
        const nextAcceptedUnitCost = Number(payload.acceptedUnitCost);

        if (nextAcceptedUnitCost <= 0) {
            throw new AppError('El costo unitario corregido debe ser mayor a 0', 400);
        }
        if (previousAcceptedUnitCost > 0 && previousAcceptedUnitCost === nextAcceptedUnitCost) {
            throw new AppError('El costo corregido es igual al costo actual de la inspeccion', 409);
        }

        const rawMaterialInventories = await this.inventoryRepo.find(
            { rawMaterial: row.rawMaterial.id },
            { populate: ['warehouse'] }
        );
        const rawMaterialStock = rawMaterialInventories.reduce((acc, item) => {
            if (item.warehouse?.type !== WarehouseType.RAW_MATERIALS) return acc;
            return acc + Number(item.quantity);
        }, 0);

        const acceptedQty = Number(row.quantityAccepted);
        const costDeltaValue = acceptedQty * (nextAcceptedUnitCost - previousAcceptedUnitCost);

        if (rawMaterialStock > 0 && costDeltaValue !== 0) {
            const currentAvg = Number(row.rawMaterial.averageCost ?? 0);
            const nextAvg = currentAvg + (costDeltaValue / rawMaterialStock);
            row.rawMaterial.averageCost = Number(Math.max(0, nextAvg).toFixed(6));
        }

        row.acceptedUnitCost = nextAcceptedUnitCost;
        row.rawMaterial.lastPurchasePrice = nextAcceptedUnitCost;
        row.rawMaterial.lastPurchaseDate = new Date();

        await this.em.persistAndFlush([row, row.rawMaterial]);
        const mrpService = new MrpService(this.em);
        await mrpService.recalculateVariantsByMaterial(row.rawMaterial.id);

        await this.logEvent({
            entityType: 'incoming_inspection',
            entityId: row.id,
            action: 'cost_corrected',
            actor: payload.actor,
            notes: payload.reason,
            metadata: {
                acceptedQty,
                previousAcceptedUnitCost,
                correctedAcceptedUnitCost: nextAcceptedUnitCost,
                costDeltaValue,
                rawMaterialStock,
                rawMaterialId: row.rawMaterial.id,
            },
        });

        return row;
    }
}
