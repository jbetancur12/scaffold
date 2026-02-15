import { useCallback } from 'react';
import { RawMaterial } from '@scaffold/types';
import { mrpApi, RawMaterialSupplier } from '@/services/mrpApi';
import { mrpQueryKeys } from '@/hooks/mrpQueryKeys';
import { invalidateMrpQueriesByPrefix, invalidateMrpQuery, useMrpMutation, useMrpQuery } from '@/hooks/useMrpQuery';

export interface RawMaterialsListResult {
    materials: RawMaterial[];
    total: number;
}

export const useRawMaterialsQuery = (page: number, limit: number, search: string) => {
    const queryKey = mrpQueryKeys.rawMaterialsList(page, limit, search);

    const fetchRawMaterials = useCallback(async (): Promise<RawMaterialsListResult> => {
        return mrpApi.getRawMaterials(page, limit, search);
    }, [page, limit, search]);

    const { data, loading, error, execute, invalidate } = useMrpQuery<RawMaterialsListResult>(
        fetchRawMaterials,
        true,
        queryKey
    );

    return {
        materials: data?.materials ?? [],
        total: data?.total ?? 0,
        loading,
        error,
        refetch: execute,
        invalidate,
    };
};

export const useRawMaterialQuery = (id?: string) => {
    const fetchRawMaterial = useCallback(async (): Promise<RawMaterial> => {
        if (!id) {
            throw new Error('Raw material ID is required');
        }
        return mrpApi.getRawMaterial(id);
    }, [id]);

    return useMrpQuery<RawMaterial>(
        fetchRawMaterial,
        Boolean(id),
        id ? mrpQueryKeys.rawMaterial(id) : undefined
    );
};

export const useRawMaterialSuppliersQuery = (id?: string) => {
    const fetchSuppliers = useCallback(async (): Promise<RawMaterialSupplier[]> => {
        if (!id) {
            throw new Error('Raw material ID is required');
        }
        return mrpApi.getRawMaterialSuppliers(id);
    }, [id]);

    return useMrpQuery<RawMaterialSupplier[]>(
        fetchSuppliers,
        Boolean(id),
        id ? mrpQueryKeys.rawMaterialSuppliers(id) : undefined
    );
};

export interface SaveRawMaterialInput {
    id?: string;
    payload: Partial<RawMaterial>;
}

export const useSaveRawMaterialMutation = () => {
    return useMrpMutation<SaveRawMaterialInput, RawMaterial>(
        async ({ id, payload }) => {
            if (id) {
                return mrpApi.updateRawMaterial(id, payload);
            }
            return mrpApi.createRawMaterial(payload);
        },
        {
            onSuccess: async (material) => {
                invalidateMrpQueriesByPrefix(mrpQueryKeys.rawMaterials);
                invalidateMrpQuery(mrpQueryKeys.rawMaterial(material.id));
            },
        }
    );
};
