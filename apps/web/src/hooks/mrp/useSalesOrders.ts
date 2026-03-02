import { useCallback } from 'react';
import { mrpApi } from '@/services/mrpApi';
import { CreateSalesOrderPayload, ListSalesOrdersFilters, UpdateSalesOrderPayload, UpdateSalesOrderStatusPayload } from '@scaffold/schemas';
import { SalesOrder, SalesOrderListResponse } from '@scaffold/types';
import { mrpQueryKeys } from '@/hooks/mrpQueryKeys';
import { invalidateMrpQueriesByPrefix, invalidateMrpQuery, useMrpMutation, useMrpQuery } from '@/hooks/useMrpQuery';

export const useSalesOrdersQuery = (
    page: number,
    limit: number,
    filters?: ListSalesOrdersFilters
) => {
    const { status, search } = filters || {};
    const queryKey = mrpQueryKeys.salesOrdersList(page, limit, status, search);

    const fetchSalesOrders = useCallback(async (): Promise<SalesOrderListResponse> => {
        return mrpApi.listSalesOrders(page, limit, { status, search });
    }, [status, search, limit, page]);

    return useMrpQuery(fetchSalesOrders, true, queryKey);
};

export const useSalesOrderQuery = (id?: string) => {
    const fetchSalesOrder = useCallback(async (): Promise<SalesOrder> => {
        if (!id) throw new Error('Sales order ID is required');
        return mrpApi.getSalesOrder(id);
    }, [id]);

    return useMrpQuery(fetchSalesOrder, Boolean(id), id ? mrpQueryKeys.salesOrder(id) : undefined);
};

export const useCreateSalesOrderMutation = () => {
    return useMrpMutation<CreateSalesOrderPayload, SalesOrder>(
        async (payload) => mrpApi.createSalesOrder(payload),
        {
            onSuccess: async (order) => {
                invalidateMrpQueriesByPrefix(mrpQueryKeys.salesOrders);
                invalidateMrpQuery(mrpQueryKeys.salesOrder(order.id));
            },
        }
    );
};

export const useUpdateSalesOrderMutation = () => {
    return useMrpMutation<{ id: string; payload: UpdateSalesOrderPayload }, SalesOrder>(
        async ({ id, payload }) => mrpApi.updateSalesOrder(id, payload),
        {
            onSuccess: async (order) => {
                invalidateMrpQueriesByPrefix(mrpQueryKeys.salesOrders);
                invalidateMrpQuery(mrpQueryKeys.salesOrder(order.id));
            },
        }
    );
};

export const useUpdateSalesOrderStatusMutation = () => {
    return useMrpMutation<{ id: string; payload: UpdateSalesOrderStatusPayload }, SalesOrder>(
        async ({ id, payload }) => mrpApi.updateSalesOrderStatus(id, payload),
        {
            onSuccess: async (order) => {
                invalidateMrpQueriesByPrefix(mrpQueryKeys.salesOrders);
                invalidateMrpQuery(mrpQueryKeys.salesOrder(order.id));
            },
        }
    );
};
