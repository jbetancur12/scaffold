import { useCallback } from 'react';
import { InventoryItem } from '@scaffold/types';
import { mrpApi, RawMaterialKardexRow } from '@/services/mrpApi';
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

export const useInventoryKardexQuery = (filters?: {
    page?: number;
    limit?: number;
    rawMaterialId?: string;
    supplierLotCode?: string;
    referenceId?: string;
    dateFrom?: string;
    dateTo?: string;
}) => {
    const fetchKardex = useCallback(async (): Promise<{ items: RawMaterialKardexRow[]; total: number }> => {
        return mrpApi.getInventoryKardex(filters);
    }, [filters?.dateFrom, filters?.dateTo, filters?.limit, filters?.page, filters?.rawMaterialId, filters?.referenceId, filters?.supplierLotCode]);

    const queryKey = `mrp.inventory-kardex.${JSON.stringify(filters || {})}`;
    return useMrpQuery(fetchKardex, true, queryKey);
};
