export enum UserRole {
    USER = 'user',
    ADMIN = 'admin',
    SUPERADMIN = 'superadmin',
}

export interface User {
    id: string;
    email: string;
    role: UserRole;
    createdAt: string | Date;
    updatedAt: string | Date;
}

// MRP Enums
export enum UnitType {
    UNIT = 'unit',
    KG = 'kg',
    LITER = 'liter',
    METER = 'meter',
}

export enum WarehouseType {
    RAW_MATERIALS = 'raw_materials',
    FINISHED_GOODS = 'finished_goods',
    QUARANTINE = 'quarantine',
    OTHER = 'other',
}

export enum ProductionOrderStatus {
    DRAFT = 'draft',
    PLANNED = 'planned',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

// MRP Interfaces
export interface Supplier {
    id: string;
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface RawMaterial {
    id: string;
    name: string;
    sku: string;
    unit: UnitType;
    cost: number; // Current average cost
    stock?: number; // Virtual field for total stock
    minStockLevel?: number;
    supplierId?: string; // Preferred supplier
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface PurchaseRecord {
    id: string;
    rawMaterialId: string;
    supplierId: string;
    price: number;
    date: string | Date;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface Product {
    id: string;
    name: string;
    description?: string;
    sku: string;
    categoryId?: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    variants?: ProductVariant[];
}

export interface ProductVariant {
    id: string;
    productId: string;
    name: string; // e.g., "L", "XL", "Red"
    sku: string;
    price: number; // Sale price
    cost: number; // Calculated cost
    laborCost: number;
    indirectCost: number;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface BOMItem {
    id: string;
    variantId: string;
    rawMaterialId: string;
    quantity: number;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface Warehouse {
    id: string;
    name: string;
    location?: string;
    type: WarehouseType;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface InventoryItem {
    id: string;
    warehouseId: string;
    warehouse?: Warehouse;
    rawMaterialId?: string;
    rawMaterial?: RawMaterial;
    variantId?: string;
    variant?: ProductVariant;
    quantity: number;
    lastUpdated: string | Date;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface ProductionOrder {
    id: string;
    code: string;
    status: ProductionOrderStatus;
    startDate?: string | Date;
    endDate?: string | Date;
    notes?: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    items?: ProductionOrderItem[];
}

export interface ProductionOrderItem {
    id: string;
    productionOrderId: string;
    variantId: string;
    quantity: number;
    createdAt: string | Date;
    updatedAt: string | Date;
}
