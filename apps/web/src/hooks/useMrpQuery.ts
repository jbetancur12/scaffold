import { useCallback, useEffect, useState } from 'react';

const querySubscriptions = new Map<string, Set<() => void>>();

const subscribeQueryKey = (queryKey: string, listener: () => void) => {
    const listeners = querySubscriptions.get(queryKey) || new Set<() => void>();
    listeners.add(listener);
    querySubscriptions.set(queryKey, listeners);
    return () => {
        const currentListeners = querySubscriptions.get(queryKey);
        if (!currentListeners) return;
        currentListeners.delete(listener);
        if (currentListeners.size === 0) {
            querySubscriptions.delete(queryKey);
        }
    };
};

export const invalidateMrpQuery = (queryKey: string) => {
    const listeners = querySubscriptions.get(queryKey);
    if (!listeners) return;
    for (const listener of listeners) {
        listener();
    }
};

export const invalidateMrpQueries = (queryKeys: string[]) => {
    for (const queryKey of queryKeys) {
        invalidateMrpQuery(queryKey);
    }
};

export function useMrpQuery<T>(fetcher: () => Promise<T>, immediate: boolean = true, queryKey?: string) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<unknown>(null);

    const execute = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetcher();
            setData(result);
            return result;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetcher]);

    useEffect(() => {
        if (immediate) {
            void execute();
        }
    }, [execute, immediate]);

    useEffect(() => {
        if (!queryKey) return;
        return subscribeQueryKey(queryKey, () => {
            void execute();
        });
    }, [execute, queryKey]);

    return { data, loading, error, execute, invalidate: execute };
}

export function useMrpMutation<TInput, TResult>(
    mutation: (input: TInput) => Promise<TResult>,
    options?: {
        onSuccess?: (result: TResult) => void | Promise<void>;
        onError?: (error: unknown) => void | Promise<void>;
        invalidateKeys?: string[];
    }
) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<unknown>(null);

    const execute = useCallback(async (input: TInput) => {
        setLoading(true);
        setError(null);
        try {
            const result = await mutation(input);
            await options?.onSuccess?.(result);
            if (options?.invalidateKeys?.length) {
                invalidateMrpQueries(options.invalidateKeys);
            }
            return result;
        } catch (err) {
            setError(err);
            await options?.onError?.(err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [mutation, options]);

    return { execute, loading, error };
}
