import { useCallback } from 'react';
import { mrpApi } from '@/services/mrpApi';
import {
    PurchaseRequisition,
    PurchaseRequisitionListResponse,
    PurchaseRequisitionStatus,
} from '@scaffold/types';
import {
    CreatePurchaseRequisitionFromProductionOrderPayload,
    CreatePurchaseRequisitionPayload,
} from '@scaffold/schemas';
import { mrpQueryKeys } from '@/hooks/mrpQueryKeys';
import { invalidateMrpQueriesByPrefix, invalidateMrpQuery, useMrpMutation, useMrpQuery } from '@/hooks/useMrpQuery';

export const usePurchaseRequisitionsQuery = (
    page: number,
    limit: number,
    filters?: { status?: PurchaseRequisitionStatus; productionOrderId?: string }
) => {
    const queryKey = mrpQueryKeys.purchaseRequisitionsList(page, limit, filters?.status, filters?.productionOrderId);

    const fetcher = useCallback(async (): Promise<PurchaseRequisitionListResponse> => {
        return mrpApi.listPurchaseRequisitions(page, limit, filters);
    }, [page, limit, filters]);

    return useMrpQuery(fetcher, true, queryKey);
};

export const usePurchaseRequisitionQuery = (id?: string) => {
    const fetcher = useCallback(async (): Promise<PurchaseRequisition> => {
        if (!id) throw new Error('Purchase requisition ID is required');
        return mrpApi.getPurchaseRequisition(id);
    }, [id]);

    return useMrpQuery(fetcher, Boolean(id), id ? mrpQueryKeys.purchaseRequisition(id) : undefined);
};

export const useCreatePurchaseRequisitionMutation = () => {
    return useMrpMutation<CreatePurchaseRequisitionPayload, PurchaseRequisition>(
        async (payload) => mrpApi.createPurchaseRequisition(payload),
        {
            onSuccess: async (row) => {
                invalidateMrpQueriesByPrefix(mrpQueryKeys.purchaseRequisitions);
                invalidateMrpQuery(mrpQueryKeys.purchaseRequisition(row.id));
            },
        }
    );
};

export const useCreatePurchaseRequisitionFromProductionOrderMutation = () => {
    return useMrpMutation<{ productionOrderId: string; payload: CreatePurchaseRequisitionFromProductionOrderPayload }, PurchaseRequisition>(
        async ({ productionOrderId, payload }) => mrpApi.createPurchaseRequisitionFromProductionOrder(productionOrderId, payload),
        {
            onSuccess: async (row) => {
                invalidateMrpQueriesByPrefix(mrpQueryKeys.purchaseRequisitions);
                invalidateMrpQuery(mrpQueryKeys.purchaseRequisition(row.id));
            },
        }
    );
};

export const useUpdatePurchaseRequisitionStatusMutation = () => {
    return useMrpMutation<{ id: string; status: PurchaseRequisitionStatus }, PurchaseRequisition>(
        async ({ id, status }) => mrpApi.updatePurchaseRequisitionStatus(id, status),
        {
            onSuccess: async (row) => {
                invalidateMrpQueriesByPrefix(mrpQueryKeys.purchaseRequisitions);
                invalidateMrpQuery(mrpQueryKeys.purchaseRequisition(row.id));
            },
        }
    );
};

export const useMarkPurchaseRequisitionConvertedMutation = () => {
    return useMrpMutation<{ id: string; purchaseOrderId: string }, PurchaseRequisition>(
        async ({ id, purchaseOrderId }) => mrpApi.markPurchaseRequisitionConverted(id, purchaseOrderId),
        {
            onSuccess: async (row) => {
                invalidateMrpQueriesByPrefix(mrpQueryKeys.purchaseRequisitions);
                invalidateMrpQuery(mrpQueryKeys.purchaseRequisition(row.id));
            },
        }
    );
};
