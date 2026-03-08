import { Migration } from '@mikro-orm/migrations';

export class Migration20260308010000_AddVariantAttributes extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "product_variant" add column "size" varchar(255) null, add column "size_code" varchar(255) null, add column "color" varchar(255) null, add column "color_code" varchar(255) null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "product_variant" drop column "size", drop column "size_code", drop column "color", drop column "color_code";`);
  }

}
