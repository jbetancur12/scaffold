import { NextFunction, Request, Response } from 'express';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import { ProductService } from './services/product.service';
import { SupplierService } from './services/supplier.service';
import { MrpService } from './services/mrp.service';
import { InventoryService } from './services/inventory.service';
import { ProductionService } from './services/production.service';
import { PurchaseOrderService } from './services/purchase-order.service';
import { ProductSchema, ProductionOrderSchema, RawMaterialSchema, BOMItemSchema, SupplierSchema } from '@scaffold/schemas';
import { PurchaseOrderStatus } from './entities/purchase-order.entity';
import { z } from 'zod';

const CreatePurchaseOrderSchema = z.object({
    supplierId: z.string().uuid(),
    expectedDeliveryDate: z.coerce.date().optional(),
    notes: z.string().optional(),
    warehouseId: z.string().uuid().optional(),
    items: z.array(z.object({
        rawMaterialId: z.string().uuid(),
        quantity: z.number().min(0.01),
        unitPrice: z.number().min(0),
    })),
});

import { WarehouseSchema } from '@scaffold/schemas';

export class MrpController {
    // ...

    constructor(private readonly orm: MikroORM) { }

    private get em() {
        const em = RequestContext.getEntityManager();
        if (!em) {
            // Fallback for non-request contexts (like tests) or if middleware fails
            return this.orm.em.fork();
        }
        return em;
    }

    private get productService() { return new ProductService(this.em); }
    private get supplierService() { return new SupplierService(this.em); }
    private get mrpService() { return new MrpService(this.em); }
    private get inventoryService() { return new InventoryService(this.em); }
    private get productionService() { return new ProductionService(this.em); }
    private get purchaseOrderService() { return new PurchaseOrderService(this.em, this.mrpService); }

    // --- Products ---
    async createProduct(req: Request, res: Response, next: NextFunction) {
        try {
            const data = ProductSchema.parse(req.body);
            const product = await this.productService.createProduct(data);
            res.status(201).json(product);
        } catch (error) {
            next(error);
        }
    }

