import { EntityManager } from '@mikro-orm/core';
import { PriceListConfig } from '../entities/price-list-config.entity';

export class PriceListConfigService {
    private readonly repo;

    constructor(private readonly em: EntityManager) {
        this.repo = this.em.getRepository(PriceListConfig);
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
        this.repo.assign(row, {
            showCover: data.showCover ?? row.showCover,
            orientation: data.orientation ?? row.orientation,
            headerTitle: data.headerTitle ?? row.headerTitle,
            headerSubtitle: data.headerSubtitle ?? row.headerSubtitle,
            introText: data.introText ?? row.introText,
            sections: data.sections ?? row.sections,
        });
        await this.em.persistAndFlush(row);
        return row;
    }
}
