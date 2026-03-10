import { Migration } from '@mikro-orm/migrations';

export class Migration20260309110000_AddCancellationSettlementData extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table "sales_order"
            add column if not exists "cancellation_settlement" jsonb null;
        `);
        this.addSql(`
            alter table "production_order"
            add column if not exists "cancellation_settlement" jsonb null;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table "production_order"
            drop column if exists "cancellation_settlement";
        `);
        this.addSql(`
            alter table "sales_order"
            drop column if exists "cancellation_settlement";
        `);
    }
}
