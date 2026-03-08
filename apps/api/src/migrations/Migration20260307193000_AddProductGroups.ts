import { Migration } from '@mikro-orm/migrations';

export class Migration20260307193000_AddProductGroups extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "product_group" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "name" varchar(255) not null, "slug" varchar(255) not null, "description" text null, "parent_id" uuid null, "sort_order" int not null default 0, "active" boolean not null default true, constraint "product_group_pkey" primary key ("id"));`);
    this.addSql(`alter table "product_group" add constraint "product_group_slug_unique" unique ("slug");`);
    this.addSql(`alter table "product_group" add constraint "product_group_parent_id_foreign" foreign key ("parent_id") references "product_group" ("id") on update cascade on delete set null;`);

    this.addSql(`update "product" set "category_id" = null where "category_id" is not null and ("category_id" = '' or "category_id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$');`);
    this.addSql(`alter table "product" alter column "category_id" type uuid using (case when "category_id" is null or "category_id" = '' then null else "category_id"::uuid end);`);
    this.addSql(`alter table "product" add constraint "product_category_id_foreign" foreign key ("category_id") references "product_group" ("id") on update cascade on delete set null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "product" drop constraint if exists "product_category_id_foreign";`);
    this.addSql(`alter table "product" alter column "category_id" type varchar(255) using ("category_id"::text);`);

    this.addSql(`alter table "product_group" drop constraint if exists "product_group_parent_id_foreign";`);
    this.addSql(`drop table if exists "product_group" cascade;`);
  }

}
