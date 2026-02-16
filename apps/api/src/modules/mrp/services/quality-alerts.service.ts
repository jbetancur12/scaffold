import { EntityManager, EntityRepository } from '@mikro-orm/core';
import {
    BatchReleaseStatus,
    CapaStatus,
    DocumentStatus,
    OperationalAlert,
    OperationalAlertRole,
    OperationalAlertSeverity,
    OperationalAlertType,
    RecallStatus,
    WeeklyComplianceReport,
    WeeklyComplianceReportFile,
    EquipmentStatus,
} from '@scaffold/types';
import { BatchRelease } from '../entities/batch-release.entity';
import { CapaAction } from '../entities/capa-action.entity';
import { ControlledDocument } from '../entities/controlled-document.entity';
import { QualityTrainingEvidence } from '../entities/quality-training-evidence.entity';
import { RecallCase } from '../entities/recall-case.entity';
import { Equipment } from '../entities/equipment.entity';
import { QualityAuditEvent } from '../entities/quality-audit-event.entity';

const DAY_MS = 24 * 60 * 60 * 1000;

const severityRank: Record<OperationalAlertSeverity, number> = {
    [OperationalAlertSeverity.CRITICA]: 0,
    [OperationalAlertSeverity.ALTA]: 1,
    [OperationalAlertSeverity.MEDIA]: 2,
};

const includesRole = (roles: OperationalAlertRole[], role?: OperationalAlertRole) => {
    if (!role) return true;
    return roles.includes(role);
};

export class QualityAlertsService {
    private readonly capaRepo: EntityRepository<CapaAction>;
    private readonly trainingRepo: EntityRepository<QualityTrainingEvidence>;
    private readonly documentRepo: EntityRepository<ControlledDocument>;
    private readonly batchReleaseRepo: EntityRepository<BatchRelease>;
    private readonly recallRepo: EntityRepository<RecallCase>;
    private readonly equipmentRepo: EntityRepository<Equipment>;
    private readonly auditRepo: EntityRepository<QualityAuditEvent>;

    constructor(em: EntityManager) {
        this.capaRepo = em.getRepository(CapaAction);
        this.trainingRepo = em.getRepository(QualityTrainingEvidence);
        this.documentRepo = em.getRepository(ControlledDocument);
        this.batchReleaseRepo = em.getRepository(BatchRelease);
        this.recallRepo = em.getRepository(RecallCase);
        this.equipmentRepo = em.getRepository(Equipment);
        this.auditRepo = em.getRepository(QualityAuditEvent);
    }

