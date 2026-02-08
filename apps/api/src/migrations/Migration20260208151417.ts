import { Migration } from '@mikro-orm/migrations';

export class Migration20260208151417 extends Migration {

  override async up(): Promise<void> {
    // this.addSql(`create table "operational_config" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "monthly_expenses" int not null, "working_days_per_month" int not null, "working_hours_per_day" int not null, "number_of_operators" int not null, "cost_per_minute" int not null, constraint "operational_config_pkey" primary key ("id"));`);

    // this.addSql(`alter table "product_variant" add column "production_minutes" int null;`);

    // this.addSql(`alter table "supplier" add column "city" varchar(255) null, add column "department" varchar(255) null, add column "bank_details" text null, add column "payment_conditions" text null, add column "notes" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "operational_config" cascade;`);

    this.addSql(`alter table "product_variant" drop column "production_minutes";`);

    this.addSql(`alter table "supplier" drop column "city", drop column "department", drop column "bank_details", drop column "payment_conditions", drop column "notes";`);
  }

}
