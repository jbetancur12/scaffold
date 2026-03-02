import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { Supplier } from '../entities/supplier.entity';
import { SupplierMaterial } from '../entities/supplier-material.entity';
import { RawMaterial } from '../entities/raw-material.entity';
import { SupplierSchema } from '@scaffold/schemas';
import { z } from 'zod';
import { AppError } from '../../../shared/utils/response';

export class SupplierService {
    private readonly em: EntityManager;
    private readonly supplierRepo: EntityRepository<Supplier>;

    constructor(em: EntityManager) {
        this.em = em;
        this.supplierRepo = em.getRepository(Supplier);
    }

    private readonly supplierImportHeaders = [
        'name',
        'contact_name',
        'email',
        'phone',
        'address',
        'city',
        'department',
        'bank_details',
        'payment_conditions',
        'notes',
    ] as const;

    private toCsvRow(values: ReadonlyArray<string | number | boolean | undefined | null>) {
        return values
            .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
            .join(',');
    }

    private parseCsvLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i += 1) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i += 1;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }
            if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
                continue;
            }
            current += char;
        }
        result.push(current.trim());
        return result;
    }

    private parseSupplierImportCsv(csvText: string) {
        const lines = csvText
            .replace(/\r/g, '')
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
        if (lines.length <= 1) {
            throw new AppError('El CSV no contiene filas de datos', 400);
        }

        const header = this.parseCsvLine(lines[0]).map((h) => h.toLowerCase());
        const expected = [...this.supplierImportHeaders];
        const invalidHeader = expected.some((key, idx) => header[idx] !== key);
        if (invalidHeader) {
            throw new AppError(`Encabezado CSV inválido. Debe ser: ${expected.join(', ')}`, 400);
        }

        const rows: Array<{
            rowNumber: number;
            name: string;
            contactName?: string;
            email?: string;
            phone?: string;
            address?: string;
            city?: string;
            department?: string;
            bankDetails?: string;
            paymentConditions?: string;
            notes?: string;
        }> = [];
        const errors: Array<{ rowNumber: number; message: string }> = [];
        const namesInFile = new Set<string>();

        for (let index = 1; index < lines.length; index += 1) {
            const rowNumber = index + 1;
            const values = this.parseCsvLine(lines[index]);
            const row = Object.fromEntries(
                expected.map((key, keyIndex) => [key, (values[keyIndex] || '').trim()])
            ) as Record<(typeof expected)[number], string>;

            const name = row.name.trim();
            if (!name) {
                errors.push({ rowNumber, message: 'name es obligatorio' });
                continue;
            }

            const normalizedName = name.toUpperCase();
            if (namesInFile.has(normalizedName)) {
                errors.push({ rowNumber, message: `Proveedor duplicado en archivo: ${name}` });
                continue;
            }
            namesInFile.add(normalizedName);

            if (row.email) {
                const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email);
                if (!isValidEmail) {
                    errors.push({ rowNumber, message: 'email inválido' });
                    continue;
                }
            }

            rows.push({
                rowNumber,
                name,
                contactName: row.contact_name || undefined,
                email: row.email || undefined,
                phone: row.phone || undefined,
                address: row.address || undefined,
                city: row.city || undefined,
                department: row.department || undefined,
                bankDetails: row.bank_details || undefined,
                paymentConditions: row.payment_conditions || undefined,
                notes: row.notes || undefined,
            });
        }

        return { rows, errors, totalRows: lines.length - 1 };
    }

    async createSupplier(data: z.infer<typeof SupplierSchema>): Promise<Supplier> {
        const supplier = this.supplierRepo.create(data as unknown as Supplier);
        await this.em.persistAndFlush(supplier);
        return supplier;
    }

    async getSupplier(id: string): Promise<Supplier | null> {
        return this.supplierRepo.findOne({ id });
    }

    async updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier> {
        const supplier = await this.supplierRepo.findOneOrFail({ id });
        this.supplierRepo.assign(supplier, data);
        await this.em.persistAndFlush(supplier);
        return supplier;
    }

    async listSuppliers(page = 1, limit = 10): Promise<{ suppliers: Supplier[]; total: number }> {
        const [suppliers, total] = await this.supplierRepo.findAndCount(
            {},
            {
                limit,
                offset: (page - 1) * limit,
                orderBy: { name: 'ASC' }
            }
        );
        return { suppliers, total };
    }

    async exportSuppliersCsv(): Promise<{ fileName: string; content: string }> {
        const suppliers = await this.supplierRepo.findAll({ orderBy: { name: 'ASC' } });
        const rows: string[] = [this.toCsvRow(this.supplierImportHeaders)];
        for (const supplier of suppliers) {
            rows.push(this.toCsvRow([
                supplier.name,
                supplier.contactName,
                supplier.email,
                supplier.phone,
                supplier.address,
                supplier.city,
                supplier.department,
                supplier.bankDetails,
                supplier.paymentConditions,
                supplier.notes,
            ]));
        }
        return {
            fileName: `proveedores_${new Date().toISOString().slice(0, 10)}.csv`,
            content: rows.join('\n'),
        };
    }

    async getSupplierImportTemplateCsv(): Promise<{ fileName: string; content: string }> {
        const rows: string[] = [this.toCsvRow(this.supplierImportHeaders)];
        rows.push(this.toCsvRow([
            'Proveedor Ejemplo SAS',
            'María Pérez',
            'compras@proveedor-ejemplo.com',
            '3000000000',
            'Calle 1 # 2-3',
            'Pereira',
            'Risaralda',
            'Banco XYZ - Cta 123456',
            '30 días',
            'Proveedor estratégico',
        ]));
        return {
            fileName: 'plantilla_proveedores.csv',
            content: rows.join('\n'),
        };
    }

    async previewSupplierImportCsv(csvText: string): Promise<{
        summary: {
            totalRows: number;
            suppliersInFile: number;
            suppliersToCreate: number;
            suppliersToUpdate: number;
            errorCount: number;
        };
        errors: Array<{ rowNumber: number; message: string }>;
    }> {
        const parsed = this.parseSupplierImportCsv(csvText);
        const existing = await this.supplierRepo.findAll();
        const byName = new Map(existing.map((row) => [row.name.trim().toUpperCase(), row]));

        let toCreate = 0;
        let toUpdate = 0;
        for (const row of parsed.rows) {
            const key = row.name.trim().toUpperCase();
            if (byName.has(key)) toUpdate += 1;
            else toCreate += 1;
        }

        return {
            summary: {
                totalRows: parsed.totalRows,
                suppliersInFile: parsed.rows.length,
                suppliersToCreate: toCreate,
                suppliersToUpdate: toUpdate,
                errorCount: parsed.errors.length,
            },
            errors: parsed.errors,
        };
    }

    async importSuppliersCsv(csvText: string, actor?: string): Promise<{
        actor?: string;
        suppliersToCreate: number;
        suppliersToUpdate: number;
    }> {
        const parsed = this.parseSupplierImportCsv(csvText);
        if (parsed.errors.length > 0) {
            throw new AppError(`No se puede importar: hay ${parsed.errors.length} error(es) en el archivo`, 400);
        }

        const existing = await this.supplierRepo.findAll();
        const byName = new Map(existing.map((row) => [row.name.trim().toUpperCase(), row]));

        let toCreate = 0;
        let toUpdate = 0;

        await this.em.transactional(async (tx) => {
            const repo = tx.getRepository(Supplier);

            for (const row of parsed.rows) {
                const key = row.name.trim().toUpperCase();
                const current = byName.get(key);
                if (current) {
                    repo.assign(current, {
                        contactName: row.contactName,
                        email: row.email,
                        phone: row.phone,
                        address: row.address,
                        city: row.city,
                        department: row.department,
                        bankDetails: row.bankDetails,
                        paymentConditions: row.paymentConditions,
                        notes: row.notes,
                    } as Partial<Supplier>);
                    await tx.persist(current);
                    toUpdate += 1;
                    continue;
                }

                const created = repo.create({
                    name: row.name,
                    contactName: row.contactName,
                    email: row.email,
                    phone: row.phone,
                    address: row.address,
                    city: row.city,
                    department: row.department,
                    bankDetails: row.bankDetails,
                    paymentConditions: row.paymentConditions,
                    notes: row.notes,
                } as unknown as Supplier);
                await tx.persist(created);
                byName.set(key, created);
                toCreate += 1;
            }

            await tx.flush();
        });

        return {
            actor,
            suppliersToCreate: toCreate,
            suppliersToUpdate: toUpdate,
        };
    }

    async getSuppliersForMaterial(materialId: string) {
        const rawMaterial = await this.em.findOne(RawMaterial, { id: materialId }, { populate: ['supplier'] });
        const supplierMaterialRepo = this.em.getRepository(SupplierMaterial);
        const rows = await supplierMaterialRepo.find(
            { rawMaterial: materialId },
            {
                populate: ['supplier'],
                orderBy: { lastPurchaseDate: 'DESC' }
            }
        );

        const preferredSupplierId = rawMaterial?.supplier?.id;
        if (!preferredSupplierId) return rows;

        const preferredRowIndex = rows.findIndex((row) => row.supplier.id === preferredSupplierId);
        if (preferredRowIndex >= 0) {
            const [preferredRow] = rows.splice(preferredRowIndex, 1);
            return [preferredRow, ...rows];
        }

        // If preferred supplier has no purchase history yet, still return it as first suggestion.
        return [
            supplierMaterialRepo.create({
                supplier: rawMaterial!.supplier,
                rawMaterial: rawMaterial!,
                lastPurchasePrice: rawMaterial?.lastPurchasePrice ?? rawMaterial?.cost ?? 0,
                lastPurchaseDate: rawMaterial?.lastPurchaseDate ?? new Date(),
            } as unknown as SupplierMaterial),
            ...rows,
        ];
    }

    async getSupplierMaterials(supplierId: string) {
        const supplierMaterialRepo = this.em.getRepository(SupplierMaterial);
        return supplierMaterialRepo.find(
            { supplier: supplierId },
            {
                populate: ['rawMaterial'],
                orderBy: { lastPurchaseDate: 'DESC' }
            }
        );
    }

    async addSupplierMaterial(supplierId: string, materialId: string, price: number = 0) {
        const supplierMaterialRepo = this.em.getRepository(SupplierMaterial);

        let link = await supplierMaterialRepo.findOne({
            supplier: supplierId,
            rawMaterial: materialId
        });

        if (!link) {
            // Check entities exist
            const supplier = await this.supplierRepo.findOneOrFail({ id: supplierId });
            const rawMaterial = await this.em.findOneOrFail(RawMaterial, { id: materialId });

            link = supplierMaterialRepo.create({
                supplier,
                rawMaterial,
                lastPurchasePrice: price,
                lastPurchaseDate: new Date()
            } as unknown as SupplierMaterial);
            await this.em.persistAndFlush(link);
        }

        return link;
    }

    async removeSupplierMaterial(supplierId: string, materialId: string) {
        const supplierMaterialRepo = this.em.getRepository(SupplierMaterial);
        const link = await supplierMaterialRepo.findOne({
            supplier: supplierId,
            rawMaterial: materialId
        });

        if (link) {
            await this.em.removeAndFlush(link);
        }
    }
}
