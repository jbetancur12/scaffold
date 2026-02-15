import { useCallback } from 'react';
import { BOMItem } from '@scaffold/types';
import { mrpApi } from '@/services/mrpApi';
import { useMrpMutation, useMrpQuery } from '@/hooks/useMrpQuery';

export const useVariantBomQuery = (variantId?: string) => {
    const fetchBom = useCallback(async (): Promise<BOMItem[]> => {
        if (!variantId) throw new Error('Variant ID is required');
        return mrpApi.getBOM(variantId);
    }, [variantId]);

    return useMrpQuery(fetchBom, Boolean(variantId), variantId ? `mrp.variant.bom.${variantId}` : undefined);
};

export const useAddBomItemMutation = () => {
    return useMrpMutation<Partial<BOMItem>, BOMItem>(
        async (payload) => mrpApi.addBOMItem(payload)
    );
};

export const useCopyBomFromVariantMutation = () => {
    return useMrpMutation<{ sourceVariantId: string; targetVariantId: string }, BOMItem[]>(
        async ({ sourceVariantId, targetVariantId }) => {
            const sourceBom = await mrpApi.getBOM(sourceVariantId);
            if (sourceBom.length === 0) {
                return [];
            }

            const created = await Promise.all(
                sourceBom.map((item) => mrpApi.addBOMItem({
                    variantId: targetVariantId,
                    rawMaterialId: item.rawMaterialId,
                    quantity: item.quantity,
                    fabricationParams: item.fabricationParams || undefined,
                }))
            );

            return created;
        }
    );
};
