import { MikroORM } from '@mikro-orm/core';
import config from '../mikro-orm.config';

(async () => {
    try {
        console.log('🐘 Initializing MikroORM for migration...');
        const orm = await MikroORM.init(config);

        console.log('🔄 Running migrations...');
        const migrator = orm.getMigrator();
        await migrator.up();

        console.log('✅ Migrations completed successfully');
        await orm.close(true);
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
})();
