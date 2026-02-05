import { Request, Response, NextFunction } from 'express';
import { winstonLogger } from '../../config/logger';
import { AppError } from '../utils/response';

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    _next: NextFunction
) => {
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const message = err.message || 'Internal Server Error';

    // Log the error
    winstonLogger.error(`[${req.method}] ${req.path} >> ${statusCode} - ${message}`, {
        stack: err.stack,
        body: req.body,
        query: req.query
    });

    res.status(statusCode).json({
        success: false,
        message: statusCode === 500 && process.env.NODE_ENV === 'production'
            ? 'Something went wrong on our end'
            : message,
        errorCode: err.errorCode,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
};

/**
 * Wrapper to catch async errors in controllers
 */
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
