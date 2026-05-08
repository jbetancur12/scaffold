import { Migration } from '@mikro-orm/migrations';

export class Migration20260508034135 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "sales_order_item" add column "dispatched_quantity" numeric(12,2) not null default 0;`);

    this.addSql(`alter table "shipment_item" add column "sales_order_item_id" uuid null;`);
    this.addSql(`alter table "shipment_item" add constraint "shipment_item_sales_order_item_id_foreign" foreign key ("sales_order_item_id") references "sales_order_item" ("id") on update cascade on delete set null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "shipment_item" drop constraint "shipment_item_sales_order_item_id_foreign";`);

    this.addSql(`alter table "sales_order_item" drop column "dispatched_quantity";`);

    this.addSql(`alter table "shipment_item" drop column "sales_order_item_id";`);
  }

}
