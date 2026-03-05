import { Migration } from '@mikro-orm/migrations';

export class Migration20260304153000_AddDistributorPriceUpdatedAtToProductVariant extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "product_variant" add column if not exists "distributor_price_updated_at" timestamptz null;`);
    this.addSql(`update "product_variant" set "distributor_price_updated_at" = "updated_at" where "price" > 0 and "distributor_price_updated_at" is null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "product_variant" drop column if exists "distributor_price_updated_at";`);
  }

}
