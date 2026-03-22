import { Migration } from '@mikro-orm/migrations';

export class Migration20260322120000_AddManualPriceToProduct extends Migration {

  override async up(): Promise<void> {
    this.addSql('alter table "product" add column if not exists "manual_price" numeric(12,2) null;');
  }

  override async down(): Promise<void> {
    this.addSql('alter table "product" drop column if exists "manual_price";');
  }

}
