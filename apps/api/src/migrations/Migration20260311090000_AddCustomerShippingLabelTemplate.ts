import { Migration } from '@mikro-orm/migrations';

export class Migration20260311090000_AddCustomerShippingLabelTemplate extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "customer" add column if not exists "shipping_label_template" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "customer" drop column if exists "shipping_label_template";`);
  }

}
