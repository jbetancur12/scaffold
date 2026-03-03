import { Migration } from '@mikro-orm/migrations';

export class Migration20260303061000_AddGlobalDiscountToQuotation extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table if exists "quotation"
                add column if not exists "global_discount_percent" numeric(6,2) not null default 0;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table if exists "quotation"
                drop column if exists "global_discount_percent";
        `);
    }
}
