import { useCallback } from 'react';
import { BOMItem } from '@scaffold/types';
import { mrpApi } from '@/services/mrpApi';
import { useMrpMutation, useMrpQuery } from '@/hooks/useMrpQuery';

const normalizeFabricationParams = (item: BOMItem) => {
    const params = item.fabricationParams;
    if (!params) return undefined;

    const rollWidth = Number(params.rollWidth);
    const pieceWidth = Number(params.pieceWidth);
    const pieceLength = Number(params.pieceLength);
    const orientation: 'normal' | 'rotated' | undefined = params.orientation === 'rotated'
        ? 'rotated'
        : params.orientation === 'normal'
            ? 'normal'
            : undefined;
    const calculationType: 'area' | 'linear' = params.calculationType === 'linear' ? 'linear' : 'area';

    if (!Number.isFinite(rollWidth) || !Number.isFinite(pieceWidth) || !Number.isFinite(pieceLength) || !orientation) {
        return undefined;
    }

    return {
        rollWidth,
        pieceWidth,
        pieceLength,
        orientation,
        calculationType,
        quantityPerUnit: Number.isFinite(Number(params.quantityPerUnit)) ? Number(params.quantityPerUnit) : 1,
    };
};

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
            const targetBom = await mrpApi.getBOM(targetVariantId);

            await Promise.all(targetBom.map((item) => mrpApi.deleteBOMItem(item.id)));

            if (sourceBom.length === 0) {
                return [];
            }

            const created = await Promise.all(
                sourceBom.map((item) => mrpApi.addBOMItem({
                    variantId: targetVariantId,
                    rawMaterialId: item.rawMaterialId,
                    quantity: item.quantity,
                    usageNote: item.usageNote || undefined,
                    fabricationParams: normalizeFabricationParams(item),
                }))
            );

            return created;
        }
    );
};
