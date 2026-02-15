import { useCallback } from 'react';
import { ProductionBatch, ProductionBatchUnit, ProductionOrder } from '@scaffold/types';
import { MaterialRequirement, mrpApi } from '@/services/mrpApi';
import { CreateProductionOrderDto } from '@scaffold/schemas';
import { mrpQueryKeys } from '@/hooks/mrpQueryKeys';
import { invalidateMrpQueriesByPrefix, invalidateMrpQuery, useMrpMutation, useMrpQuery } from '@/hooks/useMrpQuery';

export const useProductionOrdersQuery = (page = 1, limit = 10) => {
    const fetchProductionOrders = useCallback(async (): Promise<{ orders: ProductionOrder[]; total: number }> => {
        return mrpApi.getProductionOrders(page, limit);
    }, [page, limit]);

    return useMrpQuery(fetchProductionOrders, true, mrpQueryKeys.productionOrdersList(page, limit));
};

export const useProductionOrderQuery = (id?: string) => {
    const fetchProductionOrder = useCallback(async (): Promise<ProductionOrder> => {
        if (!id) throw new Error('Production order ID is required');
        return mrpApi.getProductionOrder(id);
    }, [id]);

    return useMrpQuery(fetchProductionOrder, Boolean(id), id ? mrpQueryKeys.productionOrder(id) : undefined);
};

export const useProductionRequirementsQuery = (id?: string) => {
    const fetchRequirements = useCallback(async (): Promise<MaterialRequirement[]> => {
        if (!id) throw new Error('Production order ID is required');
        return mrpApi.getMaterialRequirements(id);
    }, [id]);

    return useMrpQuery(fetchRequirements, Boolean(id), id ? mrpQueryKeys.productionRequirements(id) : undefined);
};

export const useProductionBatchesQuery = (orderId?: string) => {
    const fetchBatches = useCallback(async (): Promise<ProductionBatch[]> => {
        if (!orderId) throw new Error('Production order ID is required');
        return mrpApi.listProductionBatches(orderId);
    }, [orderId]);

    return useMrpQuery(fetchBatches, Boolean(orderId), orderId ? mrpQueryKeys.productionBatches(orderId) : undefined);
};

export const useUpdateProductionOrderStatusMutation = () => {
    return useMrpMutation<
        { orderId: string; status: string; warehouseId?: string },
        ProductionOrder
    >(
        async ({ orderId, status, warehouseId }) => mrpApi.updateProductionOrderStatus(orderId, status, warehouseId),
        {
            onSuccess: async (order, input) => {
                invalidateMrpQuery(mrpQueryKeys.productionOrder(order.id));
                invalidateMrpQuery(mrpQueryKeys.productionRequirements(input.orderId));
                invalidateMrpQuery(mrpQueryKeys.productionBatches(input.orderId));
                invalidateMrpQueriesByPrefix(mrpQueryKeys.productionOrders);
                if (input.status === 'completed') {
                    invalidateMrpQueriesByPrefix(mrpQueryKeys.rawMaterials);
                }
            },
        }
    );
};

export const useCreateProductionOrderMutation = () => {
    return useMrpMutation<CreateProductionOrderDto, ProductionOrder>(
        async (payload) => mrpApi.createProductionOrder(payload),
        {
            onSuccess: async (order) => {
                invalidateMrpQueriesByPrefix(mrpQueryKeys.productionOrders);
                invalidateMrpQuery(mrpQueryKeys.productionOrder(order.id));
            },
        }
    );
};

export const useCreateProductionBatchMutation = () => {
    return useMrpMutation<
        { orderId: string; variantId: string; plannedQty: number; code?: string; notes?: string },
        ProductionBatch
    >(
        async ({ orderId, ...payload }) => mrpApi.createProductionBatch(orderId, payload),
        {
            onSuccess: async (batch) => {
                invalidateMrpQuery(mrpQueryKeys.productionBatches(batch.productionOrderId));
                invalidateMrpQuery(mrpQueryKeys.productionOrder(batch.productionOrderId));
            },
        }
    );
};

export const useAddProductionBatchUnitsMutation = () => {
    return useMrpMutation<{ orderId: string; batchId: string; quantity: number }, ProductionBatch>(
        async ({ batchId, quantity }) => mrpApi.addProductionBatchUnits(batchId, quantity),
        {
            onSuccess: async (_batch, input) => {
                invalidateMrpQuery(mrpQueryKeys.productionBatches(input.orderId));
                invalidateMrpQuery(mrpQueryKeys.productionOrder(input.orderId));
            },
        }
    );
};

export const useUpdateProductionBatchQcMutation = () => {
    return useMrpMutation<{ orderId: string; batchId: string; passed: boolean }, ProductionBatch>(
        async ({ batchId, passed }) => mrpApi.updateProductionBatchQc(batchId, passed),
        {
            onSuccess: async (_batch, input) => {
                invalidateMrpQuery(mrpQueryKeys.productionBatches(input.orderId));
                invalidateMrpQuery(mrpQueryKeys.productionOrder(input.orderId));
            },
        }
    );
};

export const useUpdateProductionBatchPackagingMutation = () => {
    return useMrpMutation<{ orderId: string; batchId: string; packed: boolean }, ProductionBatch>(
        async ({ batchId, packed }) => mrpApi.updateProductionBatchPackaging(batchId, packed),
        {
            onSuccess: async (_batch, input) => {
                invalidateMrpQuery(mrpQueryKeys.productionBatches(input.orderId));
                invalidateMrpQuery(mrpQueryKeys.productionOrder(input.orderId));
            },
        }
    );
};

export const useUpdateProductionBatchUnitQcMutation = () => {
    return useMrpMutation<{ orderId: string; unitId: string; passed: boolean }, ProductionBatchUnit>(
        async ({ unitId, passed }) => mrpApi.updateProductionBatchUnitQc(unitId, passed),
        {
            onSuccess: async (_, input) => {
                invalidateMrpQuery(mrpQueryKeys.productionBatches(input.orderId));
                invalidateMrpQuery(mrpQueryKeys.productionOrder(input.orderId));
            },
        }
    );
};

export const useUpdateProductionBatchUnitPackagingMutation = () => {
    return useMrpMutation<{ orderId: string; unitId: string; packaged: boolean }, ProductionBatchUnit>(
        async ({ unitId, packaged }) => mrpApi.updateProductionBatchUnitPackaging(unitId, packaged),
        {
            onSuccess: async (_, input) => {
                invalidateMrpQuery(mrpQueryKeys.productionBatches(input.orderId));
                invalidateMrpQuery(mrpQueryKeys.productionOrder(input.orderId));
            },
        }
    );
};
