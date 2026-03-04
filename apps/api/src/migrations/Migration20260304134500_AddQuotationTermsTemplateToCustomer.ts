import { Migration } from '@mikro-orm/migrations';

export class Migration20260304134500_AddQuotationTermsTemplateToCustomer extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "customer" add column if not exists "quotation_terms_template" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "customer" drop column if exists "quotation_terms_template";`);
  }

}
