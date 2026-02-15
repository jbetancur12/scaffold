import { isAxiosError } from 'axios';
import { ZodError } from 'zod';

type ApiErrorPayload = {
    message?: string | string[] | Array<{ path?: string | string[]; message?: string }>;
    error?: string;
    details?: Array<{ path?: string; message?: string }>;
};

const parseStructuredValidationString = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
        return null;
    }

    try {
        const parsed = JSON.parse(trimmed) as Array<{ path?: unknown; message?: unknown }>;
        if (!Array.isArray(parsed) || parsed.length === 0) {
            return null;
        }

        const first = parsed[0];
        if (typeof first?.message !== 'string' || !first.message.trim()) {
            return null;
        }

        const path = Array.isArray(first.path)
            ? first.path.filter((segment): segment is string => typeof segment === 'string').join('.')
            : typeof first.path === 'string'
                ? first.path
                : '';

        return path ? `${path}: ${first.message}` : first.message;
    } catch {
        return null;
    }
};

const formatDetails = (details?: Array<{ path?: string; message?: string }>): string | null => {
    if (!details || details.length === 0) {
        return null;
    }
    const first = details[0];
    if (!first?.message) {
        return null;
    }
    return first.path ? `${first.path}: ${first.message}` : first.message;
};

export function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ZodError) {
        return error.errors[0]?.message || fallback;
    }

    if (isAxiosError(error)) {
        const payload = error.response?.data as ApiErrorPayload | string | undefined;

        if (typeof payload === 'string' && payload.trim()) {
            return parseStructuredValidationString(payload) ?? payload;
        }

        if (payload && typeof payload === 'object') {
            if (typeof payload.message === 'string' && payload.message.trim()) {
                return parseStructuredValidationString(payload.message) ?? payload.message;
            }
            if (Array.isArray(payload.message) && payload.message.length > 0) {
                const first = payload.message[0];
                if (typeof first === 'string' && first.trim()) {
                    return first;
                }
                if (first && typeof first === 'object' && typeof first.message === 'string' && first.message.trim()) {
                    if (Array.isArray(first.path) && first.path.length > 0) {
                        return `${first.path.join('.')}: ${first.message}`;
                    }
                    return first.message;
                }
            }
            const detailsMessage = formatDetails(payload.details);
            if (detailsMessage) {
                return detailsMessage;
            }
            if (typeof payload.error === 'string' && payload.error.trim()) {
                return payload.error;
            }
        }

        if (typeof error.message === 'string' && error.message.trim()) {
            return error.message;
        }
    }

    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }

    return fallback;
}
