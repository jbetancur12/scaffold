import { useCallback } from 'react';
import { ForecastGroupBy, ProductionForecastResult } from '@scaffold/types';
import { mrpApi } from '@/services/mrpApi';
import { mrpQueryKeys } from '@/hooks/mrpQueryKeys';
import { useMrpQuery } from '@/hooks/useMrpQuery';

export const useProductionForecastQuery = (filters?: {
    months?: number;
    from?: string;
    to?: string;
    groupBy?: ForecastGroupBy;
    minStockDays?: number;
    safetyStockDays?: number;
}) => {
    const fetcher = useCallback(async (): Promise<ProductionForecastResult> => {
        return mrpApi.getProductionForecast(filters);
    }, [filters?.months, filters?.from, filters?.to, filters?.groupBy, filters?.minStockDays, filters?.safetyStockDays]);

    return useMrpQuery(
        fetcher,
        true,
        mrpQueryKeys.productionForecast(filters?.from, filters?.to, filters?.groupBy)
    );
};
