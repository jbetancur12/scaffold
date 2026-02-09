import { Migration } from '@mikro-orm/migrations';

export class Migration20260208154953 extends Migration {

  override async up(): Promise<void> {
    // Re-applying missing changes from broken migration 20260208151417

    // Product Variant: production_minutes
    this.addSql(`alter table "product_variant" add column if not exists "production_minutes" int null;`);

    // Supplier: city, department, etc.
    this.addSql(`alter table "supplier" add column if not exists "city" varchar(255) null, add column if not exists "department" varchar(255) null, add column if not exists "bank_details" text null, add column if not exists "payment_conditions" text null, add column if not exists "notes" text null;`);

    // Actual changes for this migration (altering types)
    this.addSql(`alter table "product_variant" alter column "target_margin" type numeric(10,2) using ("target_margin"::numeric(10,2));`);
    this.addSql(`alter table "product_variant" alter column "production_minutes" type numeric(10,2) using ("production_minutes"::numeric(10,2));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "product_variant" alter column "target_margin" type int using ("target_margin"::int);`);
    this.addSql(`alter table "product_variant" alter column "production_minutes" type int using ("production_minutes"::int);`);

    // Reverting the "missing" columns
    this.addSql(`alter table "product_variant" drop column if exists "production_minutes";`);
    this.addSql(`alter table "supplier" drop column if exists "city", drop column if exists "department", drop column if exists "bank_details", drop column if exists "payment_conditions", drop column if exists "notes";`);
  }

}
