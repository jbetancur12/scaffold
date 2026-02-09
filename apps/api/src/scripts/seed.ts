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

        // 2. Transferencista/Minorista (andreinacampos0510@gmail.com)
        const userEmail = 'andreinacampos0510@gmail.com';
        const existingUser = await em.findOne(User, { email: userEmail });

        if (!existingUser) {
            const user = new User();
            user.email = userEmail;
            user.password = password;
            user.role = UserRole.ADMIN; // Assuming Admin for Transferencista based on context
            em.persist(user);
            winstonLogger.info(`✅ Created User: ${userEmail}`);
        } else {
            winstonLogger.info(`User ${userEmail} already exists`);
        }

        // 3. Fallback Local Superadmin (admin@scaffold.local)
        // Keep this for local dev convenience if needed, or remove. keeping for safety.
        const localAdminEmail = 'admin@scaffold.local';
        const existingLocalAdmin = await em.findOne(User, { email: localAdminEmail });

        if (!existingLocalAdmin) {
            const localAdmin = new User();
            localAdmin.email = localAdminEmail;
            localAdmin.password = await argon2.hash('Admin123!');
            localAdmin.role = UserRole.SUPERADMIN;
            em.persist(localAdmin);
            winstonLogger.info(`✅ Created Local Admin: ${localAdminEmail}`);
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
