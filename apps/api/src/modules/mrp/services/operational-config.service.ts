import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { OperationalConfig } from '../entities/operational-config.entity';
import { OperationalConfigSchema } from '@scaffold/schemas';
import { z } from 'zod';

export class OperationalConfigService {
    private readonly em: EntityManager;
    private readonly configRepo: EntityRepository<OperationalConfig>;

    constructor(em: EntityManager) {
        this.em = em;
        this.configRepo = em.getRepository(OperationalConfig);
    }

    async getConfig(): Promise<OperationalConfig> {
        const configs = await this.configRepo.findAll({ limit: 1 });
        if (configs.length > 0) {
            return configs[0];
        }

        return this.createDefaultConfig();
    }

    async createDefaultConfig(): Promise<OperationalConfig> {
        const config = new OperationalConfig();
        // Default values for Colombia context
        config.operatorSalary = 1300000; // ~SMMLV
        config.operatorLoadFactor = 1.38; // ~38% prestacional
        config.operatorRealMonthlyMinutes = 11520; // 192 hours * 60

        config.rent = 0;
        config.utilities = 0;
        config.adminSalaries = 0;
        config.otherExpenses = 0;

        config.numberOfOperators = 1;

        config.modCostPerMinute = 0;
        config.cifCostPerMinute = 0;
        config.costPerMinute = 0;

        config.createdAt = new Date();
        config.updatedAt = new Date();

        this.em.persist(config);
        await this.em.flush();
        return config;
    }

    async updateConfig(data: Partial<OperationalConfig>): Promise<OperationalConfig> {
        let config = await this.getConfig();

        // Update fields if present in data, otherwise keep existing
        if (data.operatorSalary !== undefined) config.operatorSalary = data.operatorSalary;
        if (data.operatorLoadFactor !== undefined) config.operatorLoadFactor = data.operatorLoadFactor;
        if (data.operatorRealMonthlyMinutes !== undefined) config.operatorRealMonthlyMinutes = data.operatorRealMonthlyMinutes;

        if (data.rent !== undefined) config.rent = data.rent;
        if (data.utilities !== undefined) config.utilities = data.utilities;
        if (data.adminSalaries !== undefined) config.adminSalaries = data.adminSalaries;
        if (data.otherExpenses !== undefined) config.otherExpenses = data.otherExpenses;

        if (data.numberOfOperators !== undefined) config.numberOfOperators = data.numberOfOperators;

        // Calculations

        // MOD Cost Per Minute: (Salary * Load) / Real Monthly Minutes
        const monthlyModCost = config.operatorSalary * config.operatorLoadFactor;
        config.modCostPerMinute = config.operatorRealMonthlyMinutes > 0
            ? Math.round(monthlyModCost / config.operatorRealMonthlyMinutes)
            : 0;

        // CIF Cost Per Minute: Total Indirect Expenses / Total Factory Minutes
        const totalMonthlyCif = config.rent + config.utilities + config.adminSalaries + config.otherExpenses;
        const totalFactoryMinutes = config.operatorRealMonthlyMinutes * config.numberOfOperators;

        config.cifCostPerMinute = totalFactoryMinutes > 0
            ? Math.round(totalMonthlyCif / totalFactoryMinutes)
            : 0;

        // Total
        config.costPerMinute = config.modCostPerMinute + config.cifCostPerMinute;

        await this.em.flush();
        return config;
    }
}
