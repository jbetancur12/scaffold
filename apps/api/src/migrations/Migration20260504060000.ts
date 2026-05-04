import { Migration } from '@mikro-orm/migrations';

export class Migration20260504060000 extends Migration {

    override async up(): Promise<void> {
        this.addSql(`alter table "supplier" add column if not exists "retention_at_source" boolean default false`);
        this.addSql(`alter table "supplier" add column if not exists "retention_iva" boolean default false`);
        this.addSql(`alter table "purchase_order" add column if not exists "retention_iva_amount" numeric(10,2) not null default 0`);
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "purchase_order" drop column if exists "retention_iva_amount"`);
        this.addSql(`alter table "supplier" drop column if exists "retention_iva"`);
        this.addSql(`alter table "supplier" drop column if exists "retention_at_source"`);
    }

}
