import { EntityManager, EntityRepository, FilterQuery } from '@mikro-orm/core';
import {
    DocumentCategory,
    DocumentStatus,
    DispatchValidationResult,
    InvimaRegistrationStatus,
    RegulatoryCodingStandard,
    RegulatoryDeviceType,
    RegulatoryLabelScopeType,
    RegulatoryLabelStatus,
} from '@scaffold/types';
import { AppError } from '../../../shared/utils/response';
import { ProductionBatch } from '../entities/production-batch.entity';
import { ProductionBatchUnit } from '../entities/production-batch-unit.entity';
import { RegulatoryLabel } from '../entities/regulatory-label.entity';
import { ControlledDocument } from '../entities/controlled-document.entity';
import { OperationalConfig } from '../entities/operational-config.entity';

type QualityAuditLogger = (payload: {
    entityType: string;
    entityId: string;
    action: string;
    actor?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
}) => Promise<unknown>;

export class QualityLabelingService {
    private readonly em: EntityManager;
    private readonly regulatoryLabelRepo: EntityRepository<RegulatoryLabel>;
    private readonly operationalConfigRepo: EntityRepository<OperationalConfig>;
    private readonly controlledDocRepo: EntityRepository<ControlledDocument>;
    private readonly logEvent: QualityAuditLogger;

    constructor(em: EntityManager, logEvent: QualityAuditLogger) {
        this.em = em;
        this.logEvent = logEvent;
        this.regulatoryLabelRepo = em.getRepository(RegulatoryLabel);
        this.operationalConfigRepo = em.getRepository(OperationalConfig);
        this.controlledDocRepo = em.getRepository(ControlledDocument);
    }

