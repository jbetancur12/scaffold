import { useCallback } from 'react';
import { mrpApi } from '@/services/mrpApi';
import { Customer } from '@scaffold/types';
import { CreateCustomerPayload } from '@scaffold/schemas';
import { mrpQueryKeys } from '@/hooks/mrpQueryKeys';
import { useMrpQuery, useMrpMutation, invalidateMrpQueriesByPrefix, invalidateMrpQuery } from '@/hooks/useMrpQuery';

export const useCustomersQuery = (search?: string) => {
    const queryKey = mrpQueryKeys.customersList(search);

    const fetchCustomers = useCallback(async (): Promise<Customer[]> => {
        return mrpApi.listCustomers(search);
    }, [search]);

    return useMrpQuery(fetchCustomers, true, queryKey);
};

export const useCustomerQuery = (id?: string) => {
    const queryKey = id ? mrpQueryKeys.customerDetail(id) : undefined;

    const fetchCustomer = useCallback(async (): Promise<Customer> => {
        if (!id) throw new Error('Customer ID is required');
        return mrpApi.getCustomer(id);
    }, [id]);

    return useMrpQuery(fetchCustomer, !!id, queryKey);
};

export const useSaveCustomerMutation = () => {
    return useMrpMutation<{ id?: string; data: Partial<CreateCustomerPayload> }, Customer>(
        async ({ id, data }) => {
            if (id) {
                return mrpApi.updateCustomer(id, data);
            }
            return mrpApi.createCustomer(data as CreateCustomerPayload);
        },
        {
            onSuccess: async (customer, { id }) => {
                invalidateMrpQueriesByPrefix(mrpQueryKeys.customers);
                if (id || customer?.id) {
                    invalidateMrpQuery(mrpQueryKeys.customerDetail(id || customer.id));
                }
            }
        }
    );
};

export const useDeleteCustomerMutation = () => {
    return useMrpMutation<string, void>(
        async (id) => {
            return mrpApi.deleteCustomer(id);
        },
        {
            onSuccess: async () => {
                invalidateMrpQueriesByPrefix(mrpQueryKeys.customers);
            }
        }
    );
};
