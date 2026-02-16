import { EntityManager, EntityRepository, FilterQuery } from '@mikro-orm/core';
import {
    BatchEquipmentUsage,
    EquipmentAlert,
    EquipmentCalibrationResult,
    EquipmentHistory,
    EquipmentMaintenanceResult,
    EquipmentMaintenanceType,
    EquipmentStatus,
} from '@scaffold/types';
import { AppError } from '../../../shared/utils/response';
import { Equipment } from '../entities/equipment.entity';
import { EquipmentCalibration } from '../entities/equipment-calibration.entity';
import { EquipmentMaintenance } from '../entities/equipment-maintenance.entity';
import { BatchEquipmentUsage as BatchEquipmentUsageEntity } from '../entities/batch-equipment-usage.entity';
import { ProductionBatch } from '../entities/production-batch.entity';

const DAY_MS = 24 * 60 * 60 * 1000;

const addDays = (date: Date, days: number) => new Date(date.getTime() + (days * DAY_MS));

const toDayStart = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

type QualityAuditLogger = (payload: {
    entityType: string;
    entityId: string;
    action: string;
    actor?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
}) => Promise<unknown>;

export class QualityEquipmentService {
    private readonly em: EntityManager;
    private readonly equipmentRepo: EntityRepository<Equipment>;
    private readonly calibrationRepo: EntityRepository<EquipmentCalibration>;
    private readonly maintenanceRepo: EntityRepository<EquipmentMaintenance>;
    private readonly usageRepo: EntityRepository<BatchEquipmentUsageEntity>;
    private readonly logEvent: QualityAuditLogger;

    constructor(em: EntityManager, logEvent: QualityAuditLogger) {
        this.em = em;
        this.logEvent = logEvent;
        this.equipmentRepo = em.getRepository(Equipment);
        this.calibrationRepo = em.getRepository(EquipmentCalibration);
        this.maintenanceRepo = em.getRepository(EquipmentMaintenance);
        this.usageRepo = em.getRepository(BatchEquipmentUsageEntity);
    }

    async createEquipment(payload: {
        code: string;
        name: string;
        area?: string;
        isCritical?: boolean;
        status?: EquipmentStatus;
        calibrationFrequencyDays?: number;
        maintenanceFrequencyDays?: number;
        notes?: string;
        actor?: string;
    }) {
        const existing = await this.equipmentRepo.findOne({ code: payload.code.trim() });
        if (existing) {
            throw new AppError('Ya existe un equipo con ese código', 409);
        }

        const row = this.equipmentRepo.create({
            code: payload.code.trim(),
            name: payload.name.trim(),
            area: payload.area?.trim() || undefined,
            isCritical: payload.isCritical ?? false,
            status: payload.status ?? EquipmentStatus.ACTIVO,
            calibrationFrequencyDays: payload.calibrationFrequencyDays,
            maintenanceFrequencyDays: payload.maintenanceFrequencyDays,
            notes: payload.notes,
        } as Equipment);

        await this.em.persistAndFlush(row);
        await this.logEvent({
            entityType: 'equipment',
            entityId: row.id,
            action: 'created',
            actor: payload.actor,
            metadata: { code: row.code, status: row.status, isCritical: row.isCritical },
        });

        return row;
    }

    async updateEquipment(id: string, payload: Partial<{
        code: string;
        name: string;
        area: string;
        isCritical: boolean;
        status: EquipmentStatus;
        calibrationFrequencyDays: number;
        maintenanceFrequencyDays: number;
        notes: string;
    }>, actor?: string) {
        const row = await this.equipmentRepo.findOneOrFail({ id });

        if (payload.code && payload.code.trim() !== row.code) {
            const existing = await this.equipmentRepo.findOne({ code: payload.code.trim() });
            if (existing && existing.id !== row.id) {
                throw new AppError('Ya existe un equipo con ese código', 409);
            }
        }

        this.equipmentRepo.assign(row, {
            code: payload.code?.trim(),
            name: payload.name?.trim(),
            area: payload.area?.trim(),
            isCritical: payload.isCritical,
            status: payload.status,
            calibrationFrequencyDays: payload.calibrationFrequencyDays,
            maintenanceFrequencyDays: payload.maintenanceFrequencyDays,
            notes: payload.notes,
        });

        await this.syncEquipmentDueDates(row);
        await this.em.persistAndFlush(row);
        await this.logEvent({
            entityType: 'equipment',
            entityId: row.id,
            action: 'updated',
            actor,
            metadata: payload as Record<string, unknown>,
        });

        return row;
    }