    async upsertRegulatoryLabel(payload: {
        productionBatchId: string;
        productionBatchUnitId?: string;
        scopeType: RegulatoryLabelScopeType;
        deviceType: RegulatoryDeviceType;
        codingStandard: RegulatoryCodingStandard;
        productName?: string;
        manufacturerName?: string;
        invimaRegistration?: string;
        lotCode?: string;
        serialCode?: string;
        manufactureDate: Date;
        expirationDate?: Date;
        gtin?: string;
        udiDi?: string;
        udiPi?: string;
        internalCode?: string;
        actor?: string;
    }) {
        const controlledDoc = await this.resolveLabelingControlledDocument();
        const configs = await this.operationalConfigRepo.findAll({ limit: 1, orderBy: { createdAt: 'DESC' } });
        const mode = configs[0]?.operationMode === 'serial' ? 'serial' : 'lote';
        if (mode === 'lote' && payload.scopeType === RegulatoryLabelScopeType.SERIAL) {
            throw new AppError('El etiquetado serial está deshabilitado en modo lote', 400);
        }
        const batch = await this.em.findOneOrFail(
            ProductionBatch,
            { id: payload.productionBatchId },
            { populate: ['units', 'variant', 'variant.product', 'variant.product.invimaRegistration'] }
        );
        let unit: ProductionBatchUnit | undefined;

        if (payload.productionBatchUnitId) {
            unit = await this.em.findOneOrFail(ProductionBatchUnit, { id: payload.productionBatchUnitId }, { populate: ['batch'] });
            if (unit.batch.id !== batch.id) {
                throw new AppError('La unidad serial no pertenece al lote indicado', 400);
            }
        }

        if (payload.scopeType === RegulatoryLabelScopeType.SERIAL && !unit) {
            throw new AppError('Para etiqueta serial debes indicar productionBatchUnitId', 400);
        }
        if (payload.scopeType === RegulatoryLabelScopeType.LOTE && unit) {
            throw new AppError('Una etiqueta de lote no puede amarrarse a una unidad serial', 400);
        }

        const serialCode = payload.scopeType === RegulatoryLabelScopeType.SERIAL
            ? (unit?.serialCode ?? payload.serialCode)
            : undefined;
        const product = batch.variant.product;
        const linkedRegistration = product.invimaRegistration;
        const lotCode = payload.lotCode || batch.code;
        const productName = payload.productName || product.name;
        const manufacturerName = payload.manufacturerName || linkedRegistration?.manufacturerName || linkedRegistration?.holderName || 'Fabricante no definido';
        let invimaRegistration = payload.invimaRegistration;

        if (product.requiresInvima) {
            if (!invimaRegistration) {
                invimaRegistration = linkedRegistration?.code;
            }
            if (!invimaRegistration) {
                throw new AppError('El producto requiere INVIMA y no tiene registro activo asociado', 400);
            }
            if (linkedRegistration) {
                const now = new Date();
                if (linkedRegistration.status !== InvimaRegistrationStatus.ACTIVO) {
                    throw new AppError('El registro INVIMA asociado no está activo', 400);
                }
                if (linkedRegistration.validFrom && linkedRegistration.validFrom > now) {
                    throw new AppError('El registro INVIMA aún no está vigente', 400);
                }
                if (linkedRegistration.validUntil && linkedRegistration.validUntil < now) {
                    throw new AppError('El registro INVIMA está vencido', 400);
                }
            }
        } else {
            invimaRegistration = invimaRegistration || linkedRegistration?.code || 'NO_REQUIERE_INVIMA';
        }
        const effectiveInternalCode = payload.codingStandard === RegulatoryCodingStandard.INTERNO
            ? (payload.internalCode || (serialCode ? `${lotCode}-${serialCode}` : lotCode))
            : payload.internalCode;

        let row: RegulatoryLabel | null = null;
        if (payload.scopeType === RegulatoryLabelScopeType.SERIAL && unit) {
            row = await this.regulatoryLabelRepo.findOne({ productionBatchUnit: unit.id });
        } else if (payload.scopeType === RegulatoryLabelScopeType.LOTE) {
            row = await this.regulatoryLabelRepo.findOne({
                productionBatch: batch.id,
                scopeType: RegulatoryLabelScopeType.LOTE,
                productionBatchUnit: null,
            });
        }

        if (!row) {
            row = this.regulatoryLabelRepo.create({
                productionBatch: batch,
                productionBatchUnit: unit,
                scopeType: payload.scopeType,
                createdBy: payload.actor,
            } as unknown as RegulatoryLabel);
        }

        this.regulatoryLabelRepo.assign(row, {
            productionBatch: batch,
            productionBatchUnit: unit,
            scopeType: payload.scopeType,
            deviceType: payload.deviceType,
            codingStandard: payload.codingStandard,
            productName,
            manufacturerName,
            invimaRegistration,
            lotCode,
            serialCode,
            manufactureDate: payload.manufactureDate,
            expirationDate: payload.expirationDate,
            gtin: payload.gtin,
            udiDi: payload.udiDi,
            udiPi: payload.udiPi,
            internalCode: effectiveInternalCode,
            codingValue: this.buildCodingValue({
                codingStandard: payload.codingStandard,
                gtin: payload.gtin,
                lotCode,
                serialCode,
                expirationDate: payload.expirationDate,
                udiDi: payload.udiDi,
                udiPi: payload.udiPi,
                internalCode: effectiveInternalCode,
            }),
            documentControlId: controlledDoc.id,
            documentControlCode: controlledDoc.code,
            documentControlTitle: controlledDoc.title,
            documentControlVersion: controlledDoc.version,
            documentControlDate: controlledDoc.effectiveDate || controlledDoc.approvedAt || controlledDoc.updatedAt,
        });

        const errors = this.validateRegulatoryLabel({
            scopeType: payload.scopeType,
            deviceType: payload.deviceType,
            codingStandard: payload.codingStandard,
            lotCode,
            serialCode,
            manufactureDate: payload.manufactureDate,
            expirationDate: payload.expirationDate,
            gtin: payload.gtin,
            udiDi: payload.udiDi,
            internalCode: effectiveInternalCode,
        });

        row.validationErrors = errors;
        row.status = errors.length === 0 ? RegulatoryLabelStatus.VALIDADA : RegulatoryLabelStatus.BLOQUEADA;

        await this.em.persistAndFlush(row);
        await this.logEvent({
            entityType: 'regulatory_label',
            entityId: row.id,
            action: 'upserted',
            actor: payload.actor,
            metadata: {
                batchId: batch.id,
                batchUnitId: unit?.id,
                scopeType: row.scopeType,
                status: row.status,
                errors,
            },
        });
        return row;
    }

    private async resolveLabelingControlledDocument() {
        const configs = await this.operationalConfigRepo.findAll({ limit: 1, orderBy: { createdAt: 'DESC' } });
        const code = configs[0]?.defaultLabelingControlledDocumentCode?.trim();
        if (!code) {
            throw new AppError('Debes configurar el formato global de etiquetado', 400);
        }
        const now = new Date();
        const doc = await this.controlledDocRepo.findOne({
            code,
            documentCategory: DocumentCategory.FOR,
            status: DocumentStatus.APROBADO,
            $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
            $and: [{ $or: [{ effectiveDate: null }, { effectiveDate: { $lte: now } }] }],
        }, { orderBy: { version: 'DESC' } });
        if (!doc) {
            throw new AppError(`El formato global de etiquetado (${code}) no está aprobado/vigente`, 400);
        }
        return doc;
    }

    async listRegulatoryLabels(filters: {
        productionBatchId?: string;
        scopeType?: RegulatoryLabelScopeType;
        status?: RegulatoryLabelStatus;
    }) {
        const query: FilterQuery<RegulatoryLabel> = {};
        if (filters.productionBatchId) query.productionBatch = filters.productionBatchId;
        if (filters.scopeType) query.scopeType = filters.scopeType;
        if (filters.status) query.status = filters.status;
        return this.regulatoryLabelRepo.find(query, {
            populate: ['productionBatch', 'productionBatchUnit'],
            orderBy: { createdAt: 'DESC' },
        });
    }

