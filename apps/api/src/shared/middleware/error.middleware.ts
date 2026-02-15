import { Request, Response, NextFunction } from 'express';
import { winstonLogger } from '../../config/logger';
import { AppError } from '../utils/response';
import { ZodError } from 'zod';

type ValidationIssue = {
    path: string;
    message: string;
};

const formatZodIssues = (error: ZodError): ValidationIssue[] =>
    error.errors.map((issue) => ({
        path: issue.path.length > 0 ? issue.path.join('.') : 'request',
        message: issue.message,
    }));

export const errorHandler = (
    err: unknown,
    req: Request,
    res: Response,
    _next: NextFunction
) => {
    const requestId = res.locals.requestId || req.header('x-request-id');
    const isKnownNotFound = err instanceof Error && err.name === 'NotFoundError';
    const isKnownValidation = err instanceof ZodError
        || (err instanceof Error && (err.name === 'ValidationError' || err.name === 'SyntaxError'));
    const isUniqueConstraint =
        err instanceof Error
        && (err.name === 'UniqueConstraintViolationException' || err.name === 'UniqueConstraintViolationError');

    const statusCode = err instanceof AppError
        ? err.statusCode
        : isKnownNotFound
            ? 404
            : isKnownValidation
                ? 400
                : isUniqueConstraint
                    ? 409
                    : 500;
    const validationIssues = err instanceof ZodError ? formatZodIssues(err) : undefined;
    const message = (() => {
        if (err instanceof ZodError) {
            const first = validationIssues?.[0];
            return first ? `Validación fallida en ${first.path}: ${first.message}` : 'Validación fallida';
        }
        if (err instanceof Error && err.name === 'SyntaxError' && statusCode === 400) {
            return 'JSON inválido en la solicitud';
        }
        return (err instanceof Error) ? err.message : 'Internal Server Error';
    })();
    const stack = (err instanceof Error) ? err.stack : undefined;
    const errorCode = (err instanceof AppError) ? err.errorCode : undefined;

    // Log the error
    winstonLogger.error(`[${req.method}] ${req.path} >> ${statusCode} - ${message}`, {
        requestId,
        stack,
        body: req.body,
        query: req.query
    });

    res.status(statusCode).json({
        success: false,
        message: statusCode === 500 && process.env.NODE_ENV === 'production'
            ? 'Something went wrong on our end'
            : message,
        errorCode,
        requestId,
        ...(validationIssues && { details: validationIssues }),
        ...(process.env.NODE_ENV !== 'production' && { stack })
    });
};

/**
 * Wrapper to catch async errors in controllers
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