    async listProducts(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit } = req.query;
            const result = await this.productService.listProducts(Number(page) || 1, Number(limit) || 10);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async getProduct(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const product = await this.productService.getProduct(id);
            if (!product) {
                res.status(404).json({ message: 'Product not found' });
                return;
            }
            res.json(product);
        } catch (error) {
            next(error);
        }
    }

    async updateProduct(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const data = ProductSchema.partial().parse(req.body);
            const product = await this.productService.updateProduct(id, data);
            res.json(product);
        } catch (error) {
            next(error);
        }
    }

    async deleteProduct(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            await this.productService.deleteProduct(id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    // --- Variants ---
    async createVariant(req: Request, res: Response, next: NextFunction) {
        try {
            const { productId } = req.params;
            const data = req.body;
            const variant = await this.productService.createVariant(productId, data);
            res.status(201).json(variant);
        } catch (error) {
            next(error);
        }
    }

    async updateVariant(req: Request, res: Response, next: NextFunction) {
        try {
            const { variantId } = req.params;
            const data = req.body;
            const variant = await this.productService.updateVariant(variantId, data);
            res.json(variant);
        } catch (error) {
            next(error);
        }
    }

    async deleteVariant(req: Request, res: Response, next: NextFunction) {
        try {
            const { variantId } = req.params;
            await this.productService.deleteVariant(variantId);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    // --- Suppliers ---
    async createSupplier(req: Request, res: Response, next: NextFunction) {
        try {
            const data = SupplierSchema.parse(req.body);
            const supplier = await this.supplierService.createSupplier(data);
            res.status(201).json(supplier);
        } catch (error) {
            next(error);
        }
    }

    async listSuppliers(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit } = req.query;
            const result = await this.supplierService.listSuppliers(Number(page) || 1, Number(limit) || 10);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async getSupplier(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const supplier = await this.supplierService.getSupplier(id);
            if (!supplier) {
                res.status(404).json({ message: 'Supplier not found' });
                return;
            }
            res.json(supplier);
        } catch (error) {
            next(error);
        }
    }

    async getSupplierMaterials(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const materials = await this.supplierService.getSupplierMaterials(id);
            res.json(materials);
        } catch (error) {
            next(error);
        }
    }

    async addSupplierMaterial(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { rawMaterialId, price } = req.body;
            const link = await this.supplierService.addSupplierMaterial(id, rawMaterialId, price);
            res.status(201).json(link);
        } catch (error) {
            next(error);
        }
    }

    // --- Raw Materials ---
    async getRawMaterialSuppliers(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const suppliers = await this.supplierService.getSuppliersForMaterial(id);
            res.json(suppliers);
        } catch (error) {
            next(error);
        }
    }

    async createRawMaterial(req: Request, res: Response, next: NextFunction) {
        try {
            const data = RawMaterialSchema.parse(req.body);
            const material = await this.mrpService.createRawMaterial(data);
            res.status(201).json(material);
        } catch (error) {
            next(error);
        }
    }

    async listRawMaterials(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit, search } = req.query;
            const result = await this.mrpService.listRawMaterials(Number(page) || 1, Number(limit) || 10, search as string);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async getRawMaterial(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const material = await this.mrpService.getRawMaterial(id);
            res.json(material);
        } catch (error) {
            next(error);
        }
    }

    async updateRawMaterial(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const data = RawMaterialSchema.partial().parse(req.body);
            const material = await this.mrpService.updateRawMaterial(id, data);
            res.json(material);
        } catch (error) {
            next(error);
        }
    }

    async addBOMItem(req: Request, res: Response, next: NextFunction) {
        try {
            const data = BOMItemSchema.parse(req.body);
            const bomItem = await this.mrpService.addBOMItem(data);
            res.status(201).json(bomItem);
        } catch (error) {
            next(error);
        }
    }

    async updateBOMItem(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const data = BOMItemSchema.partial().parse(req.body);
            const bomItem = await this.mrpService.updateBOMItem(id, data);
            res.json(bomItem);
        } catch (error) {
            next(error);
        }
    }

    async getBOM(req: Request, res: Response, next: NextFunction) {
        try {
            const { variantId } = req.params;
            const bom = await this.mrpService.getBOM(variantId);
            res.json(bom);
        } catch (error) {
            next(error);
        }
    }

    async deleteBOMItem(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            await this.mrpService.deleteBOMItem(id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    // --- Production & Inventory ---
    async listProductionOrders(req: Request, res: Response, next: NextFunction) {
        try {
            const { page = 1, limit = 10 } = req.query;
            const orders = await this.productionService.listOrders(
                Number(page),
                Number(limit)
            );
            res.json(orders);
        } catch (error) {
            next(error);
        }
    }

    async getProductionOrder(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const order = await this.productionService.getOrder(id);
            res.json(order);
        } catch (error) {
            next(error);
        }
    }

    async createProductionOrder(req: Request, res: Response, next: NextFunction) {
        try {
            // Expect body to have { order: ..., items: [...] } logic or modify schema to include items
            // For now assuming: { ...orderData, items: [{variantId, quantity}] }
            const { items, ...orderData } = req.body;

            // Auto-generate code if not provided
            if (!orderData.code) {
                const timestamp = Date.now().toString(36).toUpperCase();
                orderData.code = `PO-${timestamp}`;
            }

            // Set default status if not provided
            if (!orderData.status) {
                orderData.status = 'draft';
            }

            const validatedOrder = ProductionOrderSchema.parse(orderData);

            // Validate items without productionOrderId (it doesn't exist yet)
            const itemCreationSchema = z.array(z.object({
                variantId: z.string().uuid(),
                quantity: z.number().int().min(1, 'La cantidad debe ser al menos 1'),
            }));
            const validatedItems = itemCreationSchema.parse(items);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const order = await this.productionService.createOrder(validatedOrder, validatedItems as any);
            res.status(201).json(order);
        } catch (error) {
            next(error);
        }
    }



    async updateProductionOrderStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { status, warehouseId } = req.body;
            const order = await this.productionService.updateStatus(id, status, warehouseId);
            res.json(order);
        } catch (error) {
            next(error);
        }
    }

    async calculateMaterialRequirements(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const requirements = await this.productionService.calculateMaterialRequirements(id);
            res.json(requirements);
        } catch (error) {
            next(error);
        }
    }

    // --- Inventory ---
    async getInventory(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit, warehouseId } = req.query;
            const result = await this.inventoryService.getInventoryItems(Number(page) || 1, Number(limit) || 100, warehouseId as string);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async addManualStock(req: Request, res: Response, next: NextFunction) {
        try {
            const schema = z.object({
                rawMaterialId: z.string(),
                quantity: z.number().min(0.01),
                unitCost: z.number().min(0),
                warehouseId: z.string().optional(),
            });
            const data = schema.parse(req.body);
            const result = await this.inventoryService.addManualStock(data);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    // --- Purchase Orders ---
    async createPurchaseOrder(req: Request, res: Response, next: NextFunction) {
        try {
            const data = CreatePurchaseOrderSchema.parse(req.body);
            const purchaseOrder = await this.purchaseOrderService.createPurchaseOrder(data);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            res.status(201).json(purchaseOrder);
        } catch (error) {
            next(error);
        }
    }

    async getPurchaseOrder(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const purchaseOrder = await this.purchaseOrderService.getPurchaseOrder(id);
            if (!purchaseOrder) {
                res.status(404).json({ message: 'Purchase order not found' });
                return;
            }
            res.json(purchaseOrder);
        } catch (error) {
            next(error);
        }
    }

    async listPurchaseOrders(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit, status, supplierId } = req.query;
            const result = await this.purchaseOrderService.listPurchaseOrders(
                Number(page) || 1,
                Number(limit) || 10,
                { status: status as PurchaseOrderStatus, supplierId: supplierId as string }
            );
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async updatePurchaseOrderStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const purchaseOrder = await this.purchaseOrderService.updateStatus(id, status);
            res.json(purchaseOrder);
        } catch (error) {
            next(error);
        }
    }

    async receivePurchaseOrder(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { warehouseId } = req.body;
            const purchaseOrder = await this.purchaseOrderService.receivePurchaseOrder(id, warehouseId);
            res.json(purchaseOrder);
        } catch (error) {
            next(error);
        }
    }

    // --- Warehouses ---
    async createWarehouse(req: Request, res: Response, next: NextFunction) {
        try {
            const data = WarehouseSchema.parse(req.body);
            const warehouse = await this.inventoryService.createWarehouse(data);
            res.status(201).json(warehouse);
        } catch (error) {
            next(error);
        }
    }

    async listWarehouses(_req: Request, res: Response, next: NextFunction) {
        try {
            const warehouses = await this.inventoryService.listWarehouses();
            res.json(warehouses);
        } catch (error) {
            next(error);
        }
    }

    async getWarehouse(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const warehouse = await this.inventoryService.getWarehouse(id);
            res.json(warehouse);
        } catch (error) {
            next(error);
        }
    }

    async updateWarehouse(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const data = WarehouseSchema.partial().parse(req.body);
            const warehouse = await this.inventoryService.updateWarehouse(id, data);
            res.json(warehouse);
        } catch (error) {
            next(error);
        }
    }

    async deleteWarehouse(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            await this.inventoryService.deleteWarehouse(id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    async cancelPurchaseOrder(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            await this.purchaseOrderService.cancelPurchaseOrder(id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}
