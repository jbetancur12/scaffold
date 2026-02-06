import { Migration } from '@mikro-orm/migrations';

export class Migration20260206025304 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "supplier_material" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "supplier_id" uuid not null, "raw_material_id" uuid not null, "last_purchase_price" numeric(10,2) not null default 0, "last_purchase_date" timestamptz not null, constraint "supplier_material_pkey" primary key ("id"));`);

    this.addSql(`alter table "supplier_material" add constraint "supplier_material_supplier_id_foreign" foreign key ("supplier_id") references "supplier" ("id") on update cascade;`);
    this.addSql(`alter table "supplier_material" add constraint "supplier_material_raw_material_id_foreign" foreign key ("raw_material_id") references "raw_material" ("id") on update cascade;`);

    this.addSql(`alter table "product_variant" add column "reference_cost" int not null default 0;`);

    this.addSql(`alter table "raw_material" add column "last_purchase_price" numeric(10,2) null, add column "last_purchase_date" timestamptz null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "supplier_material" cascade;`);

    this.addSql(`alter table "product_variant" drop column "reference_cost";`);

    this.addSql(`alter table "raw_material" drop column "last_purchase_price", drop column "last_purchase_date";`);
  }

}
