import { EventEmitter } from 'events';
import { winstonLogger } from '../../config/logger';

class AppEventEmitter extends EventEmitter {
    constructor() {
        super();
        this.setupErrorHandling();
    }

    private setupErrorHandling() {
        this.on('error', (error) => {
            winstonLogger.error('Unhandled internal event error:', error);
        });
    }

    /**
     * Generalized emit with logging
     */
    emitSafe(event: string, ...args: unknown[]): boolean {
        try {
            return this.emit(event, ...args);
        } catch (error) {
            winstonLogger.error(`Error emitting event ${event}:`, error);
            return false;
        }
    }
}

export const eventEmitter = new AppEventEmitter();

// Event Constants for type-safety (conceptual)
export const APP_EVENTS = {
    USER_REGISTERED: 'user.registered',
    USER_LOGGED_IN: 'user.login',
    PASSWORD_CHANGED: 'user.password_changed',
};
