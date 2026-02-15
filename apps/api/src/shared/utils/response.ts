import { Response } from 'express';

export class AppError extends Error {
    constructor(
        public message: string,
        public statusCode: number = 400,
        public errorCode?: string
    ) {
        super(message);
        this.name = 'AppError';
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export const ApiResponse = {
    result: <T>(res: Response, success: boolean, data: T, message: string, statusCode: number) => {
        return res.status(statusCode).json({
            success,
            message,
            data
        });
    },

    success: <T>(res: Response, data: T, message: string = 'Success', statusCode: number = 200) => {
        return res.status(statusCode).json({
            success: true,
            message,
            data
        });
    },

    error: (res: Response, message: string = 'Error', statusCode: number = 500, errorCode?: string) => {
        return res.status(statusCode).json({
            success: false,
            message,
            errorCode
        });
    },

    pagination: <T>(res: Response, items: T[], total: number, page: number, limit: number, message: string = 'Success') => {
        return res.status(200).json({
            success: true,
            message,
            data: {
                items,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    }
};
