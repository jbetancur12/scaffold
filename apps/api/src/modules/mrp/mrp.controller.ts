import { NextFunction, Request, Response } from 'express';
import { MikroORM } from '@mikro-orm/core';
import { ProductService } from './services/product.service';
import { SupplierService } from './services/supplier.service';
import { MrpService } from './services/mrp.service';
import { InventoryService } from './services/inventory.service';
import { ProductionService } from './services/production.service';
import { ProductSchema, SupplierSchema, RawMaterialSchema, BOMItemSchema, ProductionOrderSchema, ProductionOrderItemSchema } from '@scaffold/schemas';
import { z } from 'zod';

export class MrpController {
    private productService: ProductService;
    private supplierService: SupplierService;
    private mrpService: MrpService;
    private inventoryService: InventoryService;
    private productionService: ProductionService;

    constructor(orm: MikroORM) {
        const em = orm.em.fork();
        this.productService = new ProductService(em);
        this.supplierService = new SupplierService(em);
        this.mrpService = new MrpService(em);
        this.inventoryService = new InventoryService(em);
        this.productionService = new ProductionService(em);
    }

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

    // --- Raw Materials ---
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
            const { page, limit } = req.query;
            const result = await this.mrpService.listRawMaterials(Number(page) || 1, Number(limit) || 10);
            res.json(result);
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
    async createProductionOrder(req: Request, res: Response, next: NextFunction) {
        try {
            // Expect body to have { order: ..., items: [...] } logic or modify schema to include items
            // For now assuming: { ...orderData, items: [{variantId, quantity}] }
            const { items, ...orderData } = req.body;

            const validatedOrder = ProductionOrderSchema.parse(orderData);
            const validatedItems = z.array(ProductionOrderItemSchema).parse(items);

            const order = await this.productionService.createOrder(validatedOrder, validatedItems);
            res.status(201).json(order);
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

    async listInventory(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit } = req.query;
            const result = await this.inventoryService.getInventoryItems(Number(page) || 1, Number(limit) || 10);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
}