    async listEquipment(filters: { status?: EquipmentStatus; isCritical?: boolean }) {
        const query: FilterQuery<Equipment> = {};
        if (filters.status) query.status = filters.status;
        if (filters.isCritical !== undefined) query.isCritical = filters.isCritical;

        return this.equipmentRepo.find(query, {
            orderBy: [{ isCritical: 'DESC' }, { code: 'ASC' }],
        });
    }

    async addCalibration(equipmentId: string, payload: {
        executedAt?: Date;
        dueAt?: Date;
        result?: EquipmentCalibrationResult;
        certificateRef?: string;
        evidenceRef?: string;
        performedBy?: string;
        notes?: string;
        actor?: string;
    }) {
        const equipment = await this.equipmentRepo.findOneOrFail({ id: equipmentId });
        const executedAt = payload.executedAt ?? new Date();

        let dueAt = payload.dueAt;
        if (!dueAt && equipment.calibrationFrequencyDays) {
            dueAt = addDays(executedAt, equipment.calibrationFrequencyDays);
        }
        if (!dueAt && payload.result === EquipmentCalibrationResult.RECHAZADA) {
            dueAt = executedAt;
        }

        const row = this.calibrationRepo.create({
            equipment,
            executedAt,
            dueAt,
            result: payload.result ?? EquipmentCalibrationResult.APROBADA,
            certificateRef: payload.certificateRef,
            evidenceRef: payload.evidenceRef,
            performedBy: payload.performedBy ?? payload.actor,
            notes: payload.notes,
        } as EquipmentCalibration);

        await this.em.persistAndFlush(row);
        await this.syncEquipmentDueDates(equipment);
        await this.em.persistAndFlush(equipment);

        await this.logEvent({
            entityType: 'equipment_calibration',
            entityId: row.id,
            action: 'created',
            actor: payload.actor,
            metadata: {
                equipmentId: equipment.id,
                result: row.result,
                executedAt: row.executedAt,
                dueAt: row.dueAt,
            },
        });

        return row;
    }

    async addMaintenance(equipmentId: string, payload: {
        executedAt?: Date;
        dueAt?: Date;
        type?: EquipmentMaintenanceType;
        result?: EquipmentMaintenanceResult;
        evidenceRef?: string;
        performedBy?: string;
        notes?: string;
        actor?: string;
    }) {
        const equipment = await this.equipmentRepo.findOneOrFail({ id: equipmentId });
        const executedAt = payload.executedAt ?? new Date();

        let dueAt = payload.dueAt;
        if (!dueAt && equipment.maintenanceFrequencyDays) {
            dueAt = addDays(executedAt, equipment.maintenanceFrequencyDays);
        }
        if (!dueAt && payload.result === EquipmentMaintenanceResult.FALLIDO) {
            dueAt = executedAt;
        }

        const row = this.maintenanceRepo.create({
            equipment,
            executedAt,
            dueAt,
            type: payload.type ?? EquipmentMaintenanceType.PREVENTIVO,
            result: payload.result ?? EquipmentMaintenanceResult.COMPLETADO,
            evidenceRef: payload.evidenceRef,
            performedBy: payload.performedBy ?? payload.actor,
            notes: payload.notes,
        } as EquipmentMaintenance);

        await this.em.persistAndFlush(row);
        await this.syncEquipmentDueDates(equipment);
        await this.em.persistAndFlush(equipment);

        await this.logEvent({
            entityType: 'equipment_maintenance',
            entityId: row.id,
            action: 'created',
            actor: payload.actor,
            metadata: {
                equipmentId: equipment.id,
                type: row.type,
                result: row.result,
                executedAt: row.executedAt,
                dueAt: row.dueAt,
            },
        });

        return row;
    }

    async registerBatchEquipmentUsage(payload: {
        productionBatchId: string;
        equipmentId: string;
        usedAt?: Date;
        usedBy?: string;
        notes?: string;
        actor?: string;
    }): Promise<BatchEquipmentUsage> {
        const [batch, equipment] = await Promise.all([
            this.em.findOneOrFail(ProductionBatch, { id: payload.productionBatchId }),
            this.equipmentRepo.findOneOrFail({ id: payload.equipmentId }),
        ]);

        const row = this.usageRepo.create({
            productionBatch: batch,
            equipment,
            usedAt: payload.usedAt ?? new Date(),
            usedBy: payload.usedBy ?? payload.actor,
            notes: payload.notes,
        } as BatchEquipmentUsageEntity);

        await this.em.persistAndFlush(row);
        await this.logEvent({
            entityType: 'equipment_usage',
            entityId: row.id,
            action: 'created',
            actor: payload.actor,
            metadata: {
                productionBatchId: batch.id,
                equipmentId: equipment.id,
                equipmentCode: equipment.code,
                usedAt: row.usedAt,
            },
        });

        return row;
    }

