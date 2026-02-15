import { useCallback, useEffect, useState } from 'react';

const querySubscriptions = new Map<string, Set<() => void>>();
const inFlightRequests = new Map<string, Promise<unknown>>();
const queryCache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_STORAGE_PREFIX = 'mrp-query-cache:';

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

const isBrowser = typeof window !== 'undefined';

const storageKey = (queryKey: string) => `${CACHE_STORAGE_PREFIX}${queryKey}`;

const readPersistedCache = <T>(queryKey: string): { data: T; expiresAt: number } | null => {
    if (!isBrowser) return null;
    try {
        const raw = window.localStorage.getItem(storageKey(queryKey));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { data: T; expiresAt: number };
        if (!parsed || typeof parsed.expiresAt !== 'number') return null;
        if (Date.now() >= parsed.expiresAt) {
            window.localStorage.removeItem(storageKey(queryKey));
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
};

const writePersistedCache = <T>(queryKey: string, data: T, expiresAt: number) => {
    if (!isBrowser) return;
    try {
        window.localStorage.setItem(storageKey(queryKey), JSON.stringify({ data, expiresAt }));
    } catch {
        // Ignore storage errors (quota/private mode)
    }
};

const removePersistedCache = (queryKey: string) => {
    if (!isBrowser) return;
    try {
        window.localStorage.removeItem(storageKey(queryKey));
    } catch {
        // Ignore storage errors
    }
};

export const invalidateMrpQuery = (queryKey: string) => {
    queryCache.delete(queryKey);
    removePersistedCache(queryKey);
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

export const invalidateMrpQueriesByPrefix = (prefix: string) => {
    const keysToInvalidate = new Set<string>();

    for (const key of queryCache.keys()) {
        if (key.startsWith(prefix)) {
            keysToInvalidate.add(key);
        }
    }

    for (const key of querySubscriptions.keys()) {
        if (key.startsWith(prefix)) {
            keysToInvalidate.add(key);
        }
    }

    for (const key of keysToInvalidate) {
        invalidateMrpQuery(key);
    }
};

interface UseMrpQueryOptions {
    ttlMs?: number;
    persist?: boolean;
    retry?: number;
    retryDelayMs?: number;
    backoffFactor?: number;
    shouldRetry?: (error: unknown, attempt: number) => boolean;
}

const defaultShouldRetry = (error: unknown) => {
    const maybeStatus = (error as { response?: { status?: number } })?.response?.status;
    if (typeof maybeStatus !== 'number') return true;
    return maybeStatus >= 500;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useMrpQuery<T>(
    fetcher: () => Promise<T>,
    immediate: boolean = true,
    queryKey?: string,
    options?: UseMrpQueryOptions
) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<unknown>(null);

    // Conservative default: no stale-cache behavior unless explicitly enabled per query.
    const ttlMs = options?.ttlMs ?? 0;
    const retry = options?.retry ?? 0;
    const retryDelayMs = options?.retryDelayMs ?? 400;
    const backoffFactor = options?.backoffFactor ?? 2;
    const shouldRetry = options?.shouldRetry ?? defaultShouldRetry;
    const persist = options?.persist ?? false;

    const execute = useCallback(async (params?: { force?: boolean }) => {
        const force = params?.force ?? false;
        if (queryKey && ttlMs > 0 && !force) {
            const cached = queryCache.get(queryKey) as { data: T; expiresAt: number } | undefined;
            if (cached && Date.now() < cached.expiresAt) {
                setData(cached.data);
                setError(null);
                return cached.data;
            }
        }

        setLoading(true);
        setError(null);

        const runFetch = async () => {
            let attempt = 0;
            for (let i = 0; i <= retry; i += 1) {
                try {
                    return await fetcher();
                } catch (err) {
                    if (attempt >= retry || !shouldRetry(err, attempt + 1)) {
                        throw err;
                    }
                    const delay = retryDelayMs * Math.pow(backoffFactor, attempt);
                    await sleep(delay);
                    attempt += 1;
                }
            }
            throw new Error('Unexpected retry loop termination');
        };

        try {
            let requestPromise: Promise<T>;
            if (queryKey) {
                const existing = inFlightRequests.get(queryKey) as Promise<T> | undefined;
                if (existing) {
                    requestPromise = existing;
                } else {
                    requestPromise = runFetch();
                    inFlightRequests.set(queryKey, requestPromise as Promise<unknown>);
                }
            } else {
                requestPromise = runFetch();
            }

            const result = await requestPromise;
            const expiresAt = Date.now() + ttlMs;

            if (queryKey && ttlMs > 0) {
                queryCache.set(queryKey, { data: result, expiresAt });
                if (persist) {
                    writePersistedCache(queryKey, result, expiresAt);
                }
            }

            setData(result);
            return result;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            if (queryKey) {
                inFlightRequests.delete(queryKey);
            }
            setLoading(false);
        }
    }, [backoffFactor, fetcher, persist, queryKey, retry, retryDelayMs, shouldRetry, ttlMs]);

    useEffect(() => {
        if (!queryKey || !persist || ttlMs <= 0) return;
        const persisted = readPersistedCache<T>(queryKey);
        if (persisted) {
            queryCache.set(queryKey, persisted);
            setData(persisted.data);
        }
    }, [persist, queryKey, ttlMs]);

    useEffect(() => {
        if (immediate) {
            void execute();
        }
    }, [execute, immediate]);

    useEffect(() => {
        if (!queryKey) return;
        return subscribeQueryKey(queryKey, () => {
            void execute({ force: true });
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
