import { Migration } from '@mikro-orm/migrations';

export class Migration20260223152000_AddPurchaseOrderFreeItems extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table if exists "purchase_order_item"
                add column if not exists "is_catalog_item" boolean not null default true,
                add column if not exists "custom_description" varchar(255) null,
                add column if not exists "custom_unit" varchar(64) null,
                add column if not exists "is_inventoriable" boolean not null default true;
        `);

        this.addSql('alter table if exists "purchase_order_item" alter column "raw_material_id" drop not null;');
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table if exists "purchase_order_item"
                drop column if exists "is_catalog_item",
                drop column if exists "custom_description",
                drop column if exists "custom_unit",
                drop column if exists "is_inventoriable";
        `);

        this.addSql('alter table if exists "purchase_order_item" alter column "raw_material_id" set not null;');
    }
}
