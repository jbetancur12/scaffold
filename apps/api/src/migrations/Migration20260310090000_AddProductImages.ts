import { Migration } from '@mikro-orm/migrations';

export class Migration20260310090000_AddProductImages extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "product_image" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "product_id" uuid not null, "file_name" varchar(255) not null, "file_mime" varchar(255) not null, "file_path" text not null, "sort_order" int not null default 0, constraint "product_image_pkey" primary key ("id"));`);
    this.addSql(`create index "product_image_product_id_index" on "product_image" ("product_id");`);
    this.addSql(`alter table "product_image" add constraint "product_image_product_id_foreign" foreign key ("product_id") references "product" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_image" cascade;`);
  }

}