    async listBatchEquipmentUsage(filters: { productionBatchId?: string; equipmentId?: string }) {
        const query: FilterQuery<BatchEquipmentUsageEntity> = {};
        if (filters.productionBatchId) query.productionBatch = filters.productionBatchId;
        if (filters.equipmentId) query.equipment = filters.equipmentId;

        return this.usageRepo.find(query, {
            populate: ['equipment', 'productionBatch'],
            orderBy: { usedAt: 'DESC' },
        });
    }

    async getEquipmentHistory(equipmentId: string): Promise<EquipmentHistory> {
        const [equipment, calibrations, maintenances, usages] = await Promise.all([
            this.equipmentRepo.findOneOrFail({ id: equipmentId }),
            this.calibrationRepo.find({ equipment: equipmentId }, { orderBy: { executedAt: 'DESC' } }),
            this.maintenanceRepo.find({ equipment: equipmentId }, { orderBy: { executedAt: 'DESC' } }),
            this.usageRepo.find({ equipment: equipmentId }, { populate: ['productionBatch'], orderBy: { usedAt: 'DESC' } }),
        ]);

        return {
            equipment,
            calibrations,
            maintenances,
            usages,
        };
    }

    async listEquipmentAlerts(daysAhead = 30): Promise<EquipmentAlert[]> {
        const rows = await this.equipmentRepo.find({ status: EquipmentStatus.ACTIVO }, { orderBy: { code: 'ASC' } });
        const today = toDayStart(new Date());
        const alerts: EquipmentAlert[] = [];

        for (const row of rows) {
            const candidateDates = [
                { alertType: 'calibration' as const, dueAt: row.nextCalibrationDueAt },
                { alertType: 'maintenance' as const, dueAt: row.nextMaintenanceDueAt },
            ];

            for (const candidate of candidateDates) {
                if (!candidate.dueAt) continue;
                const due = toDayStart(candidate.dueAt);
                const daysRemaining = Math.floor((due.getTime() - today.getTime()) / DAY_MS);
                if (daysRemaining > daysAhead) continue;

                alerts.push({
                    equipmentId: row.id,
                    equipmentCode: row.code,
                    equipmentName: row.name,
                    isCritical: row.isCritical,
                    alertType: candidate.alertType,
                    dueAt: candidate.dueAt,
                    daysRemaining,
                    severity: daysRemaining < 0 ? 'vencido' : 'proximo',
                });
            }
        }

        alerts.sort((a, b) => {
            if (a.severity !== b.severity) return a.severity === 'vencido' ? -1 : 1;
            if (a.daysRemaining !== b.daysRemaining) return a.daysRemaining - b.daysRemaining;
            return a.equipmentCode.localeCompare(b.equipmentCode);
        });

        return alerts;
    }

    async getBatchBlockingIssues(productionBatchId: string): Promise<string[]> {
        const usages = await this.usageRepo.find(
            { productionBatch: productionBatchId },
            { populate: ['equipment'] }
        );

        if (usages.length === 0) return [];

        const now = new Date();
        const issues = new Set<string>();

        for (const usage of usages) {
            const equipment = usage.equipment;
            if (!equipment.isCritical) continue;

            if (equipment.nextCalibrationDueAt && equipment.nextCalibrationDueAt < now) {
                issues.add(`equipo crítico ${equipment.code} con calibración vencida`);
            }
            if (equipment.nextMaintenanceDueAt && equipment.nextMaintenanceDueAt < now) {
                issues.add(`equipo crítico ${equipment.code} con mantenimiento vencido`);
            }
        }

        return Array.from(issues);
    }

    private async syncEquipmentDueDates(equipment: Equipment) {
        const [latestCalibration, latestMaintenance] = await Promise.all([
            this.calibrationRepo.findOne({ equipment: equipment.id }, { orderBy: [{ executedAt: 'DESC' }, { createdAt: 'DESC' }] }),
            this.maintenanceRepo.findOne({ equipment: equipment.id }, { orderBy: [{ executedAt: 'DESC' }, { createdAt: 'DESC' }] }),
        ]);

        equipment.lastCalibrationAt = latestCalibration?.executedAt;
        equipment.nextCalibrationDueAt = latestCalibration?.dueAt;
        equipment.lastMaintenanceAt = latestMaintenance?.executedAt;
        equipment.nextMaintenanceDueAt = latestMaintenance?.dueAt;
    }
}
