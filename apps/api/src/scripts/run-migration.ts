import 'dotenv/config'; // Asegura cargar variables de entorno si no están inyectadas
import { MikroORM } from '@mikro-orm/core';
import config from '../mikro-orm.config';

(async () => {
    console.log('🚀 Starting production migration...');
    const orm = await MikroORM.init(config);

    try {
        const migrator = orm.getMigrator();

        // Verifica migraciones pendientes
        const pending = await migrator.getPendingMigrations();
        console.log(`📂 Found ${pending.length} pending migrations.`);

        if (pending.length > 0) {
            await migrator.up();
            console.log('✅ Migrations executed successfully.');
        } else {
            console.log('✨ No migrations pending.');
        }
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await orm.close(true);
    }
})();