import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { Operator } from '../entities/operator.entity';
import { AppError } from '../../../shared/utils/response';
import { CreateOperatorSchema, UpdateOperatorSchema } from '@scaffold/schemas';

export class OperatorService {
    private readonly em: EntityManager;
    private readonly repo: EntityRepository<Operator>;

    constructor(em: EntityManager) {
        this.em = em;
        this.repo = em.getRepository(Operator);
    }

    async list(page: number, limit: number, search?: string, active?: boolean) {
        const where: Record<string, unknown> = {};
        if (search) {
            where.$or = [
                { name: { $ilike: `%${search}%` } },
                { code: { $ilike: `%${search}%` } },
            ];
        }
        if (active !== undefined) {
            where.active = active;
        }

        const [rows, total] = await this.repo.findAndCount(where, {
            orderBy: { name: 'ASC' },
            limit,
            offset: (page - 1) * limit,
        });

        return { data: rows, total, page, limit };
    }

    async getById(id: string) {
        const operator = await this.repo.findOne({ id }, { populate: [] });
        if (!operator) {
            throw new AppError('Operador no encontrado', 404);
        }
        return operator;
    }

    async create(payload: unknown) {
        const data = CreateOperatorSchema.parse(payload);
        if (data.code) {
            const existing = await this.repo.findOne({ code: data.code });
            if (existing) {
                throw new AppError('Ya existe un operador con ese código', 400);
            }
        }
        const operator = this.repo.create({
            ...data,
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        await this.em.persistAndFlush(operator);
        return operator;
    }

    async update(id: string, payload: unknown) {
        const data = UpdateOperatorSchema.parse(payload);
        const operator = await this.getById(id);

        if (data.code && data.code !== operator.code) {
            const existing = await this.repo.findOne({ code: data.code });
            if (existing && existing.id !== id) {
                throw new AppError('Ya existe un operador con ese código', 400);
            }
        }

        if (data.name !== undefined) operator.name = data.name;
        if (data.code !== undefined) operator.code = data.code;
        if (data.active !== undefined) operator.active = data.active;

        await this.em.flush();
        return operator;
    }

    async delete(id: string) {
        const operator = await this.getById(id);
        await this.em.removeAndFlush(operator);
    }

    async getActiveOperators() {
        return this.repo.find({ active: true }, { orderBy: { name: 'ASC' } });
    }
}
