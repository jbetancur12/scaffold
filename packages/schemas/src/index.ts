import { z } from 'zod';
import { UserRole, UnitType, WarehouseType, ProductionOrderStatus } from '@scaffold/types';

export const LoginSchema = z.object({
    email: z.string().email('Correo electrónico inválido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export const RegisterSchema = z.object({
    email: z.string().email('Correo electrónico inválido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    role: z.nativeEnum(UserRole).default(UserRole.USER),
});

export const CreateUserSchema = z.object({
    email: z.string().email('Correo electrónico inválido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    role: z.nativeEnum(UserRole),
});

export const UpdateUserSchema = z.object({
    email: z.string().email('Correo electrónico inválido').optional(),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').optional(),
    role: z.nativeEnum(UserRole).optional(),
});

// MRP Schemas

export const SupplierSchema = z.object({
    name: z.string().min(1, 'El nombre es obligatorio'),
    contactName: z.string().optional(),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    department: z.string().optional(),
    bankDetails: z.string().optional(),
    paymentConditions: z.string().optional(),
    notes: z.string().optional(),
});

export const RawMaterialSchema = z.object({
    name: z.string().min(1, 'El nombre es obligatorio'),
    sku: z.string().min(1, 'SKU es obligatorio'),
    unit: z.nativeEnum(UnitType),
    cost: z.number().min(0),
    minStockLevel: z.number().min(0).optional(),
    supplierId: z.string().uuid().optional(),
});

export const PurchaseRecordSchema = z.object({
    rawMaterialId: z.string().uuid(),
    supplierId: z.string().uuid(),
    price: z.number().min(0),
    date: z.string().or(z.date()),
});

export const ProductSchema = z.object({
    name: z.string().min(1, 'El nombre es obligatorio'),
    description: z.string().optional(),
    sku: z.string().min(1, 'SKU es obligatorio'),
    categoryId: z.string().uuid().optional(),
});

export const ProductVariantSchema = z.object({
    productId: z.string().uuid(),
    name: z.string().min(1, 'El nombre es obligatorio'),
    sku: z.string().min(1, 'SKU es obligatorio'),
    price: z.number().min(0),
    cost: z.number().min(0),
    referenceCost: z.number().min(0).optional(),
    laborCost: z.number().min(0),
    indirectCost: z.number().min(0),
    targetMargin: z.number().min(0).max(1).default(0.4),
    productionMinutes: z.number().min(0).optional(),
});

export const CreateProductVariantSchema = z.object({
    name: z.string().min(1, 'El nombre es obligatorio'),
    sku: z.string().min(1, 'SKU es obligatorio'),
    price: z.number().min(0),
    targetMargin: z.number().min(0).max(1).default(0.4),
    productionMinutes: z.number().min(0).optional(),
});

export const UpdateProductVariantSchema = CreateProductVariantSchema.partial();

export const BOMItemSchema = z.object({
    variantId: z.string().uuid(),
    rawMaterialId: z.string().uuid(),
    quantity: z.number().min(0),
    fabricationParams: z.object({
        calculationType: z.enum(['area', 'linear']).default('area'),
        quantityPerUnit: z.number().default(1),
        rollWidth: z.number(), // Used as "Material Length" in linear mode if needed, or specific field
        pieceWidth: z.number(),
        pieceLength: z.number(),
        orientation: z.enum(['normal', 'rotated'])
    }).optional(),
});

export const WarehouseSchema = z.object({
    name: z.string().min(1, 'El nombre es obligatorio'),
    location: z.string().optional(),
    type: z.nativeEnum(WarehouseType),
});

export const InventoryItemSchema = z.object({
    warehouseId: z.string().uuid(),
    rawMaterialId: z.string().uuid().optional(),
    variantId: z.string().uuid().optional(),
    quantity: z.number(),
}).refine(data => data.rawMaterialId || data.variantId, {
    message: "Debe especificar un Material o una Variante",
    path: ["rawMaterialId", "variantId"]
});

export const ProductionOrderSchema = z.object({
    code: z.string().min(1, 'El código es obligatorio'),
    status: z.nativeEnum(ProductionOrderStatus),
    startDate: z.string().or(z.date()).optional(),
    endDate: z.string().or(z.date()).optional(),
    notes: z.string().optional(),
});

export const ProductionOrderItemSchema = z.object({
    productionOrderId: z.string().uuid(),
    variantId: z.string().uuid(),
    quantity: z.number().int().min(1, 'La cantidad debe ser al menos 1'),
});

export const ProductionOrderItemCreateSchema = z.object({
    variantId: z.string().uuid(),
    quantity: z.number().int().min(1, 'La cantidad debe ser al menos 1'),
});

export const CreatePurchaseOrderSchema = z.object({
    supplierId: z.string().uuid(),
    expectedDeliveryDate: z.preprocess((val) => (val === '' ? undefined : val), z.coerce.date().optional()),
    notes: z.string().optional(),
    warehouseId: z.string().uuid().optional(),
    items: z.array(z.object({
        rawMaterialId: z.string().uuid(),
        quantity: z.number().min(0.01),
        unitPrice: z.number().min(0),
        taxAmount: z.number().min(0).optional(),
    })),
});

export const ManualStockSchema = z.object({
    rawMaterialId: z.string().uuid(),
    quantity: z.number().min(0.01),
    unitCost: z.number().min(0),
    warehouseId: z.string().uuid().optional(),
});

export const CreateProductionOrderSchema = z.object({
    startDate: z.string().or(z.date()).optional(),
    endDate: z.string().or(z.date()).optional(),
    notes: z.string().optional(),
    items: z.array(ProductionOrderItemCreateSchema).min(1, 'Debe agregar al menos un item'),
});

export const OperationalConfigSchema = z.object({
    // MOD
    operatorSalary: z.number().min(0, 'Salario debe ser mayor o igual a 0'),
    operatorLoadFactor: z.number().min(1, 'El factor prestacional debe incluir el salario (min 1.0)'),
    operatorRealMonthlyMinutes: z.number().min(1, 'Minutos reales deben ser mayor a 0'),

    // CIF
    rent: z.number().min(0, 'El arriendo debe ser mayor o igual a 0'),
    utilities: z.number().min(0, 'Servicios deben ser mayor o igual a 0'),
    adminSalaries: z.number().min(0, 'Nómina administrativa debe ser mayor o igual a 0'),
    otherExpenses: z.number().min(0, 'Otros gastos deben ser mayor o igual a 0'),

    numberOfOperators: z.number().min(1, 'Debe haber al menos 1 operario'),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
export type CreatePurchaseOrderDto = z.infer<typeof CreatePurchaseOrderSchema>;
export type CreateProductionOrderDto = z.infer<typeof CreateProductionOrderSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type RegisterDto = z.infer<typeof RegisterSchema>;
export type CreateProductVariantDto = z.infer<typeof CreateProductVariantSchema>;
export type UpdateProductVariantDto = z.infer<typeof UpdateProductVariantSchema>;
