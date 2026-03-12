import { Migration } from '@mikro-orm/migrations';

export class Migration20260312090000_AddProductCatalogVisibility extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "product" add column if not exists "show_in_catalog_pdf" boolean not null default true;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "product" drop column if exists "show_in_catalog_pdf";`);
  }

}
