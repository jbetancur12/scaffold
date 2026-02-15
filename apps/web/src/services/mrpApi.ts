import api from './api';
import {
    Product,
    Supplier,
    SupplierMaterial,
    RawMaterial,
    BOMItem,
    ProductionOrder,
    ProductVariant,
    InventoryItem,
    OperationalConfig,
    Warehouse
} from '@scaffold/types';
import type {
    CreatePurchaseOrderDto,
    CreateProductionOrderDto,
    CreateProductVariantDto,
    UpdateProductVariantDto,
} from '@scaffold/schemas';

export interface MaterialRequirement {
    material: {
        id: string;
        name: string;
        sku: string;
        unit: string;
    };
    required: number;
    available: number;
    potentialSuppliers: {
        supplier: { id: string; name: string; email?: string; phone?: string };
        lastPrice: number;
        lastDate: string;
        isCheapest: boolean;
    }[];
}

export interface RawMaterialSupplier {
    supplier: Supplier;
    lastPurchasePrice: number;
    lastPurchaseDate: string;
}

export interface ListResponse<T> {
    [key: string]: T[] | number; // Dynamic key based on return type (products, materials, etc)
    total: number;
}

export type PurchaseOrderStatus = 'PENDING' | 'CONFIRMED' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrderItem {
    id: string;
    rawMaterial: {
        id: string;
        name: string;
        sku: string;
        unit: string;
    };
    quantity: number;
    unitPrice: number;
    taxAmount: number;
    subtotal: number;
}

export interface PurchaseOrder {
    id: string;
    supplier: { id: string; name: string };
    orderDate: string;
    expectedDeliveryDate?: string;
    receivedDate?: string;
    status: PurchaseOrderStatus;
    totalAmount: number;
    taxTotal: number;
    subtotalBase: number;
    notes?: string;
    items?: PurchaseOrderItem[];
}

export interface PurchaseOrderListResponse {
    data: PurchaseOrder[];
    total: number;
    page: number;
    limit: number;
}

