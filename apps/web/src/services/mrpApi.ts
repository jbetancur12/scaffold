import api from './api';
import {
    Product,
    Supplier,
    RawMaterial,
    BOMItem,
    ProductionOrder,
    InventoryItem
} from '@scaffold/types';

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

export type CreateProductionOrderDTO = Omit<Partial<ProductionOrder>, 'items'> & {
    items: { variantId: string; quantity: number }[];
};

export interface ListResponse<T> {
    [key: string]: T[] | number; // Dynamic key based on return type (products, materials, etc)
    total: number;
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
    createVariant: async (productId: string, data: Partial<{ name: string; sku: string; price: number; targetMargin: number }>): Promise<unknown> => {
        const response = await api.post(`/mrp/products/${productId}/variants`, data);
        return response.data;
    },
    updateVariant: async (variantId: string, data: Partial<{ name: string; sku: string; price: number; targetMargin: number }>): Promise<unknown> => {
        const response = await api.put(`/mrp/variants/${variantId}`, data);
        return response.data;
    },
    deleteVariant: (variantId: string) =>
        api.delete(`/mrp/variants/${variantId}`),

    // Purchase Orders
    createPurchaseOrder: (data: {
        supplierId: string;
        expectedDeliveryDate?: string;
        notes?: string;
        items: Array<{
            rawMaterialId: string;
            quantity: number;
            unitPrice: number;
        }>;
    }) => api.post('/mrp/purchase-orders', data),

    listPurchaseOrders: (page: number = 1, limit: number = 10, filters?: { status?: string; supplierId?: string }) =>
        api.get('/mrp/purchase-orders', { params: { page, limit, ...filters } }),

    getPurchaseOrder: (id: string) =>
        api.get(`/mrp/purchase-orders/${id}`),

    updatePurchaseOrderStatus: (id: string, status: string) =>
        api.put(`/mrp/purchase-orders/${id}/status`, { status }),

    receivePurchaseOrder: (id: string) =>
        api.post(`/mrp/purchase-orders/${id}/receive`),

    cancelPurchaseOrder: (id: string) =>
        api.delete(`/mrp/purchase-orders/${id}`),

    // Suppliers
    getSuppliers: async (page = 1, limit = 10) => {
        const response = await api.get<{ suppliers: Supplier[], total: number }>(`/mrp/suppliers?page=${page}&limit=${limit}`);
        return response.data;
    },
    createSupplier: async (data: Partial<Supplier>): Promise<Supplier> => {
        const response = await api.post('/mrp/suppliers', data);
        return response.data;
    },

    // Raw Materials
    getRawMaterials: async (page = 1, limit = 10) => {
        const response = await api.get<{ materials: RawMaterial[], total: number }>(`/mrp/raw-materials?page=${page}&limit=${limit}`);
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

    // BOM
    addBOMItem: async (data: Partial<BOMItem>): Promise<BOMItem> => {
        const response = await api.post('/mrp/bom-items', data);
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
    createProductionOrder: async (data: CreateProductionOrderDTO): Promise<ProductionOrder> => {
        const response = await api.post('/mrp/production-orders', data);
        return response.data;
    },
    getMaterialRequirements: async (orderId: string) => {
        const response = await api.get<MaterialRequirement[]>(`/mrp/production-orders/${orderId}/requirements`);
        return response.data;
    },
    updateProductionOrderStatus: async (id: string, status: string): Promise<ProductionOrder> => {
        const response = await api.patch(`/mrp/production-orders/${id}/status`, { status });
        return response.data;
    },

    // Inventory
    getInventory: async (page = 1, limit = 10) => {
        const response = await api.get<{ items: InventoryItem[], total: number }>(`/mrp/inventory?page=${page}&limit=${limit}`);
        return response.data;
    },
    addManualStock: async (data: { rawMaterialId: string; quantity: number; unitCost: number }) => {
        const response = await api.post('/mrp/inventory/manual-add', data);
        return response.data;
    },
};