    async validateDispatchReadiness(productionBatchId: string, actor?: string): Promise<DispatchValidationResult> {
        const batch = await this.em.findOneOrFail(ProductionBatch, { id: productionBatchId }, { populate: ['units'] });
        const labels = await this.regulatoryLabelRepo.find({ productionBatch: productionBatchId }, { populate: ['productionBatchUnit'] });
        const configs = await this.operationalConfigRepo.findAll({ limit: 1, orderBy: { createdAt: 'DESC' } });
        const mode = configs[0]?.operationMode === 'serial' ? 'serial' : 'lote';
        const errors: string[] = [];

        const lotLabel = labels.find((label) =>
            label.scopeType === RegulatoryLabelScopeType.LOTE &&
            !label.productionBatchUnit &&
            label.status === RegulatoryLabelStatus.VALIDADA
        );
        if (!lotLabel) {
            errors.push('Falta etiqueta regulatoria de lote en estado validada');
        }

        let unitsRequiringLabel = batch.units
            .getItems()
            .filter((unit) => !unit.rejected && unit.qcPassed && unit.packaged);
        let missingUnits: typeof unitsRequiringLabel = [];
        if (mode === 'serial') {
            const validSerialLabelUnitIds = new Set(
                labels
                    .filter((label) =>
                        label.scopeType === RegulatoryLabelScopeType.SERIAL &&
                        label.status === RegulatoryLabelStatus.VALIDADA &&
                        !!label.productionBatchUnit
                    )
                    .map((label) => label.productionBatchUnit!.id)
            );
            missingUnits = unitsRequiringLabel.filter((unit) => !validSerialLabelUnitIds.has(unit.id));
            if (missingUnits.length > 0) {
                errors.push(`Faltan etiquetas seriales validadas para ${missingUnits.length} unidad(es) empacada(s)`);
            }
        } else {
            unitsRequiringLabel = [];
            missingUnits = [];
        }

        const result: DispatchValidationResult = {
            batchId: productionBatchId,
            eligible: errors.length === 0,
            validatedAt: new Date(),
            errors,
            requiredSerialLabels: unitsRequiringLabel.length,
            validatedSerialLabels: unitsRequiringLabel.length - missingUnits.length,
        };

        await this.logEvent({
            entityType: 'production_batch',
            entityId: productionBatchId,
            action: 'dispatch_validated',
            actor,
            metadata: result as unknown as Record<string, unknown>,
        });

        return result;
    }

    private validateRegulatoryLabel(payload: {
        scopeType: RegulatoryLabelScopeType;
        deviceType: RegulatoryDeviceType;
        codingStandard: RegulatoryCodingStandard;
        lotCode: string;
        serialCode?: string;
        manufactureDate: Date;
        expirationDate?: Date;
        gtin?: string;
        udiDi?: string;
        internalCode?: string;
    }) {
        const errors: string[] = [];

        if (!payload.lotCode) errors.push('lotCode es obligatorio');
        if (!payload.manufactureDate) errors.push('manufactureDate es obligatorio');
        if (payload.scopeType === RegulatoryLabelScopeType.SERIAL && !payload.serialCode) {
            errors.push('serialCode es obligatorio para alcance serial');
        }
        if (payload.deviceType !== RegulatoryDeviceType.CLASE_I && !payload.expirationDate) {
            errors.push('expirationDate es obligatorio para dispositivos clase II y III');
        }

        if (payload.codingStandard === RegulatoryCodingStandard.GS1 && !payload.gtin) {
            errors.push('gtin es obligatorio para estandar GS1');
        }
        if (payload.codingStandard === RegulatoryCodingStandard.HIBCC && !payload.udiDi) {
            errors.push('udiDi es obligatorio para estandar HIBCC');
        }
        if (payload.codingStandard === RegulatoryCodingStandard.INTERNO && !payload.internalCode) {
            errors.push('internalCode es obligatorio para estandar interno');
        }

        return errors;
    }

    private buildCodingValue(payload: {
        codingStandard: RegulatoryCodingStandard;
        gtin?: string;
        lotCode: string;
        serialCode?: string;
        expirationDate?: Date;
        udiDi?: string;
        udiPi?: string;
        internalCode?: string;
    }) {
        if (payload.codingStandard === RegulatoryCodingStandard.GS1) {
            const exp = payload.expirationDate ? payload.expirationDate.toISOString().slice(2, 10).replace(/-/g, '') : '';
            return `(01)${payload.gtin || ''}(10)${payload.lotCode}${exp ? `(17)${exp}` : ''}${payload.serialCode ? `(21)${payload.serialCode}` : ''}`;
        }
        if (payload.codingStandard === RegulatoryCodingStandard.HIBCC) {
            return `HIBCC-${payload.udiDi || ''}-${payload.lotCode}${payload.serialCode ? `-${payload.serialCode}` : ''}${payload.udiPi ? `-${payload.udiPi}` : ''}`;
        }
        return payload.internalCode || '';
    }
}
