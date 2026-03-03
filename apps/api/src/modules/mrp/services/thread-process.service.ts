import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { AppError } from '../../../shared/utils/response';
import { Product } from '../entities/product.entity';
import { ProductThreadProcess } from '../entities/product-thread-process.entity';

type ThreadMachineKey =
    | 'plana_1'
    | 'plana_2'
    | 'zigzadora'
    | 'fileteadora_3'
    | 'fileteadora_4'
    | 'fileteadora_5'
    | 'flatseamer'
    | 'reboteadora';

type MachineDefaults = { ratio: number; needles: number; stitchesPerCm: number };

const MACHINE_DEFAULTS: Record<ThreadMachineKey, MachineDefaults> = {
    plana_1: { ratio: 2.8, needles: 1, stitchesPerCm: 4 },
    plana_2: { ratio: 5.6, needles: 2, stitchesPerCm: 4 },
    zigzadora: { ratio: 6.5, needles: 1, stitchesPerCm: 4 },
    fileteadora_3: { ratio: 12.5, needles: 1, stitchesPerCm: 4 },
    fileteadora_4: { ratio: 15.5, needles: 2, stitchesPerCm: 4 },
    fileteadora_5: { ratio: 19.5, needles: 2, stitchesPerCm: 4 },
    flatseamer: { ratio: 32, needles: 4, stitchesPerCm: 4 },
    reboteadora: { ratio: 14, needles: 2, stitchesPerCm: 4 },
};

export class ThreadProcessService {
    private readonly em: EntityManager;
    private readonly productRepo: EntityRepository<Product>;
    private readonly processRepo: EntityRepository<ProductThreadProcess>;

    constructor(em: EntityManager) {
        this.em = em;
        this.productRepo = em.getRepository(Product);
        this.processRepo = em.getRepository(ProductThreadProcess);
    }

    private toNumber(value: number): number {
        return Number(value);
    }

    private buildComputed(row: ProductThreadProcess) {
        const ratio = this.toNumber(row.ratio);
        const sewnCentimeters = this.toNumber(row.sewnCentimeters);
        const wastePercent = this.toNumber(row.wastePercent);
        const coneLengthMeters = this.toNumber(row.coneLengthMeters);

        const baseMeters = (sewnCentimeters * ratio) / 100;
        const totalMeters = baseMeters * (1 + (wastePercent / 100));
        const cones = coneLengthMeters > 0 ? totalMeters / coneLengthMeters : 0;

        return {
            id: row.id,
            productId: row.product.id,
            processName: row.processName,
            machineKey: row.machineKey,
            sewnCentimeters,
            wastePercent,
            coneLengthMeters,
            needles: row.needles,
            stitchesPerCm: this.toNumber(row.stitchesPerCm),
            ratio,
            sortOrder: row.sortOrder,
            baseMetersPerUnit: Number(baseMeters.toFixed(4)),
            totalMetersPerUnit: Number(totalMeters.toFixed(4)),
            conesPerUnit: Number(cones.toFixed(6)),
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }

    async listByProduct(productId: string) {
        const product = await this.productRepo.findOne({ id: productId, deletedAt: null as never });
        if (!product) throw new AppError('Producto no encontrado', 404);

        const rows = await this.processRepo.find(
            { product: productId, deletedAt: null as never },
            { orderBy: [{ sortOrder: 'ASC' }, { createdAt: 'ASC' }] }
        );

        const processes = rows.map((row) => this.buildComputed(row));
        const totals = processes.reduce((acc, row) => {
            acc.baseMetersPerUnit += row.baseMetersPerUnit;
            acc.totalMetersPerUnit += row.totalMetersPerUnit;
            acc.conesPerUnit += row.conesPerUnit;
            return acc;
        }, { baseMetersPerUnit: 0, totalMetersPerUnit: 0, conesPerUnit: 0 });

        return {
            product: { id: product.id, name: product.name, sku: product.sku },
            totals: {
                baseMetersPerUnit: Number(totals.baseMetersPerUnit.toFixed(4)),
                totalMetersPerUnit: Number(totals.totalMetersPerUnit.toFixed(4)),
                conesPerUnit: Number(totals.conesPerUnit.toFixed(6)),
                totalMetersPerDozen: Number((totals.totalMetersPerUnit * 12).toFixed(4)),
                conesPerDozen: Number((totals.conesPerUnit * 12).toFixed(6)),
            },
            processes,
        };
    }

    async create(data: {
        productId: string;
        processName?: string;
        machineKey: string;
        sewnCentimeters: number;
        wastePercent?: number;
        coneLengthMeters?: number;
        needles?: number;
        stitchesPerCm?: number;
        ratio?: number;
        sortOrder?: number;
    }) {
        const product = await this.productRepo.findOne({ id: data.productId, deletedAt: null as never });
        if (!product) throw new AppError('Producto no encontrado', 404);

        const machine = data.machineKey as ThreadMachineKey;
        const defaults = MACHINE_DEFAULTS[machine] ?? { ratio: 10, needles: 1, stitchesPerCm: 4 };

        const row = new ProductThreadProcess();
        row.product = product;
        row.processName = data.processName;
        row.machineKey = data.machineKey;
        row.sewnCentimeters = data.sewnCentimeters;
        row.wastePercent = data.wastePercent ?? 8;
        row.coneLengthMeters = data.coneLengthMeters ?? 5000;
        row.needles = data.needles ?? defaults.needles;
        row.stitchesPerCm = data.stitchesPerCm ?? defaults.stitchesPerCm;
        row.ratio = data.ratio ?? defaults.ratio;
        row.sortOrder = data.sortOrder ?? 0;
        this.em.persist(row);
        await this.em.flush();
        return this.buildComputed(row);
    }

    async update(id: string, data: Partial<{
        processName: string;
        machineKey: string;
        sewnCentimeters: number;
        wastePercent: number;
        coneLengthMeters: number;
        needles: number;
        stitchesPerCm: number;
        ratio: number;
        sortOrder: number;
    }>) {
        const row = await this.processRepo.findOne({ id, deletedAt: null as never }, { populate: ['product'] });
        if (!row) throw new AppError('Proceso de hilo no encontrado', 404);

        if (data.processName !== undefined) row.processName = data.processName;
        if (data.machineKey !== undefined) row.machineKey = data.machineKey;
        if (data.sewnCentimeters !== undefined) row.sewnCentimeters = data.sewnCentimeters;
        if (data.wastePercent !== undefined) row.wastePercent = data.wastePercent;
        if (data.coneLengthMeters !== undefined) row.coneLengthMeters = data.coneLengthMeters;
        if (data.needles !== undefined) row.needles = data.needles;
        if (data.stitchesPerCm !== undefined) row.stitchesPerCm = data.stitchesPerCm;
        if (data.ratio !== undefined) row.ratio = data.ratio;
        if (data.sortOrder !== undefined) row.sortOrder = data.sortOrder;

        await this.em.flush();
        return this.buildComputed(row);
    }

    async remove(id: string) {
        const row = await this.processRepo.findOne({ id, deletedAt: null as never });
        if (!row) throw new AppError('Proceso de hilo no encontrado', 404);
        row.deletedAt = new Date();
        await this.em.flush();
        return { id, deleted: true };
    }
}
