import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { PriceListConfig } from '../entities/price-list-config.entity';
import { QualityAuditEvent } from '../entities/quality-audit-event.entity';

export class PriceListConfigService {
    private readonly repo: EntityRepository<PriceListConfig>;
    private readonly auditRepo: EntityRepository<QualityAuditEvent>;

    constructor(private readonly em: EntityManager) {
        this.repo = this.em.getRepository(PriceListConfig);
        this.auditRepo = this.em.getRepository(QualityAuditEvent);
    }

    private buildSnapshot(row: PriceListConfig) {
        return {
            showCover: row.showCover,
            orientation: row.orientation,
            headerTitle: row.headerTitle,
            headerSubtitle: row.headerSubtitle,
            introText: row.introText,
            sectionsCount: row.sections?.length ?? 0,
        };
    }

    private async logAudit(entityId: string, action: string, metadata?: Record<string, unknown>) {
        const event = this.auditRepo.create({
            entityType: 'price_list_config',
            entityId,
            action,
            metadata,
        } as unknown as QualityAuditEvent);
        await this.em.persistAndFlush(event);
    }

    async getConfig(): Promise<PriceListConfig> {
        const row = await this.repo.findOne({ id: { $ne: null } }, { orderBy: { createdAt: 'DESC' } });
        if (row) return row;
        const now = new Date();
        const created = this.repo.create({
            showCover: true,
            orientation: 'landscape',
            headerTitle: 'POLÍTICAS COMERCIALES',
            headerSubtitle: 'LISTA DE PRECIOS',
            introText: '',
            sections: [],
            createdAt: now,
            updatedAt: now,
        });
        await this.em.persistAndFlush(created);
        return created;
    }

    async updateConfig(data: Partial<PriceListConfig>): Promise<PriceListConfig> {
        const row = await this.getConfig();
        const before = this.buildSnapshot(row);
        this.repo.assign(row, {
            showCover: data.showCover ?? row.showCover,
            orientation: data.orientation ?? row.orientation,
            headerTitle: data.headerTitle ?? row.headerTitle,
            headerSubtitle: data.headerSubtitle ?? row.headerSubtitle,
            introText: data.introText ?? row.introText,
            sections: data.sections ?? row.sections,
        });
        await this.em.persistAndFlush(row);
        const after = this.buildSnapshot(row);
        await this.logAudit(row.id, 'updated', { before, after });
        return row;
    }
}
