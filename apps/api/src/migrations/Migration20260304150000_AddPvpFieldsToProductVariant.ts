import { Migration } from '@mikro-orm/migrations';

export class Migration20260304150000_AddPvpFieldsToProductVariant extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "product_variant" add column if not exists "pvp_margin" numeric(10,4) not null default 0.25;`);
    this.addSql(`alter table "product_variant" add column if not exists "pvp_price" numeric(12,2) not null default 0;`);
    this.addSql(`update "product_variant" set "pvp_price" = round(("price" / 0.75)::numeric, 2) where "pvp_price" = 0 and "price" > 0;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "product_variant" drop column if exists "pvp_price";`);
    this.addSql(`alter table "product_variant" drop column if exists "pvp_margin";`);
  }

}
