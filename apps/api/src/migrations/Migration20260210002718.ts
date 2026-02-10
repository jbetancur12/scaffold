import { Migration } from '@mikro-orm/migrations';

export class Migration20260210002718 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "raw_material" alter column "min_stock_level" type int using ("min_stock_level"::int);`);
    this.addSql(`alter table "raw_material" alter column "min_stock_level" set default 0;`);
    this.addSql(`alter table "raw_material" alter column "min_stock_level" set not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "raw_material" alter column "min_stock_level" drop default;`);
    this.addSql(`alter table "raw_material" alter column "min_stock_level" type int using ("min_stock_level"::int);`);
    this.addSql(`alter table "raw_material" alter column "min_stock_level" drop not null;`);
  }

}
