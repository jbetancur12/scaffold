import { Migration } from '@mikro-orm/migrations';

export class Migration20260208154953 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "product_variant" alter column "target_margin" type numeric(10,2) using ("target_margin"::numeric(10,2));`);
    this.addSql(`alter table "product_variant" alter column "production_minutes" type numeric(10,2) using ("production_minutes"::numeric(10,2));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "product_variant" alter column "target_margin" type int using ("target_margin"::int);`);
    this.addSql(`alter table "product_variant" alter column "production_minutes" type int using ("production_minutes"::int);`);
  }

}
