import { Migration } from '@mikro-orm/migrations';

export class Migration20260322124000_AddPriceSourceToPriceListSnapshot extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "price_list_snapshot" add column if not exists "price_source" varchar(255) not null default 'auto';`);
    this.addSql(`update "price_list_snapshot" set "price_source" = 'auto' where "price_source" is null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "price_list_snapshot" drop column if exists "price_source";`);
  }

}
