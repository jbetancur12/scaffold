import 'dotenv/config';
import { MikroORM } from '@mikro-orm/core';
import * as argon2 from 'argon2';
import config from '../mikro-orm.config';
import { User } from '../modules/user/user.entity';
import { UserRole } from '@scaffold/types';
import { winstonLogger } from '../config/logger';

async function seed() {
    const orm = await MikroORM.init(config);
    const em = orm.em.fork();

    try {
        // Check if superadmin already exists
        const existingSuperadmin = await em.findOne(User, {
            email: 'admin@scaffold.local'
        });

        if (existingSuperadmin) {
            winstonLogger.info('Superadmin already exists, skipping seed');
            await orm.close();
            return;
        }

        // Create superadmin user
        const hashedPassword = await argon2.hash('Admin123!');

        const superadmin = new User();
        superadmin.email = 'admin@scaffold.local';
        superadmin.password = hashedPassword;
        superadmin.role = UserRole.SUPERADMIN;

        await em.persistAndFlush(superadmin);

        winstonLogger.info('✅ Superadmin user created successfully');
        winstonLogger.info('Email: admin@scaffold.local');
        winstonLogger.info('Password: Admin123!');

    } catch (error) {
        winstonLogger.error('Error seeding database:', error);
        throw error;
    } finally {
        await orm.close();
    }
}

seed()
    .then(() => {
        winstonLogger.info('Seed completed');
        process.exit(0);
    })
    .catch((error) => {
        winstonLogger.error('Seed failed:', error);
        process.exit(1);
    });
