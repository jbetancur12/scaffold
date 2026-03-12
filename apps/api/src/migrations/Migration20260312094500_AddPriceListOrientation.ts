import { Migration } from '@mikro-orm/migrations';

export class Migration20260312094500_AddPriceListOrientation extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "price_list_config" add column if not exists "orientation" varchar(20) not null default 'landscape';`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "price_list_config" drop column if exists "orientation";`);
  }

}