    async listOperationalAlerts(filters: { role?: OperationalAlertRole; daysAhead?: number }): Promise<OperationalAlert[]> {
        const daysAhead = filters.daysAhead ?? 30;
        const now = new Date();
        const threshold = new Date(now.getTime() + (daysAhead * DAY_MS));

        const [capas, trainings, documents, batchReleases, recalls, equipmentRows] = await Promise.all([
            this.capaRepo.find({ status: { $ne: CapaStatus.CERRADA } }, { orderBy: { dueDate: 'ASC' } }),
            this.trainingRepo.find({}, { orderBy: { validUntil: 'ASC' } }),
            this.documentRepo.find({ status: DocumentStatus.APROBADO }, { orderBy: { expiresAt: 'ASC' } }),
            this.batchReleaseRepo.find({ status: BatchReleaseStatus.PENDIENTE_LIBERACION }, { populate: ['productionBatch'], orderBy: { createdAt: 'ASC' } }),
            this.recallRepo.find({ status: { $ne: RecallStatus.CERRADO } }, { orderBy: { startedAt: 'ASC' } }),
            this.equipmentRepo.find({ isCritical: true, status: EquipmentStatus.ACTIVO }, { orderBy: { code: 'ASC' } }),
        ]);

        const alerts: OperationalAlert[] = [];

        for (const capa of capas) {
            if (!capa.dueDate || capa.dueDate > now) continue;
            alerts.push({
                id: `capa_vencida:${capa.id}`,
                type: OperationalAlertType.CAPA_VENCIDA,
                severity: OperationalAlertSeverity.ALTA,
                title: `CAPA vencida ${capa.id.slice(0, 8)}...`,
                description: `La CAPA del responsable ${capa.owner || 'sin asignar'} está vencida desde ${new Date(capa.dueDate).toLocaleDateString()}.`,
                entityType: 'capa',
                entityId: capa.id,
                dueAt: capa.dueDate,
                createdAt: capa.createdAt,
                roleTargets: [OperationalAlertRole.QA, OperationalAlertRole.DIRECCION_TECNICA],
                routePath: '/quality/capa',
            });
        }

        for (const training of trainings) {
            if (!training.validUntil || training.validUntil > now) continue;
            alerts.push({
                id: `capacitacion_vencida:${training.id}`,
                type: OperationalAlertType.CAPACITACION_VENCIDA,
                severity: OperationalAlertSeverity.MEDIA,
                title: `Capacitación vencida ${training.personName}`,
                description: `La evidencia de ${training.role} venció el ${new Date(training.validUntil).toLocaleDateString()}.`,
                entityType: 'quality_training_evidence',
                entityId: training.id,
                dueAt: training.validUntil,
                createdAt: training.createdAt,
                roleTargets: [OperationalAlertRole.QA, OperationalAlertRole.PRODUCCION],
                routePath: '/quality/compliance',
            });
        }

        for (const doc of documents) {
            if (!doc.expiresAt) continue;
            if (doc.expiresAt > threshold) continue;
            const expired = doc.expiresAt < now;
            alerts.push({
                id: `documento_por_vencer:${doc.id}`,
                type: OperationalAlertType.DOCUMENTO_POR_VENCER,
                severity: expired ? OperationalAlertSeverity.CRITICA : OperationalAlertSeverity.ALTA,
                title: `Documento ${doc.code} ${expired ? 'vencido' : 'por vencer'}`,
                description: `${doc.title} (${doc.process}) ${expired ? 'venció' : 'vence'} el ${new Date(doc.expiresAt).toLocaleDateString()}.`,
                entityType: 'controlled_document',
                entityId: doc.id,
                entityCode: doc.code,
                dueAt: doc.expiresAt,
                createdAt: doc.createdAt,
                roleTargets: [OperationalAlertRole.QA, OperationalAlertRole.REGULATORIO],
                routePath: '/quality/docs',
            });
        }

        for (const release of batchReleases) {
            const ageDays = Math.floor((now.getTime() - new Date(release.createdAt).getTime()) / DAY_MS);
            alerts.push({
                id: `lote_pendiente_liberacion:${release.id}`,
                type: OperationalAlertType.LOTE_PENDIENTE_LIBERACION,
                severity: ageDays >= 2 ? OperationalAlertSeverity.ALTA : OperationalAlertSeverity.MEDIA,
                title: `Lote pendiente de liberación QA`,
                description: `Lote ${release.productionBatch?.code || release.productionBatchId} pendiente de liberación desde hace ${ageDays} día(s).`,
                entityType: 'batch_release',
                entityId: release.id,
                entityCode: release.productionBatch?.code,
                createdAt: release.createdAt,
                roleTargets: [OperationalAlertRole.QA, OperationalAlertRole.PRODUCCION],
                routePath: '/quality/batch-release',
            });
        }

        for (const recall of recalls) {
            alerts.push({
                id: `recall_abierto:${recall.id}`,
                type: OperationalAlertType.RECALL_ABIERTO,
                severity: OperationalAlertSeverity.CRITICA,
                title: `Recall abierto ${recall.code}`,
                description: `Recall ${recall.code} en estado ${recall.status}. Cobertura actual ${Number(recall.coveragePercent || 0).toFixed(2)}%.`,
                entityType: 'recall_case',
                entityId: recall.id,
                entityCode: recall.code,
                createdAt: recall.startedAt,
                roleTargets: [OperationalAlertRole.QA, OperationalAlertRole.REGULATORIO, OperationalAlertRole.DIRECCION_TECNICA],
                routePath: '/postmarket/recall',
            });
        }

        for (const row of equipmentRows) {
            const calibrationExpired = row.nextCalibrationDueAt && row.nextCalibrationDueAt < now;
            const maintenanceExpired = row.nextMaintenanceDueAt && row.nextMaintenanceDueAt < now;
            if (!calibrationExpired && !maintenanceExpired) continue;

            alerts.push({
                id: `equipo_critico_vencido:${row.id}`,
                type: OperationalAlertType.EQUIPO_CRITICO_VENCIDO,
                severity: OperationalAlertSeverity.CRITICA,
                title: `Equipo crítico vencido ${row.code}`,
                description: `El equipo ${row.code} presenta ${calibrationExpired ? 'calibración vencida' : 'mantenimiento vencido'}.`,
                entityType: 'equipment',
                entityId: row.id,
                entityCode: row.code,
                dueAt: row.nextCalibrationDueAt || row.nextMaintenanceDueAt || undefined,
                createdAt: row.updatedAt,
                roleTargets: [OperationalAlertRole.QA, OperationalAlertRole.PRODUCCION],
                routePath: '/quality/equipment',
            });
        }

        return alerts
            .filter((alert) => includesRole(alert.roleTargets, filters.role))
            .sort((a, b) => {
                if (severityRank[a.severity] !== severityRank[b.severity]) {
                    return severityRank[a.severity] - severityRank[b.severity];
                }
                const aTime = a.dueAt ? new Date(a.dueAt).getTime() : new Date(a.createdAt || 0).getTime();
                const bTime = b.dueAt ? new Date(b.dueAt).getTime() : new Date(b.createdAt || 0).getTime();
                return aTime - bTime;
            });
    }

