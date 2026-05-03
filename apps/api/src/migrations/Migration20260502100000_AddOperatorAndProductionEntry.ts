import { Migration } from '@mikro-orm/migrations';

export class Migration20260502100000_AddOperatorAndProductionEntry extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table if not exists "operator" (
                "id" uuid not null default gen_random_uuid(),
                "created_at" timestamptz not null default now(),
                "updated_at" timestamptz not null default now(),
                "deleted_at" timestamptz null,
                "name" varchar(255) not null,
                "code" varchar(255) null,
                "active" boolean not null default true,
                constraint "operator_pkey" primary key ("id")
            );
            create unique index if not exists "operator_code_unique" on "operator" ("code") where "deleted_at" is null and "code" is not null;
        `);

        this.addSql(`
            create table if not exists "production_entry" (
                "id" uuid not null default gen_random_uuid(),
                "created_at" timestamptz not null default now(),
                "updated_at" timestamptz not null default now(),
                "deleted_at" timestamptz null,
                "entry_date" date not null,
                "operator_id" uuid not null,
                "production_order_item_id" uuid not null,
                "variant_id" uuid not null,
                "quantity" numeric(12, 3) not null,
                "notes" text null,
                constraint "production_entry_pkey" primary key ("id"),
                constraint "production_entry_operator_id_foreign" foreign key ("operator_id") references "operator" ("id") on delete cascade,
                constraint "production_entry_item_id_foreign" foreign key ("production_order_item_id") references "production_order_item" ("id") on delete cascade,
                constraint "production_entry_variant_id_foreign" foreign key ("variant_id") references "product_variant" ("id") on delete cascade
            );
            create index if not exists "production_entry_operator_id_index" on "production_entry" ("operator_id");
            create index if not exists "production_entry_variant_id_index" on "production_entry" ("variant_id");
            create index if not exists "production_entry_entry_date_index" on "production_entry" ("entry_date");
            create index if not exists "production_entry_item_id_index" on "production_entry" ("production_order_item_id");
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "production_entry" cascade;`);
        this.addSql(`drop table if exists "operator" cascade;`);
        this.addSql(`alter table "production_order_item" drop column if exists "produced_quantity";`);
    }
}
