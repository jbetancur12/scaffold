import { Migration } from '@mikro-orm/migrations';

export class Migration20260208153253 extends Migration {

  override async up(): Promise<void> {
    this.addSql('delete from "operational_config";');
    this.addSql(`alter table "operational_config" drop column "monthly_expenses", drop column "working_days_per_month", drop column "working_hours_per_day";`);

    this.addSql(`alter table "operational_config" add column "operator_salary" int not null, add column "operator_load_factor" numeric(10,2) not null, add column "operator_real_monthly_minutes" int not null, add column "rent" int not null, add column "utilities" int not null, add column "admin_salaries" int not null, add column "other_expenses" int not null, add column "mod_cost_per_minute" int not null, add column "cif_cost_per_minute" int not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "operational_config" drop column "operator_salary", drop column "operator_load_factor", drop column "operator_real_monthly_minutes", drop column "rent", drop column "utilities", drop column "admin_salaries", drop column "other_expenses", drop column "mod_cost_per_minute", drop column "cif_cost_per_minute";`);

    this.addSql(`alter table "operational_config" add column "monthly_expenses" int not null, add column "working_days_per_month" int not null, add column "working_hours_per_day" int not null;`);
  }

}
