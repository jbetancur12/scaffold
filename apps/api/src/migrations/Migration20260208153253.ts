import { Migration } from '@mikro-orm/migrations';

export class Migration20260208153253 extends Migration {

  override async up(): Promise<void> {
    // Previous migration (20260208151417) failed to create the table because the SQL was commented out.
    // This migration enforces the correct state by dropping (if exists) and creating the final table schema.
    this.addSql('DROP TABLE IF EXISTS "operational_config";');

    this.addSql(`create table "operational_config" (
      "id" uuid not null,
      "created_at" timestamptz not null,
      "updated_at" timestamptz not null,
      "deleted_at" timestamptz null,
      "operator_salary" int not null,
      "operator_load_factor" numeric(10,2) not null,
      "operator_real_monthly_minutes" int not null,
      "rent" int not null,
      "utilities" int not null,
      "admin_salaries" int not null,
      "other_expenses" int not null,
      "number_of_operators" int not null,
      "mod_cost_per_minute" int not null,
      "cif_cost_per_minute" int not null,
      "cost_per_minute" int not null,
      constraint "operational_config_pkey" primary key ("id")
    );`);
  }

  override async down(): Promise<void> {
    this.addSql('drop table if exists "operational_config";');
  }

}
