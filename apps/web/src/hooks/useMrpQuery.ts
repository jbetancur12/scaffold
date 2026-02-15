import { useCallback, useEffect, useState } from 'react';

export function useMrpQuery<T>(fetcher: () => Promise<T>, immediate: boolean = true) {
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

    return { data, loading, error, execute, invalidate: execute };
}

export function useMrpMutation<TInput, TResult>(
    mutation: (input: TInput) => Promise<TResult>,
    options?: {
        onSuccess?: (result: TResult) => void | Promise<void>;
        onError?: (error: unknown) => void | Promise<void>;
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
