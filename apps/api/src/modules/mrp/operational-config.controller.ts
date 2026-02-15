import { Request, Response, NextFunction } from 'express';
import { OperationalConfigService } from './services/operational-config.service';
import { OperationalConfigSchema } from '@scaffold/schemas';
import { ApiResponse } from '../../shared/utils/response';

export class OperationalConfigController {
    constructor(private readonly configService: OperationalConfigService) { }

    async getConfig(_req: Request, res: Response, next: NextFunction) {
        try {
            const config = await this.configService.getConfig();
            return ApiResponse.success(res, config);
        } catch (error) {
            next(error);
        }
    }

    async updateConfig(req: Request, res: Response, next: NextFunction) {
        try {
            const data = OperationalConfigSchema.parse(req.body);
            const config = await this.configService.updateConfig(data);
            return ApiResponse.success(res, config, 'Configuración actualizada');
        } catch (error) {
            next(error);
        }
    }
}
