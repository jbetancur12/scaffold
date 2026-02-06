import { Migration } from '@mikro-orm/migrations';

export class Migration20260206003719_MRP_Init extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "product" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "name" varchar(255) not null, "description" varchar(255) null, "sku" varchar(255) not null, "category_id" varchar(255) null, constraint "product_pkey" primary key ("id"));`);
    this.addSql(`alter table "product" add constraint "product_sku_unique" unique ("sku");`);

    this.addSql(`create table "production_order" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "code" varchar(255) not null, "status" text check ("status" in ('draft', 'planned', 'in_progress', 'completed', 'cancelled')) not null default 'draft', "start_date" timestamptz null, "end_date" timestamptz null, "notes" varchar(255) null, constraint "production_order_pkey" primary key ("id"));`);

    this.addSql(`create table "product_variant" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "product_id" uuid not null, "name" varchar(255) not null, "sku" varchar(255) not null, "price" int not null, "cost" int not null default 0, "labor_cost" int not null default 0, "indirect_cost" int not null default 0, constraint "product_variant_pkey" primary key ("id"));`);

    this.addSql(`create table "production_order_item" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "production_order_id" uuid not null, "variant_id" uuid not null, "quantity" int not null, constraint "production_order_item_pkey" primary key ("id"));`);

    this.addSql(`create table "supplier" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "name" varchar(255) not null, "contact_name" varchar(255) null, "email" varchar(255) null, "phone" varchar(255) null, "address" varchar(255) null, constraint "supplier_pkey" primary key ("id"));`);

    this.addSql(`create table "raw_material" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "name" varchar(255) not null, "sku" varchar(255) not null, "unit" text check ("unit" in ('unit', 'kg', 'liter', 'meter')) not null, "cost" int not null, "min_stock_level" int null, "supplier_id" uuid null, constraint "raw_material_pkey" primary key ("id"));`);
    this.addSql(`alter table "raw_material" add constraint "raw_material_sku_unique" unique ("sku");`);

    this.addSql(`create table "bomitem" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "variant_id" uuid not null, "raw_material_id" uuid not null, "quantity" int not null, constraint "bomitem_pkey" primary key ("id"));`);

    this.addSql(`create table "purchase_record" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "raw_material_id" uuid not null, "supplier_id" uuid not null, "price" int not null, "date" timestamptz not null, constraint "purchase_record_pkey" primary key ("id"));`);

    this.addSql(`create table "warehouse" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "name" varchar(255) not null, "location" varchar(255) null, "type" text check ("type" in ('raw_materials', 'finished_goods', 'quarantine', 'other')) not null, constraint "warehouse_pkey" primary key ("id"));`);

    this.addSql(`create table "inventory_item" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "warehouse_id" uuid not null, "raw_material_id" uuid null, "variant_id" uuid null, "quantity" int not null, "last_updated" timestamptz not null, constraint "inventory_item_pkey" primary key ("id"));`);

    this.addSql(`alter table "product_variant" add constraint "product_variant_product_id_foreign" foreign key ("product_id") references "product" ("id") on update cascade;`);

    this.addSql(`alter table "production_order_item" add constraint "production_order_item_production_order_id_foreign" foreign key ("production_order_id") references "production_order" ("id") on update cascade;`);
    this.addSql(`alter table "production_order_item" add constraint "production_order_item_variant_id_foreign" foreign key ("variant_id") references "product_variant" ("id") on update cascade;`);

    this.addSql(`alter table "raw_material" add constraint "raw_material_supplier_id_foreign" foreign key ("supplier_id") references "supplier" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "bomitem" add constraint "bomitem_variant_id_foreign" foreign key ("variant_id") references "product_variant" ("id") on update cascade;`);
    this.addSql(`alter table "bomitem" add constraint "bomitem_raw_material_id_foreign" foreign key ("raw_material_id") references "raw_material" ("id") on update cascade;`);

    this.addSql(`alter table "purchase_record" add constraint "purchase_record_raw_material_id_foreign" foreign key ("raw_material_id") references "raw_material" ("id") on update cascade;`);
    this.addSql(`alter table "purchase_record" add constraint "purchase_record_supplier_id_foreign" foreign key ("supplier_id") references "supplier" ("id") on update cascade;`);

    this.addSql(`alter table "inventory_item" add constraint "inventory_item_warehouse_id_foreign" foreign key ("warehouse_id") references "warehouse" ("id") on update cascade;`);
    this.addSql(`alter table "inventory_item" add constraint "inventory_item_raw_material_id_foreign" foreign key ("raw_material_id") references "raw_material" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "inventory_item" add constraint "inventory_item_variant_id_foreign" foreign key ("variant_id") references "product_variant" ("id") on update cascade on delete set null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "product_variant" drop constraint "product_variant_product_id_foreign";`);

    this.addSql(`alter table "production_order_item" drop constraint "production_order_item_production_order_id_foreign";`);

    this.addSql(`alter table "production_order_item" drop constraint "production_order_item_variant_id_foreign";`);

    this.addSql(`alter table "bomitem" drop constraint "bomitem_variant_id_foreign";`);

    this.addSql(`alter table "inventory_item" drop constraint "inventory_item_variant_id_foreign";`);

    this.addSql(`alter table "raw_material" drop constraint "raw_material_supplier_id_foreign";`);

    this.addSql(`alter table "purchase_record" drop constraint "purchase_record_supplier_id_foreign";`);

    this.addSql(`alter table "bomitem" drop constraint "bomitem_raw_material_id_foreign";`);

    this.addSql(`alter table "purchase_record" drop constraint "purchase_record_raw_material_id_foreign";`);

    this.addSql(`alter table "inventory_item" drop constraint "inventory_item_raw_material_id_foreign";`);

    this.addSql(`alter table "inventory_item" drop constraint "inventory_item_warehouse_id_foreign";`);

    this.addSql(`drop table if exists "product" cascade;`);

    this.addSql(`drop table if exists "production_order" cascade;`);

    this.addSql(`drop table if exists "product_variant" cascade;`);

    this.addSql(`drop table if exists "production_order_item" cascade;`);

    this.addSql(`drop table if exists "supplier" cascade;`);

    this.addSql(`drop table if exists "raw_material" cascade;`);

    this.addSql(`drop table if exists "bomitem" cascade;`);

    this.addSql(`drop table if exists "purchase_record" cascade;`);

    this.addSql(`drop table if exists "warehouse" cascade;`);

    this.addSql(`drop table if exists "inventory_item" cascade;`);
  }

}
