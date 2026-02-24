import { Migration } from '@mikro-orm/migrations';

export class Migration20260224122000_AddOperationModeToOperationalConfig extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table if exists "operational_config"
                add column if not exists "operation_mode" varchar(20) null;
        `);
        this.addSql(`
            update "operational_config"
            set "operation_mode" = 'lote'
            where "operation_mode" is null;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table if exists "operational_config"
                drop column if exists "operation_mode";
        `);
    }
}

