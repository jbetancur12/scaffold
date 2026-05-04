import { Migration } from '@mikro-orm/migrations';

export class Migration20260505000000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "operational_config" add column "purchase_retention_source_rate" numeric(5,2) null, add column "purchase_retention_iva_rate" numeric(5,2) null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "operational_config" drop column "purchase_retention_source_rate", drop column "purchase_retention_iva_rate";`);
  }

}
