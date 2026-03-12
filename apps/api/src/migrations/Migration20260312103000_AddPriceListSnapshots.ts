import { Migration } from '@mikro-orm/migrations';

export class Migration20260312103000_AddPriceListSnapshots extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "price_list_snapshot" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "month" varchar(10) not null, "version" int not null, "config_snapshot" jsonb not null, "items" jsonb not null, "source" varchar(20) null, constraint "price_list_snapshot_pkey" primary key ("id"));`);
    this.addSql(`create index if not exists "price_list_snapshot_month_idx" on "price_list_snapshot" ("month");`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "price_list_snapshot";`);
  }

}
