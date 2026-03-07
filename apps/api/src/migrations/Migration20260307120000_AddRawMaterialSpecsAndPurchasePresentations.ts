import { Migration } from '@mikro-orm/migrations';

export class Migration20260307120000_AddRawMaterialSpecsAndPurchasePresentations extends Migration {
    override async up(): Promise<void> {
        this.addSql(`alter table "raw_material" drop constraint if exists "raw_material_unit_check";`);
        this.addSql(`alter table "raw_material" add constraint "raw_material_unit_check" check ("unit" in ('unidad', 'kg', 'litro', 'metro', 'yarda'));`);

        this.addSql(`
            create table if not exists "raw_material_specification" (
                "id" uuid not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "deleted_at" timestamptz null,
                "raw_material_id" uuid not null,
                "name" varchar(255) not null,
                "sku" varchar(255) not null,
                "description" text null,
                "color" varchar(255) null,
                "width_cm" numeric(10,2) null,
                "length_value" numeric(10,4) null,
                "length_unit" varchar(255) null,
                "thickness_mm" numeric(10,4) null,
                "grammage_gsm" numeric(10,2) null,
                "is_default" boolean not null default false,
                "notes" text null,
                constraint "raw_material_specification_pkey" primary key ("id")
            );
        `);
        this.addSql(`create unique index if not exists "raw_material_specification_sku_unique" on "raw_material_specification" ("sku");`);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'raw_material_specification_raw_material_id_foreign') then
                    alter table "raw_material_specification"
                    add constraint "raw_material_specification_raw_material_id_foreign"
                    foreign key ("raw_material_id") references "raw_material" ("id") on update cascade on delete cascade;
                end if;
            end $$;
        `);

        this.addSql(`
            create table if not exists "purchase_presentation" (
                "id" uuid not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "deleted_at" timestamptz null,
                "raw_material_id" uuid not null,
                "supplier_id" uuid null,
                "specification_id" uuid null,
                "name" varchar(255) not null,
                "purchase_unit_label" varchar(255) not null,
                "quantity_per_purchase_unit" numeric(12,4) not null,
                "content_unit" varchar(255) not null,
                "allows_fractional_quantity" boolean not null default false,
                "is_default" boolean not null default false,
                "notes" text null,
                constraint "purchase_presentation_pkey" primary key ("id")
            );
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'purchase_presentation_raw_material_id_foreign') then
                    alter table "purchase_presentation"
                    add constraint "purchase_presentation_raw_material_id_foreign"
                    foreign key ("raw_material_id") references "raw_material" ("id") on update cascade on delete cascade;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'purchase_presentation_supplier_id_foreign') then
                    alter table "purchase_presentation"
                    add constraint "purchase_presentation_supplier_id_foreign"
                    foreign key ("supplier_id") references "supplier" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'purchase_presentation_specification_id_foreign') then
                    alter table "purchase_presentation"
                    add constraint "purchase_presentation_specification_id_foreign"
                    foreign key ("specification_id") references "raw_material_specification" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);

        this.addSql(`alter table "bomitem" add column if not exists "raw_material_specification_id" uuid null;`);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'bomitem_raw_material_specification_id_foreign') then
                    alter table "bomitem"
                    add constraint "bomitem_raw_material_specification_id_foreign"
                    foreign key ("raw_material_specification_id") references "raw_material_specification" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);

        this.addSql(`alter table "inventory_item" add column if not exists "raw_material_specification_id" uuid null;`);
        this.addSql(`alter table "inventory_item" drop constraint if exists "inventory_item_warehouse_raw_material_unique";`);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'inventory_item_raw_material_specification_id_foreign') then
                    alter table "inventory_item"
                    add constraint "inventory_item_raw_material_specification_id_foreign"
                    foreign key ("raw_material_specification_id") references "raw_material_specification" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);
        this.addSql(`create unique index if not exists "inventory_item_warehouse_material_spec_unique" on "inventory_item" ("warehouse_id", "raw_material_id", "raw_material_specification_id");`);

        this.addSql(`alter table "purchase_order_item" add column if not exists "raw_material_specification_id" uuid null;`);
        this.addSql(`alter table "purchase_order_item" add column if not exists "purchase_presentation_id" uuid null;`);
        this.addSql(`alter table "purchase_order_item" add column if not exists "purchase_unit_label" varchar(255) null;`);
        this.addSql(`alter table "purchase_order_item" add column if not exists "inventory_unit" varchar(255) null;`);
        this.addSql(`alter table "purchase_order_item" add column if not exists "inventory_quantity" numeric(12,4) null;`);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'purchase_order_item_raw_material_specification_id_foreign') then
                    alter table "purchase_order_item"
                    add constraint "purchase_order_item_raw_material_specification_id_foreign"
                    foreign key ("raw_material_specification_id") references "raw_material_specification" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'purchase_order_item_purchase_presentation_id_foreign') then
                    alter table "purchase_order_item"
                    add constraint "purchase_order_item_purchase_presentation_id_foreign"
                    foreign key ("purchase_presentation_id") references "purchase_presentation" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);

        this.addSql(`alter table "incoming_inspection" add column if not exists "raw_material_specification_id" uuid null;`);
        this.addSql(`alter table "incoming_inspection" add column if not exists "purchase_presentation_id" uuid null;`);
        this.addSql(`alter table "incoming_inspection" add column if not exists "purchase_unit_label" varchar(255) null;`);
        this.addSql(`alter table "incoming_inspection" add column if not exists "inventory_unit" varchar(255) null;`);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'incoming_inspection_raw_material_specification_id_foreign') then
                    alter table "incoming_inspection"
                    add constraint "incoming_inspection_raw_material_specification_id_foreign"
                    foreign key ("raw_material_specification_id") references "raw_material_specification" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'incoming_inspection_purchase_presentation_id_foreign') then
                    alter table "incoming_inspection"
                    add constraint "incoming_inspection_purchase_presentation_id_foreign"
                    foreign key ("purchase_presentation_id") references "purchase_presentation" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);

        this.addSql(`alter table "raw_material_lot" add column if not exists "raw_material_specification_id" uuid null;`);
        this.addSql(`drop index if exists "raw_material_lot_unique_material_warehouse_supplier_lot";`);
        this.addSql(`drop index if exists "raw_material_lot_material_warehouse_received_idx";`);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'raw_material_lot_raw_material_specification_id_foreign') then
                    alter table "raw_material_lot"
                    add constraint "raw_material_lot_raw_material_specification_id_foreign"
                    foreign key ("raw_material_specification_id") references "raw_material_specification" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);
        this.addSql(`create unique index if not exists "raw_material_lot_unique_material_spec_warehouse_supplier_lot" on "raw_material_lot" ("raw_material_id", "raw_material_specification_id", "warehouse_id", "supplier_lot_code");`);
        this.addSql(`create index if not exists "raw_material_lot_material_spec_warehouse_received_idx" on "raw_material_lot" ("raw_material_id", "raw_material_specification_id", "warehouse_id", "received_at");`);

        this.addSql(`alter table "raw_material_kardex" add column if not exists "raw_material_specification_id" uuid null;`);
        this.addSql(`drop index if exists "raw_material_kardex_material_occurred_idx";`);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'raw_material_kardex_raw_material_specification_id_foreign') then
                    alter table "raw_material_kardex"
                    add constraint "raw_material_kardex_raw_material_specification_id_foreign"
                    foreign key ("raw_material_specification_id") references "raw_material_specification" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);
        this.addSql(`create index if not exists "raw_material_kardex_material_spec_occurred_idx" on "raw_material_kardex" ("raw_material_id", "raw_material_specification_id", "occurred_at");`);
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "raw_material_kardex" drop constraint if exists "raw_material_kardex_raw_material_specification_id_foreign";`);
        this.addSql(`drop index if exists "raw_material_kardex_material_spec_occurred_idx";`);
        this.addSql(`alter table "raw_material_kardex" drop column if exists "raw_material_specification_id";`);
        this.addSql(`create index if not exists "raw_material_kardex_material_occurred_idx" on "raw_material_kardex" ("raw_material_id", "occurred_at");`);

        this.addSql(`alter table "raw_material_lot" drop constraint if exists "raw_material_lot_raw_material_specification_id_foreign";`);
        this.addSql(`drop index if exists "raw_material_lot_unique_material_spec_warehouse_supplier_lot";`);
        this.addSql(`drop index if exists "raw_material_lot_material_spec_warehouse_received_idx";`);
        this.addSql(`alter table "raw_material_lot" drop column if exists "raw_material_specification_id";`);
        this.addSql(`create unique index if not exists "raw_material_lot_unique_material_warehouse_supplier_lot" on "raw_material_lot" ("raw_material_id", "warehouse_id", "supplier_lot_code");`);
        this.addSql(`create index if not exists "raw_material_lot_material_warehouse_received_idx" on "raw_material_lot" ("raw_material_id", "warehouse_id", "received_at");`);

        this.addSql(`alter table "incoming_inspection" drop constraint if exists "incoming_inspection_raw_material_specification_id_foreign";`);
        this.addSql(`alter table "incoming_inspection" drop constraint if exists "incoming_inspection_purchase_presentation_id_foreign";`);
        this.addSql(`alter table "incoming_inspection" drop column if exists "raw_material_specification_id";`);
        this.addSql(`alter table "incoming_inspection" drop column if exists "purchase_presentation_id";`);
        this.addSql(`alter table "incoming_inspection" drop column if exists "purchase_unit_label";`);
        this.addSql(`alter table "incoming_inspection" drop column if exists "inventory_unit";`);

        this.addSql(`alter table "purchase_order_item" drop constraint if exists "purchase_order_item_raw_material_specification_id_foreign";`);
        this.addSql(`alter table "purchase_order_item" drop constraint if exists "purchase_order_item_purchase_presentation_id_foreign";`);
        this.addSql(`alter table "purchase_order_item" drop column if exists "raw_material_specification_id";`);
        this.addSql(`alter table "purchase_order_item" drop column if exists "purchase_presentation_id";`);
        this.addSql(`alter table "purchase_order_item" drop column if exists "purchase_unit_label";`);
        this.addSql(`alter table "purchase_order_item" drop column if exists "inventory_unit";`);
        this.addSql(`alter table "purchase_order_item" drop column if exists "inventory_quantity";`);

        this.addSql(`drop index if exists "inventory_item_warehouse_material_spec_unique";`);
        this.addSql(`alter table "inventory_item" drop constraint if exists "inventory_item_raw_material_specification_id_foreign";`);
        this.addSql(`alter table "inventory_item" drop column if exists "raw_material_specification_id";`);
        this.addSql(`alter table "inventory_item" add constraint "inventory_item_warehouse_raw_material_unique" unique ("warehouse_id", "raw_material_id");`);

        this.addSql(`alter table "bomitem" drop constraint if exists "bomitem_raw_material_specification_id_foreign";`);
        this.addSql(`alter table "bomitem" drop column if exists "raw_material_specification_id";`);

        this.addSql(`drop table if exists "purchase_presentation" cascade;`);
        this.addSql(`drop table if exists "raw_material_specification" cascade;`);

        this.addSql(`alter table "raw_material" drop constraint if exists "raw_material_unit_check";`);
        this.addSql(`alter table "raw_material" add constraint "raw_material_unit_check" check ("unit" in ('unidad', 'kg', 'litro', 'metro'));`);
    }
}
