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
    success: <T>(res: any, data: T, message: string = 'Success', statusCode: number = 200) => {
        return res.status(statusCode).json({
            success: true,
            message,
            data
        });
    },

    error: (res: any, message: string = 'Error', statusCode: number = 500, errorCode?: string) => {
        return res.status(statusCode).json({
            success: false,
            message,
            errorCode
        });
    },

    pagination: <T>(res: any, items: T[], total: number, page: number, limit: number, message: string = 'Success') => {
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
