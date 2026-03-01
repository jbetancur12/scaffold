import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { OperationalConfig } from '../entities/operational-config.entity';



export class OperationalConfigService {
    private readonly em: EntityManager;
    private readonly configRepo: EntityRepository<OperationalConfig>;

    constructor(em: EntityManager) {
        this.em = em;
        this.configRepo = em.getRepository(OperationalConfig);
    }

    private roundTo(value: number, decimals = 4): number {
        const factor = 10 ** decimals;
        return Math.round((value + Number.EPSILON) * factor) / factor;
    }

    private getDefaultMonthlyProductiveMinutes(): number {
        // 44 horas/semana promedio mensual: (44 * 52 / 12) * 60 = 11440
        return Math.round((44 * 52 * 60) / 12);
    }

    async getConfig(): Promise<OperationalConfig> {
        const configs = await this.configRepo.findAll({ limit: 1 });
        if (configs.length > 0) {
            const config = configs[0];
            if (!Array.isArray(config.purchasePaymentMethods) || config.purchasePaymentMethods.length === 0) {
                config.purchasePaymentMethods = ['Contado', 'Crédito 30 días', 'Transferencia'];
            }
            if (!Array.isArray(config.purchaseWithholdingRules) || config.purchaseWithholdingRules.length === 0) {
                config.purchaseWithholdingRules = [
                    { key: 'compra', label: 'Compra', rate: 2.5, active: true },
                    { key: 'servicio', label: 'Servicio', rate: 4, active: true },
                ];
            }
            return config;
        }

        return this.createDefaultConfig();
    }

    async createDefaultConfig(): Promise<OperationalConfig> {
        const config = new OperationalConfig();
        // Valores por defecto base
        config.operatorSalary = 2000000;
        config.operatorLoadFactor = 1.38; // ~38% prestacional
        config.operatorRealMonthlyMinutes = this.getDefaultMonthlyProductiveMinutes();

        config.rent = 0;
        config.utilities = 0;
        config.adminSalaries = 0;
        config.otherExpenses = 0;

        config.numberOfOperators = 1;

        config.modCostPerMinute = 0;
        config.cifCostPerMinute = 0;
        config.costPerMinute = 0;
        config.purchasePaymentMethods = ['Contado', 'Crédito 30 días', 'Transferencia'];
        config.defaultPurchaseOrderControlledDocumentId = undefined;
        config.defaultPurchaseOrderControlledDocumentCode = undefined;
        config.defaultIncomingInspectionControlledDocumentCode = undefined;
        config.defaultPackagingControlledDocumentCode = undefined;
        config.defaultLabelingControlledDocumentCode = undefined;
        config.defaultBatchReleaseControlledDocumentCode = undefined;
        config.operationMode = 'lote';
        config.purchaseWithholdingRules = [
            { key: 'compra', label: 'Compra', rate: 2.5, active: true },
            { key: 'servicio', label: 'Servicio', rate: 4, active: true },
        ];

        config.createdAt = new Date();
        config.updatedAt = new Date();

        this.em.persist(config);
        await this.em.flush();
        return config;
    }

    async updateConfig(data: Partial<OperationalConfig>): Promise<OperationalConfig> {
        const config = await this.getConfig();

        // Update fields if present in data, otherwise keep existing
        if (data.operatorSalary !== undefined) config.operatorSalary = data.operatorSalary;
        if (data.operatorLoadFactor !== undefined) config.operatorLoadFactor = data.operatorLoadFactor;
        if (data.operatorRealMonthlyMinutes !== undefined) config.operatorRealMonthlyMinutes = data.operatorRealMonthlyMinutes;

        if (data.rent !== undefined) config.rent = data.rent;
        if (data.utilities !== undefined) config.utilities = data.utilities;
        if (data.adminSalaries !== undefined) config.adminSalaries = data.adminSalaries;
        if (data.otherExpenses !== undefined) config.otherExpenses = data.otherExpenses;

        if (data.numberOfOperators !== undefined) config.numberOfOperators = data.numberOfOperators;
        if (data.purchasePaymentMethods !== undefined) {
            config.purchasePaymentMethods = data.purchasePaymentMethods;
        }
        if (data.defaultPurchaseOrderControlledDocumentId !== undefined) {
            config.defaultPurchaseOrderControlledDocumentId = data.defaultPurchaseOrderControlledDocumentId || undefined;
        }
        if (data.defaultPurchaseOrderControlledDocumentCode !== undefined) {
            config.defaultPurchaseOrderControlledDocumentCode = data.defaultPurchaseOrderControlledDocumentCode?.trim() || undefined;
        }
        if (data.defaultIncomingInspectionControlledDocumentCode !== undefined) {
            config.defaultIncomingInspectionControlledDocumentCode = data.defaultIncomingInspectionControlledDocumentCode?.trim() || undefined;
        }
        if (data.defaultPackagingControlledDocumentCode !== undefined) {
            config.defaultPackagingControlledDocumentCode = data.defaultPackagingControlledDocumentCode?.trim() || undefined;
        }
        if (data.defaultLabelingControlledDocumentCode !== undefined) {
            config.defaultLabelingControlledDocumentCode = data.defaultLabelingControlledDocumentCode?.trim() || undefined;
        }
        if (data.defaultBatchReleaseControlledDocumentCode !== undefined) {
            config.defaultBatchReleaseControlledDocumentCode = data.defaultBatchReleaseControlledDocumentCode?.trim() || undefined;
        }
        if (data.defaultSalesOrderProductionDocCode !== undefined) {
            config.defaultSalesOrderProductionDocCode = data.defaultSalesOrderProductionDocCode?.trim() || undefined;
        }
        if (data.defaultSalesOrderBillingDocCode !== undefined) {
            config.defaultSalesOrderBillingDocCode = data.defaultSalesOrderBillingDocCode?.trim() || undefined;
        }
        if (data.operationMode !== undefined) {
            config.operationMode = data.operationMode;
        }
        if (data.uvtValue !== undefined) {
            config.uvtValue = data.uvtValue;
        }
        if (data.purchaseWithholdingRules !== undefined) {
            config.purchaseWithholdingRules = data.purchaseWithholdingRules.map((rule) => ({
                ...rule,
                active: rule.active ?? true,
            }));
        }

        // Calculations

        // MOD Cost Per Minute: (Salary * Load) / Real Monthly Minutes
        const monthlyModCost = config.operatorSalary * config.operatorLoadFactor;
        config.modCostPerMinute = config.operatorRealMonthlyMinutes > 0
            ? this.roundTo(monthlyModCost / config.operatorRealMonthlyMinutes)
            : 0;

        // CIF Cost Per Minute (manufacturing only):
        // Administrative payroll is tracked but excluded from product costing.
        const totalMonthlyCif = config.rent + config.utilities + config.otherExpenses;
        const totalFactoryMinutes = config.operatorRealMonthlyMinutes * config.numberOfOperators;

        config.cifCostPerMinute = totalFactoryMinutes > 0
            ? this.roundTo(totalMonthlyCif / totalFactoryMinutes)
            : 0;

        // Total
        config.costPerMinute = this.roundTo(config.modCostPerMinute + config.cifCostPerMinute);

        await this.em.flush();
        return config;
    }
}
