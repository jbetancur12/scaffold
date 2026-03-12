import { Migration } from '@mikro-orm/migrations';

export class Migration20260312093000_AddPriceListConfig extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "price_list_config" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null, "updated_at" timestamptz not null, "show_cover" boolean not null default true, "header_title" varchar(255) null, "header_subtitle" varchar(255) null, "intro_text" text null, "sections" jsonb null, constraint "price_list_config_pkey" primary key ("id"));`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "price_list_config";`);
  }

}
