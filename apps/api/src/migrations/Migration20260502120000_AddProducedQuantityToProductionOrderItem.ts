import { Migration } from '@mikro-orm/migrations';

export class Migration20260502120000_AddProducedQuantityToProductionOrderItem extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table "production_order_item"
            add column if not exists "produced_quantity" numeric(12, 3) not null default 0;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table "production_order_item" drop column if exists "produced_quantity";
        `);
    }
}
