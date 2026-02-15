import { isAxiosError } from 'axios';
import { ZodError } from 'zod';

type ApiErrorPayload = {
    message?: string | string[];
    error?: string;
};

export function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ZodError) {
        return error.errors[0]?.message || fallback;
    }

    if (isAxiosError(error)) {
        const payload = error.response?.data as ApiErrorPayload | string | undefined;

        if (typeof payload === 'string' && payload.trim()) {
            return payload;
        }

        if (payload && typeof payload === 'object') {
            if (typeof payload.message === 'string' && payload.message.trim()) {
                return payload.message;
            }
            if (Array.isArray(payload.message) && payload.message.length > 0) {
                return payload.message.join(', ');
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
