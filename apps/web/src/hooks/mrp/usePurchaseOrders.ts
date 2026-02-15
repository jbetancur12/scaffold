import { useCallback } from 'react';
import { mrpApi } from '@/services/mrpApi';
import { CreatePurchaseOrderDto } from '@scaffold/schemas';
import { PurchaseOrder, PurchaseOrderListResponse, PurchaseOrderStatus } from '@scaffold/types';
import { mrpQueryKeys } from '@/hooks/mrpQueryKeys';
import { invalidateMrpQueriesByPrefix, invalidateMrpQuery, useMrpMutation, useMrpQuery } from '@/hooks/useMrpQuery';

export const usePurchaseOrdersQuery = (
    page: number,
    limit: number,
    filters?: { status?: PurchaseOrderStatus; supplierId?: string }
) => {
    const queryKey = mrpQueryKeys.purchaseOrdersList(page, limit, filters?.status, filters?.supplierId);

    const fetchPurchaseOrders = useCallback(async (): Promise<PurchaseOrderListResponse> => {
        return mrpApi.listPurchaseOrders(page, limit, filters);
    }, [filters, limit, page]);

    return useMrpQuery(fetchPurchaseOrders, true, queryKey);
};

export const usePurchaseOrderQuery = (id?: string) => {
    const fetchPurchaseOrder = useCallback(async (): Promise<PurchaseOrder> => {
        if (!id) throw new Error('Purchase order ID is required');
        return mrpApi.getPurchaseOrder(id);
    }, [id]);

    return useMrpQuery(fetchPurchaseOrder, Boolean(id), id ? mrpQueryKeys.purchaseOrder(id) : undefined);
};

export const useReceivePurchaseOrderMutation = () => {
    return useMrpMutation<{ id: string; warehouseId?: string }, PurchaseOrder>(
        async ({ id, warehouseId }) => mrpApi.receivePurchaseOrder(id, warehouseId),
        {
            onSuccess: async (_, input) => {
                invalidateMrpQueriesByPrefix(mrpQueryKeys.purchaseOrders);
                invalidateMrpQuery(mrpQueryKeys.purchaseOrder(input.id));
                invalidateMrpQueriesByPrefix(mrpQueryKeys.rawMaterials);
            },
        }
    );
};

export const useCancelPurchaseOrderMutation = () => {
    return useMrpMutation<string, void>(
        async (id) => mrpApi.cancelPurchaseOrder(id),
        {
            onSuccess: async () => {
                invalidateMrpQueriesByPrefix(mrpQueryKeys.purchaseOrders);
            },
        }
    );
};

export const useCreatePurchaseOrderMutation = () => {
    return useMrpMutation<CreatePurchaseOrderDto, PurchaseOrder>(
        async (payload) => mrpApi.createPurchaseOrder(payload),
        {
            onSuccess: async (order) => {
                invalidateMrpQueriesByPrefix(mrpQueryKeys.purchaseOrders);
                invalidateMrpQuery(mrpQueryKeys.purchaseOrder(order.id));
            },
        }
    );
};
