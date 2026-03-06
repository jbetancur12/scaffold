import { useCallback } from 'react';
import {
    ProductionAnalyticsDetailGroupBy,
    ProductionAnalyticsDetailResult,
    ProductionAnalyticsSummary,
    ProductionAnalyticsTopCustomer,
    ProductionAnalyticsTopProduct,
    ProductionAnalyticsTrendPoint,
} from '@scaffold/types';
import { ProductionAnalyticsFilters } from '@scaffold/schemas';
import { mrpApi } from '@/services/mrpApi';
import { mrpQueryKeys } from '@/hooks/mrpQueryKeys';
import { useMrpQuery } from '@/hooks/useMrpQuery';

type Filters = ProductionAnalyticsFilters & { groupBy?: ProductionAnalyticsDetailGroupBy };

const statusKey = (status?: string) => status || '';

export const useProductionAnalyticsSummaryQuery = (filters: Filters) => {
    const fetcher = useCallback(async (): Promise<ProductionAnalyticsSummary> => {
        return mrpApi.getProductionAnalyticsSummary(filters);
    }, [filters]);

    return useMrpQuery(
        fetcher,
        true,
        mrpQueryKeys.productionAnalyticsSummary(filters.month, filters.from, filters.to, statusKey(filters.status))
    );
};

export const useProductionAnalyticsTrendQuery = (filters: Filters) => {
    const fetcher = useCallback(async (): Promise<ProductionAnalyticsTrendPoint[]> => {
        return mrpApi.getProductionAnalyticsTrend(filters);
    }, [filters]);

    return useMrpQuery(
        fetcher,
        true,
        mrpQueryKeys.productionAnalyticsTrend(filters.month, filters.from, filters.to, statusKey(filters.status))
    );
};

export const useProductionAnalyticsTopProductsQuery = (filters: Filters, limit = 5) => {
    const fetcher = useCallback(async (): Promise<ProductionAnalyticsTopProduct[]> => {
        return mrpApi.getProductionAnalyticsTopProducts({ ...filters, limit });
    }, [filters, limit]);

    return useMrpQuery(
        fetcher,
        true,
        mrpQueryKeys.productionAnalyticsTopProducts(filters.month, filters.from, filters.to, statusKey(filters.status), limit)
    );
};

export const useProductionAnalyticsTopCustomersQuery = (filters: Filters, limit = 5) => {
    const fetcher = useCallback(async (): Promise<ProductionAnalyticsTopCustomer[]> => {
        return mrpApi.getProductionAnalyticsTopCustomers({ ...filters, limit });
    }, [filters, limit]);

    return useMrpQuery(
        fetcher,
        true,
        mrpQueryKeys.productionAnalyticsTopCustomers(filters.month, filters.from, filters.to, statusKey(filters.status), limit)
    );
};

export const useProductionAnalyticsDetailQuery = (filters: Filters) => {
    const fetcher = useCallback(async (): Promise<ProductionAnalyticsDetailResult> => {
        return mrpApi.getProductionAnalyticsDetail(filters);
    }, [filters]);

    return useMrpQuery(
        fetcher,
        true,
        mrpQueryKeys.productionAnalyticsDetail(filters.month, filters.from, filters.to, statusKey(filters.status), filters.groupBy)
    );
};
