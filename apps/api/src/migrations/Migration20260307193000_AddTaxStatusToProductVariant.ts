import { Migration } from '@mikro-orm/migrations';

export class Migration20260307193000_AddTaxStatusToProductVariant extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "product_variant" add column if not exists "tax_status" varchar(20) not null default 'excluido';`);
    this.addSql(`alter table "product_variant" add column if not exists "tax_rate" numeric(5,2) not null default 0;`);
    this.addSql(`update "product_variant" set "tax_status" = 'excluido' where "tax_status" is null or trim("tax_status") = '';`);
    this.addSql(`update "product_variant" set "tax_rate" = 0 where "tax_status" <> 'gravado';`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "product_variant" drop column if exists "tax_rate";`);
    this.addSql(`alter table "product_variant" drop column if exists "tax_status";`);
  }

}
