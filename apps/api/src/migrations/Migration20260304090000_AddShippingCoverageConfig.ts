import { Migration } from '@mikro-orm/migrations';

export class Migration20260304090000_AddShippingCoverageConfig extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table if exists "operational_config"
                add column if not exists "shipping_order_coverage_threshold" integer not null default 0,
                add column if not exists "shipping_coverage_limit_full" integer not null default 0,
                add column if not exists "shipping_coverage_limit_shared" integer not null default 0;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table if exists "operational_config"
                drop column if exists "shipping_coverage_limit_shared",
                drop column if exists "shipping_coverage_limit_full",
                drop column if exists "shipping_order_coverage_threshold";
        `);
    }
}
