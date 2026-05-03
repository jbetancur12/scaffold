import { Migration } from '@mikro-orm/migrations';

export class Migration20260502110000_AddProductionOrderItemToProductionEntry extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table "production_entry"
            add column if not exists "production_order_item_id" uuid;
        `);
        this.addSql(`
            alter table "production_entry"
            add constraint "production_entry_production_order_item_id_fk" foreign key ("production_order_item_id") references "production_order_item" ("id") on delete cascade;
        `);
        this.addSql(`
            create index if not exists "production_entry_production_order_item_id_index" on "production_entry" ("production_order_item_id");
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table "production_entry" drop constraint if exists "production_entry_production_order_item_id_fk";
            alter table "production_entry" drop column if exists "production_order_item_id";
            drop index if exists "production_entry_production_order_item_id_index";
        `);
    }
}
