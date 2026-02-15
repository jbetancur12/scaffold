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

    return { data, loading, error, execute };
}
