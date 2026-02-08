import { Request, Response, NextFunction } from 'express';
import { OperationalConfigService } from './services/operational-config.service';
import { OperationalConfigSchema } from '@scaffold/schemas';

export class OperationalConfigController {
    constructor(private readonly configService: OperationalConfigService) { }

    async getConfig(_req: Request, res: Response, next: NextFunction) {
        try {
            const config = await this.configService.getConfig();
            res.json(config);
        } catch (error) {
            next(error);
        }
    }

    async updateConfig(req: Request, res: Response, next: NextFunction) {
        try {
            const data = OperationalConfigSchema.parse(req.body);
            const config = await this.configService.updateConfig(data);
            res.json(config);
        } catch (error) {
            next(error);
        }
    }
}
