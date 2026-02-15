import { useCallback } from 'react';
import { ProductionOrder } from '@scaffold/types';
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
                invalidateMrpQueriesByPrefix(mrpQueryKeys.productionOrders);
                if (input.status === 'COMPLETED') {
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
