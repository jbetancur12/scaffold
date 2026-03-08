import { useCallback } from 'react';
import {
    QuotationStatus,
    QuotationAnalyticsSummary,
    QuotationAnalyticsTopCustomer,
    QuotationAnalyticsTopProduct,
    QuotationAnalyticsTrendPoint,
} from '@scaffold/types';
import { mrpApi } from '@/services/mrpApi';
import { mrpQueryKeys } from '@/hooks/mrpQueryKeys';
import { useMrpQuery } from '@/hooks/useMrpQuery';

type Filters = {
    month?: string;
    status?: QuotationStatus;
    limit?: number;
};

const statusKey = (status?: string) => status || '';

export const useQuotationAnalyticsSummaryQuery = (filters: Filters) => {
    const fetcher = useCallback(async (): Promise<QuotationAnalyticsSummary> => {
        return mrpApi.getQuotationAnalyticsSummary(filters);
    }, [filters]);

    return useMrpQuery(fetcher, true, mrpQueryKeys.quotationAnalyticsSummary(filters.month, statusKey(filters.status)));
};

export const useQuotationAnalyticsTrendQuery = (filters: Filters) => {
    const fetcher = useCallback(async (): Promise<QuotationAnalyticsTrendPoint[]> => {
        return mrpApi.getQuotationAnalyticsTrend(filters);
    }, [filters]);

    return useMrpQuery(fetcher, true, mrpQueryKeys.quotationAnalyticsTrend(filters.month, statusKey(filters.status)));
};

export const useQuotationAnalyticsTopCustomersQuery = (filters: Filters, limit = 5) => {
    const fetcher = useCallback(async (): Promise<QuotationAnalyticsTopCustomer[]> => {
        return mrpApi.getQuotationAnalyticsTopCustomers({ ...filters, limit });
    }, [filters, limit]);

    return useMrpQuery(
        fetcher,
        true,
        mrpQueryKeys.quotationAnalyticsTopCustomers(filters.month, statusKey(filters.status), limit)
    );
};

export const useQuotationAnalyticsTopProductsQuery = (filters: Filters, limit = 5) => {
    const fetcher = useCallback(async (): Promise<QuotationAnalyticsTopProduct[]> => {
        return mrpApi.getQuotationAnalyticsTopProducts({ ...filters, limit });
    }, [filters, limit]);

    return useMrpQuery(
        fetcher,
        true,
        mrpQueryKeys.quotationAnalyticsTopProducts(filters.month, statusKey(filters.status), limit)
    );
};
