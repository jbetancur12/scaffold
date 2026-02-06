import { Migration } from '@mikro-orm/migrations';

export class Migration20260206023005 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "purchase_order" ("id" varchar(255) not null, "supplier_id" uuid not null, "order_date" timestamptz not null, "expected_delivery_date" timestamptz null, "received_date" timestamptz null, "status" text check ("status" in ('PENDING', 'CONFIRMED', 'RECEIVED', 'CANCELLED')) not null default 'PENDING', "total_amount" numeric(10,2) not null default 0, "notes" varchar(255) null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "purchase_order_pkey" primary key ("id"));`);

    this.addSql(`create table "purchase_order_item" ("id" varchar(255) not null, "purchase_order_id" varchar(255) not null, "raw_material_id" uuid not null, "quantity" numeric(10,2) not null, "unit_price" numeric(10,2) not null, "subtotal" numeric(10,2) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "purchase_order_item_pkey" primary key ("id"));`);

    this.addSql(`alter table "purchase_order" add constraint "purchase_order_supplier_id_foreign" foreign key ("supplier_id") references "supplier" ("id") on update cascade;`);

    this.addSql(`alter table "purchase_order_item" add constraint "purchase_order_item_purchase_order_id_foreign" foreign key ("purchase_order_id") references "purchase_order" ("id") on update cascade;`);
    this.addSql(`alter table "purchase_order_item" add constraint "purchase_order_item_raw_material_id_foreign" foreign key ("raw_material_id") references "raw_material" ("id") on update cascade;`);

    this.addSql(`alter table "raw_material" add column "average_cost" numeric(10,2) not null default 0;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "purchase_order_item" drop constraint "purchase_order_item_purchase_order_id_foreign";`);

    this.addSql(`drop table if exists "purchase_order" cascade;`);

    this.addSql(`drop table if exists "purchase_order_item" cascade;`);

    this.addSql(`alter table "raw_material" drop column "average_cost";`);
  }

}
