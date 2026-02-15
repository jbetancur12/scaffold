import { useCallback } from 'react';
import { RawMaterial, Supplier, SupplierMaterial } from '@scaffold/types';
import { mrpApi } from '@/services/mrpApi';
import { mrpQueryKeys } from '@/hooks/mrpQueryKeys';
import { invalidateMrpQueriesByPrefix, invalidateMrpQuery, useMrpMutation, useMrpQuery } from '@/hooks/useMrpQuery';

export const useSuppliersQuery = (page = 1, limit = 10) => {
    const fetchSuppliers = useCallback(async (): Promise<{ suppliers: Supplier[]; total: number }> => {
        return mrpApi.getSuppliers(page, limit);
    }, [page, limit]);

    return useMrpQuery(fetchSuppliers, true, mrpQueryKeys.suppliersList(page, limit));
};

export const useSupplierQuery = (id?: string) => {
    const fetchSupplier = useCallback(async (): Promise<Supplier> => {
        if (!id) throw new Error('Supplier ID is required');
        return mrpApi.getSupplier(id);
    }, [id]);

    return useMrpQuery(fetchSupplier, Boolean(id), id ? mrpQueryKeys.supplier(id) : undefined);
};

export const useSaveSupplierMutation = () => {
    return useMrpMutation<{ id?: string; payload: Partial<Supplier> }, Supplier>(
        async ({ id, payload }) => {
            if (id) {
                return mrpApi.updateSupplier(id, payload);
            }
            return mrpApi.createSupplier(payload);
        },
        {
            onSuccess: async (supplier) => {
                invalidateMrpQueriesByPrefix(mrpQueryKeys.suppliers);
                invalidateMrpQuery(mrpQueryKeys.supplier(supplier.id));
            },
        }
    );
};

export const useSupplierMaterialsQuery = (supplierId?: string) => {
    const fetchSupplierMaterials = useCallback(async (): Promise<{ rawMaterial: RawMaterial; lastPurchasePrice: number; lastPurchaseDate: string }[]> => {
        if (!supplierId) throw new Error('Supplier ID is required');
        return mrpApi.getSupplierMaterials(supplierId);
    }, [supplierId]);

    return useMrpQuery(
        fetchSupplierMaterials,
        Boolean(supplierId),
        supplierId ? mrpQueryKeys.supplierMaterials(supplierId) : undefined
    );
};

export const useLinkSupplierMaterialMutation = () => {
    return useMrpMutation<{ supplierId: string; rawMaterialId: string; price: number }, SupplierMaterial>(
        async ({ supplierId, rawMaterialId, price }) => {
            return mrpApi.addSupplierMaterial(supplierId, { rawMaterialId, price });
        },
        {
            onSuccess: async (_, input) => {
                invalidateMrpQuery(mrpQueryKeys.supplierMaterials(input.supplierId));
                invalidateMrpQueriesByPrefix(mrpQueryKeys.rawMaterials);
            },
        }
    );
};

export const useUnlinkSupplierMaterialMutation = () => {
    return useMrpMutation<{ supplierId: string; materialId: string }, void>(
        async ({ supplierId, materialId }) => {
            await mrpApi.removeSupplierMaterial(supplierId, materialId);
        },
        {
            onSuccess: async (_, input) => {
                invalidateMrpQuery(mrpQueryKeys.supplierMaterials(input.supplierId));
                invalidateMrpQueriesByPrefix(mrpQueryKeys.rawMaterials);
            },
        }
    );
};