    async exportWeeklyComplianceReport(filters: {
        role?: OperationalAlertRole;
        daysAhead?: number;
        format?: 'csv' | 'json';
    }): Promise<WeeklyComplianceReportFile> {
        const format = filters.format ?? 'json';
        const now = new Date();
        const periodEnd = now;
        const periodStart = new Date(now.getTime() - (7 * DAY_MS));

        const [alerts, auditEventsInPeriod] = await Promise.all([
            this.listOperationalAlerts({ role: filters.role, daysAhead: filters.daysAhead ?? 30 }),
            this.auditRepo.count({ createdAt: { $gte: periodStart, $lte: periodEnd } }),
        ]);

        const alertsByTypeMap = new Map<OperationalAlertType, number>();
        for (const alert of alerts) {
            alertsByTypeMap.set(alert.type, (alertsByTypeMap.get(alert.type) || 0) + 1);
        }

        const report: WeeklyComplianceReport = {
            generatedAt: now,
            periodStart,
            periodEnd,
            role: filters.role,
            totalAlerts: alerts.length,
            criticalAlerts: alerts.filter((alert) => alert.severity === OperationalAlertSeverity.CRITICA).length,
            highAlerts: alerts.filter((alert) => alert.severity === OperationalAlertSeverity.ALTA).length,
            mediumAlerts: alerts.filter((alert) => alert.severity === OperationalAlertSeverity.MEDIA).length,
            alertsByType: Array.from(alertsByTypeMap.entries()).map(([type, count]) => ({ type, count })),
            auditEventsInPeriod,
            alerts,
        };

        if (format === 'json') {
            return {
                generatedAt: now,
                periodStart,
                periodEnd,
                role: filters.role,
                format,
                fileName: `weekly_compliance_${now.toISOString()}.json`,
                content: JSON.stringify(report, null, 2),
            };
        }

        const summaryHeader = ['metric', 'value'].join(',');
        const summaryRows = [
            ['period_start', periodStart.toISOString()],
            ['period_end', periodEnd.toISOString()],
            ['role', filters.role || 'all'],
            ['total_alerts', String(report.totalAlerts)],
            ['critical_alerts', String(report.criticalAlerts)],
            ['high_alerts', String(report.highAlerts)],
            ['medium_alerts', String(report.mediumAlerts)],
            ['audit_events_in_period', String(report.auditEventsInPeriod)],
        ].map((row) => row.map((part) => `"${String(part).replace(/"/g, '""')}"`).join(','));

        const alertsHeader = ['id', 'type', 'severity', 'title', 'entityType', 'entityId', 'entityCode', 'dueAt', 'routePath'].join(',');
        const alertRows = alerts.map((alert) => [
            alert.id,
            alert.type,
            alert.severity,
            alert.title,
            alert.entityType,
            alert.entityId,
            alert.entityCode || '',
            alert.dueAt ? new Date(alert.dueAt).toISOString() : '',
            alert.routePath || '',
        ].map((part) => `"${String(part).replace(/"/g, '""')}"`).join(','));

        return {
            generatedAt: now,
            periodStart,
            periodEnd,
            role: filters.role,
            format,
            fileName: `weekly_compliance_${now.toISOString()}.csv`,
            content: [summaryHeader, ...summaryRows, '', alertsHeader, ...alertRows].join('\n'),
        };
    }
}
