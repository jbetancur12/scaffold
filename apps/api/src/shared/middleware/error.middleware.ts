import { Request, Response, NextFunction } from 'express';
import { winstonLogger } from '../../config/logger';
import { AppError } from '../utils/response';
import { ZodError } from 'zod';

export const errorHandler = (
    err: unknown,
    req: Request,
    res: Response,
    _next: NextFunction
) => {
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
    const message = (err instanceof Error) ? err.message : 'Internal Server Error';
    const stack = (err instanceof Error) ? err.stack : undefined;
    const errorCode = (err instanceof AppError) ? err.errorCode : undefined;

    // Log the error
    winstonLogger.error(`[${req.method}] ${req.path} >> ${statusCode} - ${message}`, {
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
        ...(process.env.NODE_ENV !== 'production' && { stack })
    });
};

/**
 * Wrapper to catch async errors in controllers
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
