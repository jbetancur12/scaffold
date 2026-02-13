import { Migration } from '@mikro-orm/migrations';

export class Migration20260213013101 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "purchase_order" add column "tax_total" numeric(10,2) not null default 0, add column "subtotal_base" numeric(10,2) not null default 0;`);

    this.addSql(`alter table "purchase_order_item" add column "tax_amount" numeric(10,2) not null default 0;`);
    this.addSql(`alter table "purchase_order_item" alter column "unit_price" type numeric(10,2) using ("unit_price"::numeric(10,2));`);
    this.addSql(`alter table "purchase_order_item" alter column "unit_price" set default 0;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "purchase_order" drop column "tax_total", drop column "subtotal_base";`);

    this.addSql(`alter table "purchase_order_item" drop column "tax_amount";`);

    this.addSql(`alter table "purchase_order_item" alter column "unit_price" drop default;`);
    this.addSql(`alter table "purchase_order_item" alter column "unit_price" type numeric(10,2) using ("unit_price"::numeric(10,2));`);
  }

}
