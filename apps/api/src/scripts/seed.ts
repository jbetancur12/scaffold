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
        const password = await argon2.hash('12345678');

        // 1. Superadmin (jabetancur12@gmail.com)
        const superadminEmail = 'jabetancur12@gmail.com';
        const existingSuperadmin = await em.findOne(User, { email: superadminEmail });

        if (!existingSuperadmin) {
            const superadmin = new User();
            superadmin.email = superadminEmail;
            superadmin.password = password;
            superadmin.role = UserRole.SUPERADMIN;
            em.persist(superadmin);
            winstonLogger.info(`✅ Created Superadmin: ${superadminEmail}`);
        } else {
            winstonLogger.info(`Superadmin ${superadminEmail} already exists`);
        }


        await em.flush();

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
