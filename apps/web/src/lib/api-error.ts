import { isAxiosError } from 'axios';
import { ZodError } from 'zod';

type ApiErrorPayload = {
    message?: string | string[] | Array<{ path?: string | string[]; message?: string }>;
    error?: string;
    details?: Array<{ path?: string; message?: string }>;
};

const normalizeOperationalError = (rawMessage: string): string => {
    const message = rawMessage.trim();
    const lower = message.toLowerCase();

    if (lower.includes("entitymanager.findone()") && lower.includes("empty 'where'")) {
        return 'Falta seleccionar un registro requerido antes de continuar.';
    }
    if (lower.includes('no existe documento aprobado vigente para el proceso')) {
        return 'No hay formato aprobado y vigente para este proceso. Configúralo en Documentos Globales.';
    }
    if (lower.includes('debes configurar el formato global de empaque')) {
        return 'Debes configurar el formato global de empaque en Configuración Operativa > Documentos Globales.';
    }
    if (lower.includes('debes configurar el formato global de etiquetado')) {
        return 'Debes configurar el formato global de etiquetado en Configuración Operativa > Documentos Globales.';
    }
    if (lower.includes('debes configurar el formato global de liberación qa')) {
        return 'Debes configurar el formato global de liberación QA en Configuración Operativa > Documentos Globales.';
    }
    if (lower.includes('debes configurar un formato global de recepción')) {
        return 'Debes configurar el formato global de recepción en Configuración Operativa > Documentos Globales.';
    }
    if (lower.includes('duplicate key value violates unique constraint') && lower.includes('controlled_document_code_version_unique')) {
        return 'Ya existe un documento con ese código y versión. Crea una nueva versión o cambia el código.';
    }
    if (lower.includes('value too long for type character varying(255)')) {
        return 'Uno de los campos excede la longitud máxima permitida. Reduce el texto e intenta de nuevo.';
    }
    if (lower.includes('expected string, received null')) {
        return 'Falta completar un valor obligatorio en la configuración.';
    }

    return message;
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
        return normalizeOperationalError(error.errors[0]?.message || fallback);
    }

    if (isAxiosError(error)) {
        const payload = error.response?.data as ApiErrorPayload | string | undefined;

        if (typeof payload === 'string' && payload.trim()) {
            const parsed = parseStructuredValidationString(payload) ?? payload;
            return normalizeOperationalError(parsed);
        }

        if (payload && typeof payload === 'object') {
            if (typeof payload.message === 'string' && payload.message.trim()) {
                const parsed = parseStructuredValidationString(payload.message) ?? payload.message;
                return normalizeOperationalError(parsed);
            }
            if (Array.isArray(payload.message) && payload.message.length > 0) {
                const first = payload.message[0];
                if (typeof first === 'string' && first.trim()) {
                    return normalizeOperationalError(first);
                }
                if (first && typeof first === 'object' && typeof first.message === 'string' && first.message.trim()) {
                    if (Array.isArray(first.path) && first.path.length > 0) {
                        return normalizeOperationalError(`${first.path.join('.')}: ${first.message}`);
                    }
                    return normalizeOperationalError(first.message);
                }
            }
            const detailsMessage = formatDetails(payload.details);
            if (detailsMessage) {
                return normalizeOperationalError(detailsMessage);
            }
            if (typeof payload.error === 'string' && payload.error.trim()) {
                return normalizeOperationalError(payload.error);
            }
        }

        if (typeof error.message === 'string' && error.message.trim()) {
            return normalizeOperationalError(error.message);
        }
    }

    if (error instanceof Error && error.message.trim()) {
        return normalizeOperationalError(error.message);
    }

    return normalizeOperationalError(fallback);
}
