import { EntityManager, EntityRepository, FilterQuery } from '@mikro-orm/core';
import {
    DocumentCategory,
    DocumentProcess,
    DocumentStatus,
    IncomingInspectionResult,
    IncomingInspectionStatus,
    WarehouseType,
} from '@scaffold/types';
import { AppError } from '../../../shared/utils/response';
import { IncomingInspection } from '../entities/incoming-inspection.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { Warehouse } from '../entities/warehouse.entity';
import { ControlledDocument } from '../entities/controlled-document.entity';
import { RawMaterialLot } from '../entities/raw-material-lot.entity';
import { RawMaterialKardex } from '../entities/raw-material-kardex.entity';
import { MrpService } from './mrp.service';
import { ObjectStorageService } from '../../../shared/services/object-storage.service';
import { extname } from 'node:path';
import { OperationalConfig } from '../entities/operational-config.entity';

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
    private readonly controlledDocumentRepo: EntityRepository<ControlledDocument>;
    private readonly inventoryRepo: EntityRepository<InventoryItem>;
    private readonly warehouseRepo: EntityRepository<Warehouse>;
    private readonly rawMaterialLotRepo: EntityRepository<RawMaterialLot>;
    private readonly rawMaterialKardexRepo: EntityRepository<RawMaterialKardex>;
    private readonly operationalConfigRepo: EntityRepository<OperationalConfig>;
    private readonly logEvent: QualityAuditLogger;
    private readonly storageService: ObjectStorageService;

    constructor(em: EntityManager, logEvent: QualityAuditLogger) {
        this.em = em;
        this.logEvent = logEvent;
        this.incomingInspectionRepo = em.getRepository(IncomingInspection);
        this.controlledDocumentRepo = em.getRepository(ControlledDocument);
        this.inventoryRepo = em.getRepository(InventoryItem);
        this.warehouseRepo = em.getRepository(Warehouse);
        this.rawMaterialLotRepo = em.getRepository(RawMaterialLot);
        this.rawMaterialKardexRepo = em.getRepository(RawMaterialKardex);
        this.operationalConfigRepo = em.getRepository(OperationalConfig);
        this.storageService = new ObjectStorageService();
    }

    private async resolveIncomingInspectionControlledDocument(controlledDocumentId?: string) {
        if (controlledDocumentId) {
            const selectedDocument = await this.controlledDocumentRepo.findOne({
                id: controlledDocumentId,
                process: DocumentProcess.CONTROL_CALIDAD,
                documentCategory: DocumentCategory.FOR,
                status: DocumentStatus.APROBADO,
            });
            if (!selectedDocument) {
                throw new AppError('El formato seleccionado no está aprobado o no corresponde a Control de Calidad/FOR', 400);
            }
            return selectedDocument;
        }

        const [config] = await this.operationalConfigRepo.findAll({ limit: 1, orderBy: { createdAt: 'DESC' } });
        const configuredCode = config?.defaultIncomingInspectionControlledDocumentCode?.trim();
        const now = new Date();
        if (configuredCode) {
            const configuredDocument = await this.controlledDocumentRepo.findOne({
                code: configuredCode,
                process: DocumentProcess.CONTROL_CALIDAD,
                documentCategory: DocumentCategory.FOR,
                status: DocumentStatus.APROBADO,
                $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
                $and: [{ $or: [{ effectiveDate: null }, { effectiveDate: { $lte: now } }] }],
            }, { orderBy: { version: 'DESC' } });
            if (configuredDocument) {
                return configuredDocument;
            }
            throw new AppError(`El formato global de recepción (${configuredCode}) no está aprobado/vigente`, 400);
        }

        // Fallback controlado para instancias antiguas sin configuración global
        const latestQualityFor = await this.controlledDocumentRepo.findOne({
            process: DocumentProcess.CONTROL_CALIDAD,
            documentCategory: DocumentCategory.FOR,
            status: DocumentStatus.APROBADO,
            $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
            $and: [{ $or: [{ effectiveDate: null }, { effectiveDate: { $lte: now } }] }],
        }, { orderBy: { version: 'DESC', updatedAt: 'DESC' } });

        if (!latestQualityFor) {
            throw new AppError('Debes configurar un formato global de recepción (Calidad/FOR) o seleccionar uno manualmente', 400);
        }
        return latestQualityFor;
    }

    private decodeBase64Data(base64Data: string): Buffer {
        const normalized = base64Data.includes(',') ? (base64Data.split(',').pop() ?? '') : base64Data;
        if (!normalized) {
            throw new AppError('Archivo base64 inválido', 400);
        }
        return Buffer.from(normalized, 'base64');
    }

    private buildEvidenceDownloadFileName(row: IncomingInspection, evidenceType: 'invoice' | 'certificate', originalFileName: string) {
        const extension = extname(originalFileName) || '';
        const typeLabel = evidenceType === 'invoice' ? 'Factura' : 'Certificado';
        const materialCode = row.rawMaterial?.sku || row.rawMaterial?.name || 'MateriaPrima';
        const base = `${typeLabel} ${materialCode} ${row.id.slice(0, 8).toUpperCase()}`
            .replace(/[^a-zA-Z0-9 _().-]/g, '_')
            .replace(/\s+/g, ' ')
            .trim();
        return `${base}${extension}`;
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
        controlledDocumentId?: string;
        supplierLotCode?: string;
        certificateRef?: string;
        invoiceNumber?: string;
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
            Number(payload.quantityAccepted) > 0 &&
            !payload.certificateRef?.trim() &&
            !row.certificateFilePath
        ) {
            throw new AppError('Para cantidad aceptada debes registrar certificado/COA (referencia o cargar archivo)', 400);
        }
        if (
            Number(payload.quantityAccepted) > 0 &&
            !payload.invoiceNumber?.trim() &&
            !row.invoiceFilePath
        ) {
            throw new AppError('Para cantidad aceptada debes registrar factura/remisión (número o cargar archivo)', 400);
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
        const selectedDocument = await this.resolveIncomingInspectionControlledDocument(payload.controlledDocumentId);
        row.documentControlId = selectedDocument.id;
        row.documentControlCode = selectedDocument.code;
        row.documentControlTitle = selectedDocument.title;
        row.documentControlVersion = selectedDocument.version;
        row.documentControlDate = selectedDocument.effectiveDate || selectedDocument.approvedAt || selectedDocument.updatedAt || new Date();
        row.supplierLotCode = payload.supplierLotCode?.trim() || undefined;
        row.certificateRef = payload.certificateRef?.trim() || undefined;
        row.invoiceNumber = payload.invoiceNumber?.trim() || undefined;
        row.notes = payload.notes?.trim() || undefined;
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

            const supplierLotCode = (payload.supplierLotCode || row.supplierLotCode || '').trim();
            let lot = await this.rawMaterialLotRepo.findOne({
                rawMaterial: row.rawMaterial.id,
                warehouse: releasedWarehouse.id,
                supplierLotCode,
            });
            if (!lot) {
                lot = this.rawMaterialLotRepo.create({
                    rawMaterial: row.rawMaterial,
                    warehouse: releasedWarehouse,
                    incomingInspection: row,
                    supplierLotCode,
                    quantityInitial: acceptedQty,
                    quantityAvailable: acceptedQty,
                    unitCost: payload.acceptedUnitCost,
                    receivedAt: new Date(),
                    notes: `Entrada por inspección ${row.id}`,
                } as unknown as RawMaterialLot);
            } else {
                lot.quantityInitial = Number(lot.quantityInitial) + acceptedQty;
                lot.quantityAvailable = Number(lot.quantityAvailable) + acceptedQty;
                lot.unitCost = payload.acceptedUnitCost ?? lot.unitCost;
                lot.incomingInspection = row;
            }

            const purchasePrice = Number(payload.acceptedUnitCost ?? row.rawMaterial.lastPurchasePrice ?? row.rawMaterial.averageCost ?? 0);
            const currentAvg = Number(row.rawMaterial.averageCost || 0);
            if (currentStock + acceptedQty > 0 && purchasePrice > 0) {
                row.rawMaterial.averageCost = ((currentStock * currentAvg) + (acceptedQty * purchasePrice)) / (currentStock + acceptedQty);
                row.rawMaterial.lastPurchasePrice = purchasePrice;
                row.rawMaterial.lastPurchaseDate = new Date();
            }

            const kardex = this.rawMaterialKardexRepo.create({
                rawMaterial: row.rawMaterial,
                warehouse: releasedWarehouse,
                lot,
                movementType: 'ENTRADA_RECEPCION_APROBADA',
                quantity: acceptedQty,
                balanceAfter: Number(lot.quantityAvailable),
                referenceType: 'incoming_inspection',
                referenceId: row.id,
                notes: `Ingreso MP por inspección aprobada (${supplierLotCode})`,
                occurredAt: new Date(),
            } as unknown as RawMaterialKardex);

            await this.em.persistAndFlush([releasedInventory, lot, kardex, row.rawMaterial]);
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
                documentControlCode: row.documentControlCode,
                documentControlVersion: row.documentControlVersion,
                invoiceNumber: row.invoiceNumber,
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

    async uploadIncomingInspectionEvidence(id: string, evidenceType: 'invoice' | 'certificate', payload: {
        fileName: string;
        mimeType: string;
        base64Data: string;
        actor?: string;
    }) {
        const row = await this.incomingInspectionRepo.findOneOrFail({ id }, { populate: ['rawMaterial'] });
        const buffer = this.decodeBase64Data(payload.base64Data);
        const maxBytes = 8 * 1024 * 1024; // 8 MB
        if (buffer.length === 0 || buffer.length > maxBytes) {
            throw new AppError('El archivo debe tener entre 1 byte y 8 MB', 400);
        }

        const existingPath = evidenceType === 'invoice' ? row.invoiceFilePath : row.certificateFilePath;
        await this.storageService.deleteObject(existingPath);

        const folderPrefix = `quality/incoming/${evidenceType}`;
        const persisted = await this.storageService.saveObject({
            fileName: payload.fileName,
            mimeType: payload.mimeType,
            buffer,
            folderPrefix,
        });
        const downloadName = this.buildEvidenceDownloadFileName(row, evidenceType, payload.fileName);

        if (evidenceType === 'invoice') {
            row.invoiceFileName = downloadName;
            row.invoiceFileMime = payload.mimeType;
            row.invoiceFilePath = persisted.storagePath;
        } else {
            row.certificateFileName = downloadName;
            row.certificateFileMime = payload.mimeType;
            row.certificateFilePath = persisted.storagePath;
        }

        await this.em.persistAndFlush(row);
        await this.logEvent({
            entityType: 'incoming_inspection',
            entityId: row.id,
            action: 'evidence_uploaded',
            actor: payload.actor,
            metadata: {
                evidenceType,
                fileName: downloadName,
                mimeType: payload.mimeType,
                size: buffer.length,
            },
        });
        return row;
    }

    async readIncomingInspectionEvidence(id: string, evidenceType: 'invoice' | 'certificate') {
        const row = await this.incomingInspectionRepo.findOneOrFail({ id }, { populate: ['rawMaterial'] });
        const filePath = evidenceType === 'invoice' ? row.invoiceFilePath : row.certificateFilePath;
        const fileName = evidenceType === 'invoice' ? row.invoiceFileName : row.certificateFileName;
        const mimeType = evidenceType === 'invoice' ? row.invoiceFileMime : row.certificateFileMime;

        if (!filePath || !fileName) {
            throw new AppError('No hay archivo adjunto para este tipo de evidencia', 404);
        }
        const buffer = await this.storageService.readObject(filePath);
        return {
            fileName,
            mimeType: mimeType || 'application/octet-stream',
            buffer,
        };
    }
}
