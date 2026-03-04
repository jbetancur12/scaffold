import { Migration } from '@mikro-orm/migrations';

export class Migration20260304133000_AddQuotationTermsTemplateToOperationalConfig extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "operational_config" add column if not exists "quotation_terms_template" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "operational_config" drop column if exists "quotation_terms_template";`);
  }

}
