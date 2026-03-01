import { Migration } from '@mikro-orm/migrations';

export class Migration20260228003000_AddSalesOrderPdfDocCodes extends Migration {
    async up(): Promise<void> {
        this.addSql(`
      ALTER TABLE "operational_config"
        ADD COLUMN IF NOT EXISTS "default_sales_order_production_doc_code" VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS "default_sales_order_billing_doc_code" VARCHAR(255) NULL;
    `);
    }

    async down(): Promise<void> {
        this.addSql(`
      ALTER TABLE "operational_config"
        DROP COLUMN IF EXISTS "default_sales_order_production_doc_code",
        DROP COLUMN IF EXISTS "default_sales_order_billing_doc_code";
    `);
    }
}
