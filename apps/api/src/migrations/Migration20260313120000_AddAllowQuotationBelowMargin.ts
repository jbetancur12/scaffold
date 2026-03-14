import { Migration } from '@mikro-orm/migrations';

export class Migration20260313120000_AddAllowQuotationBelowMargin extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table "operational_config"
            add column if not exists "allow_quotation_below_margin" boolean not null default false;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "operational_config" drop column if exists "allow_quotation_below_margin";`);
    }
}
