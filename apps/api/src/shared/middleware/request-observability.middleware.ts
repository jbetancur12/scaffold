import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { winstonLogger } from '../../config/logger';
import { observabilityService } from '../services/observability.service';

const nowMs = () => Number(process.hrtime.bigint()) / 1_000_000;

export const requestObservabilityMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const requestId = req.header('x-request-id') || randomUUID();
    const startMs = nowMs();
    res.setHeader('x-request-id', requestId);
    res.locals.requestId = requestId;

    res.on('finish', () => {
        const durationMs = Number((nowMs() - startMs).toFixed(2));
        const path = req.originalUrl || req.path;
        const statusCode = res.statusCode;

        observabilityService.recordRequest(req.method, path, statusCode, durationMs);

        const base = {
            requestId,
            method: req.method,
            path,
            statusCode,
            durationMs,
            userAgent: req.get('user-agent'),
            ip: req.ip,
        };

        if (statusCode >= 500) {
            winstonLogger.error('HTTP Request Completed', base);
        } else if (statusCode >= 400) {
            winstonLogger.warn('HTTP Request Completed', base);
        } else {
            winstonLogger.info('HTTP Request Completed', base);
        }
    });

    next();
};
