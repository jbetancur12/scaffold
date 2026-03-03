import 'dotenv/config'; // Asegura cargar variables de entorno si no están inyectadas
import { MikroORM } from '@mikro-orm/core';
import config from '../mikro-orm.config';

const hasExistingSchemaWithoutMigrationHistory = async (orm: MikroORM) => {
    const rows = await orm.em.getConnection().execute<{
        table_name: string;
    }[]>(`
        select table_name
        from information_schema.tables
        where table_schema = 'public'
          and table_type = 'BASE TABLE'
          and table_name <> 'mikro_orm_migrations';
    `);
    return rows.length > 0;
};

(async () => {
    console.log('🚀 Starting production migration...');
    const orm = await MikroORM.init(config);

    try {
        const migrator = orm.getMigrator();
        const storage = migrator.getStorage();
        if (storage.ensureTable) {
            await storage.ensureTable();
        }

        let pending = await migrator.getPendingMigrations();
        const executed = await migrator.getExecutedMigrations();
        console.log(`📂 Found ${pending.length} pending migrations (${executed.length} executed).`);

        // Safety for legacy environments:
        // If schema already exists but migration history is empty, mark current files as executed (baseline).
        if (pending.length > 0 && executed.length === 0) {
            const hasLegacySchema = await hasExistingSchemaWithoutMigrationHistory(orm);
            if (hasLegacySchema) {
                console.warn('⚠️ Detected existing schema without migration history. Applying baseline...');
                for (const migration of pending) {
                    await storage.logMigration({ name: migration.name, context: null });
                }
                pending = await migrator.getPendingMigrations();
                console.log(`📂 Pending migrations after baseline: ${pending.length}.`);
            }
        }

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
