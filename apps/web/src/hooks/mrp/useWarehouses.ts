import { useCallback } from 'react';
import { Warehouse } from '@scaffold/types';
import { mrpApi } from '@/services/mrpApi';
import { mrpQueryKeys } from '@/hooks/mrpQueryKeys';
import { invalidateMrpQueriesByPrefix, invalidateMrpQuery, useMrpMutation, useMrpQuery } from '@/hooks/useMrpQuery';

export const useWarehousesQuery = () => {
    const fetchWarehouses = useCallback(async (): Promise<Warehouse[]> => {
        return mrpApi.getWarehouses();
    }, []);

    return useMrpQuery(fetchWarehouses, true, mrpQueryKeys.warehouses);
};

export const useWarehouseQuery = (id?: string) => {
    const fetchWarehouse = useCallback(async (): Promise<Warehouse> => {
        if (!id) throw new Error('Warehouse ID is required');
        return mrpApi.getWarehouse(id);
    }, [id]);

    return useMrpQuery(fetchWarehouse, Boolean(id), id ? mrpQueryKeys.warehouse(id) : undefined);
};

export const useSaveWarehouseMutation = () => {
    return useMrpMutation<{ id?: string; payload: Partial<Warehouse> }, Warehouse>(
        async ({ id, payload }) => {
            if (id) {
                return mrpApi.updateWarehouse(id, payload);
            }
            return mrpApi.createWarehouse(payload);
        },
        {
            onSuccess: async (warehouse) => {
                invalidateMrpQueriesByPrefix(mrpQueryKeys.warehouses);
                invalidateMrpQuery(mrpQueryKeys.warehouse(warehouse.id));
            },
        }
    );
};

export const useDeleteWarehouseMutation = () => {
    return useMrpMutation<string, void>(
        async (id) => mrpApi.deleteWarehouse(id),
        {
            onSuccess: async () => {
                invalidateMrpQueriesByPrefix(mrpQueryKeys.warehouses);
            },
        }
    );
};
