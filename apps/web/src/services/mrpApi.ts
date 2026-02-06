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
    materialName: string;
    requiredQuantity: number;
    availableStock: number;
    unit: string;
    missingQuantity: number;
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
    createVariant: async (productId: string, data: Partial<{ name: string; sku: string; price: number }>): Promise<unknown> => {
        const response = await api.post(`/mrp/products/${productId}/variants`, data);
        return response.data;
    },
    updateVariant: async (variantId: string, data: Partial<{ name: string; sku: string; price: number }>): Promise<unknown> => {
        const response = await api.put(`/mrp/variants/${variantId}`, data);
        return response.data;
    },
    deleteVariant: async (variantId: string): Promise<void> => {
        await api.delete(`/mrp/variants/${variantId}`);
    },

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
    createRawMaterial: async (data: Partial<RawMaterial>): Promise<RawMaterial> => {
        const response = await api.post('/mrp/raw-materials', data);
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

    // Inventory
    getInventory: async (page = 1, limit = 10) => {
        const response = await api.get<{ items: InventoryItem[], total: number }>(`/mrp/inventory?page=${page}&limit=${limit}`);
        return response.data;
    }
};
