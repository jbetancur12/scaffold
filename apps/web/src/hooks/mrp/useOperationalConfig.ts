import { useCallback } from 'react';
import { OperationalConfig } from '@scaffold/types';
import { mrpApi } from '@/services/mrpApi';
import { mrpQueryKeys } from '@/hooks/mrpQueryKeys';
import { invalidateMrpQuery, useMrpMutation, useMrpQuery } from '@/hooks/useMrpQuery';

export const useOperationalConfigQuery = () => {
    const fetchOperationalConfig = useCallback(async (): Promise<OperationalConfig> => {
        return mrpApi.getOperationalConfig();
    }, []);

    return useMrpQuery(fetchOperationalConfig, true, mrpQueryKeys.operationalConfig);
};

export const useSaveOperationalConfigMutation = () => {
    return useMrpMutation<Partial<OperationalConfig>, OperationalConfig>(
        async (payload) => mrpApi.updateOperationalConfig(payload),
        {
            onSuccess: async () => {
                invalidateMrpQuery(mrpQueryKeys.operationalConfig);
            },
        }
    );
};
