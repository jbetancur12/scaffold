import { useCallback } from 'react';
import { InventoryItem } from '@scaffold/types';
import { mrpApi } from '@/services/mrpApi';
import { useMrpMutation, useMrpQuery } from '@/hooks/useMrpQuery';

export const useInventoryQuery = (page = 1, limit = 100, warehouseId?: string) => {
    const fetchInventory = useCallback(async (): Promise<{ items: InventoryItem[]; total: number }> => {
        return mrpApi.getInventory(page, limit, warehouseId);
    }, [limit, page, warehouseId]);

    const queryKey = `mrp.inventory.${page}.${limit}.${warehouseId || 'all'}`;
    return useMrpQuery(fetchInventory, true, queryKey);
};

export const useManualStockMutation = () => {
    return useMrpMutation<
        { rawMaterialId: string; quantity: number; unitCost: number; warehouseId?: string },
        InventoryItem
    >(
        async (payload) => mrpApi.addManualStock(payload)
    );
};