export const mrpApi = {
    // Products
    getProducts: async (page = 1, limit = 10) => {
        const response = await api.get<{ products: Product[], total: number }>(`/mrp/products?page=${page}&limit=${limit}`);
        return response.data;
    },
    getProduct: async (id: string) => {
        const response = await api.get<Product>(`/mrp/products/${id}`);
        return response.data;
    },
    createProduct: async (data: Partial<Product>): Promise<Product> => {
        const response = await api.post('/mrp/products', data);
        return response.data;
    },
    updateProduct: async (id: string, data: Partial<Product>): Promise<Product> => {
        const response = await api.put(`/mrp/products/${id}`, data);
        return response.data;
    },
    deleteProduct: async (id: string): Promise<void> => {
        await api.delete(`/mrp/products/${id}`);
    },

    // Variants
    createVariant: async (productId: string, data: CreateProductVariantDto): Promise<ProductVariant> => {
        const response = await api.post<ProductVariant>(`/mrp/products/${productId}/variants`, data);
        return response.data;
    },
    updateVariant: async (variantId: string, data: UpdateProductVariantDto): Promise<ProductVariant> => {
        const response = await api.put<ProductVariant>(`/mrp/variants/${variantId}`, data);
        return response.data;
    },
    deleteVariant: async (variantId: string): Promise<void> => {
        await api.delete(`/mrp/variants/${variantId}`);
    },

    // Purchase Orders
    createPurchaseOrder: async (data: CreatePurchaseOrderDto): Promise<PurchaseOrder> => {
        const response = await api.post<PurchaseOrder>('/mrp/purchase-orders', data);
        return response.data;
    },

    listPurchaseOrders: async (page: number = 1, limit: number = 10, filters?: { status?: string; supplierId?: string }): Promise<PurchaseOrderListResponse> => {
        const response = await api.get<PurchaseOrderListResponse>('/mrp/purchase-orders', { params: { page, limit, ...filters } });
        return response.data;
    },

    getPurchaseOrder: async (id: string): Promise<PurchaseOrder> => {
        const response = await api.get<PurchaseOrder>(`/mrp/purchase-orders/${id}`);
        return response.data;
    },

    updatePurchaseOrderStatus: async (id: string, status: PurchaseOrderStatus): Promise<PurchaseOrder> => {
        const response = await api.put<PurchaseOrder>(`/mrp/purchase-orders/${id}/status`, { status });
        return response.data;
    },

    receivePurchaseOrder: async (id: string, warehouseId?: string): Promise<PurchaseOrder> => {
        const response = await api.post<PurchaseOrder>(`/mrp/purchase-orders/${id}/receive`, { warehouseId });
        return response.data;
    },

    cancelPurchaseOrder: async (id: string): Promise<void> => {
        await api.delete(`/mrp/purchase-orders/${id}`);
    },

    // Warehouses
    getWarehouses: async () => {
        const response = await api.get<Warehouse[]>('/mrp/warehouses');
        return response.data;
    },
    getWarehouse: async (id: string) => {
        const response = await api.get<Warehouse>(`/mrp/warehouses/${id}`);
        return response.data;
    },
    createWarehouse: async (data: Partial<Warehouse>): Promise<Warehouse> => {
        const response = await api.post('/mrp/warehouses', data);
        return response.data;
    },
    updateWarehouse: async (id: string, data: Partial<Warehouse>): Promise<Warehouse> => {
        const response = await api.put(`/mrp/warehouses/${id}`, data);
        return response.data;
    },
    deleteWarehouse: async (id: string): Promise<void> => {
        await api.delete(`/mrp/warehouses/${id}`);
    },

    // Suppliers
    getSuppliers: async (page = 1, limit = 10) => {
        const response = await api.get<{ suppliers: Supplier[], total: number }>(`/mrp/suppliers?page=${page}&limit=${limit}`);
        return response.data;
    },
    getSupplier: async (id: string) => {
        const response = await api.get<Supplier>(`/mrp/suppliers/${id}`);
        return response.data;
    },
    createSupplier: async (data: Partial<Supplier>): Promise<Supplier> => {
        const response = await api.post('/mrp/suppliers', data);
        return response.data;
    },
    updateSupplier: async (id: string, data: Partial<Supplier>): Promise<Supplier> => {
        const response = await api.put(`/mrp/suppliers/${id}`, data);
        return response.data;
    },
    getSupplierMaterials: async (id: string): Promise<{ rawMaterial: RawMaterial; lastPurchasePrice: number; lastPurchaseDate: string }[]> => {
        const response = await api.get<{ rawMaterial: RawMaterial; lastPurchasePrice: number; lastPurchaseDate: string }[]>(`/mrp/suppliers/${id}/materials`);
        return response.data;
    },
    addSupplierMaterial: async (id: string, data: { rawMaterialId: string; price: number }): Promise<SupplierMaterial> => {
        const response = await api.post<SupplierMaterial>(`/mrp/suppliers/${id}/materials`, data);
        return response.data;
    },

    // Raw Materials
    getRawMaterials: async (page = 1, limit = 10, search = '') => {
        const response = await api.get<{ materials: RawMaterial[], total: number }>(`/mrp/raw-materials?page=${page}&limit=${limit}&search=${search}`);
        return response.data;
    },
    getRawMaterial: async (id: string) => {
        const response = await api.get<RawMaterial>(`/mrp/raw-materials/${id}`);
        return response.data;
    },
    createRawMaterial: async (data: Partial<RawMaterial>): Promise<RawMaterial> => {
        const response = await api.post('/mrp/raw-materials', data);
        return response.data;
    },
    updateRawMaterial: async (id: string, data: Partial<RawMaterial>): Promise<RawMaterial> => {
        const response = await api.patch(`/mrp/raw-materials/${id}`, data);
        return response.data;
    },
    getRawMaterialSuppliers: async (id: string) => {
        const response = await api.get<RawMaterialSupplier[]>(`/mrp/raw-materials/${id}/suppliers`);
        return response.data;
    },

    // BOM
    addBOMItem: async (data: Partial<BOMItem>): Promise<BOMItem> => {
        const response = await api.post('/mrp/bom-items', data);
        return response.data;
    },
    updateBOMItem: async (id: string, data: Partial<BOMItem>): Promise<BOMItem> => {
        const response = await api.put(`/mrp/bom-items/${id}`, data);
        return response.data;
    },
    getBOM: async (variantId: string): Promise<BOMItem[]> => {
        const response = await api.get<BOMItem[]>(`/mrp/variants/${variantId}/bom`);
        return response.data;
    },
    deleteBOMItem: async (id: string): Promise<void> => {
        await api.delete(`/mrp/bom-items/${id}`);
    },

    // Production Orders
    getProductionOrders: async (page = 1, limit = 10) => {
        const response = await api.get<{ orders: ProductionOrder[], total: number }>(`/mrp/production-orders?page=${page}&limit=${limit}`);
        return response.data;
    },
    getProductionOrder: async (id: string): Promise<ProductionOrder> => {
        const response = await api.get<ProductionOrder>(`/mrp/production-orders/${id}`);
        return response.data;
    },
    createProductionOrder: async (data: CreateProductionOrderDto): Promise<ProductionOrder> => {
        const response = await api.post('/mrp/production-orders', data);
        return response.data;
    },
    getMaterialRequirements: async (orderId: string): Promise<MaterialRequirement[]> => {
        const response = await api.get<MaterialRequirement[]>(`/mrp/production-orders/${orderId}/requirements`);
        return response.data;
    },
    updateProductionOrderStatus: async (id: string, status: string, warehouseId?: string): Promise<ProductionOrder> => {
        const response = await api.patch(`/mrp/production-orders/${id}/status`, { status, warehouseId });
        return response.data;
    },

    // Inventory
    getInventory: async (page = 1, limit = 10, warehouseId?: string) => {
        const response = await api.get<{ items: InventoryItem[], total: number }>(`/mrp/inventory`, { params: { page, limit, warehouseId } });
        return response.data;
    },
    addManualStock: async (data: { rawMaterialId: string; quantity: number; unitCost: number; warehouseId?: string }): Promise<InventoryItem> => {
        const response = await api.post<InventoryItem>('/mrp/inventory/manual-add', data);
        return response.data;
    },

    // Operational Config
    getOperationalConfig: async (): Promise<OperationalConfig> => {
        const response = await api.get<OperationalConfig>('/mrp/operational-config');
        return response.data;
    },
    updateOperationalConfig: async (data: Partial<OperationalConfig>): Promise<OperationalConfig> => {
        const response = await api.put('/mrp/operational-config', data);
        return response.data;
    },

    // Supplier Materials
    removeSupplierMaterial: async (id: string, materialId: string): Promise<void> => {
        await api.delete(`/mrp/suppliers/${id}/materials/${materialId}`);
    },
};
