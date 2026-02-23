import { Migration } from '@mikro-orm/migrations';

export class Migration20260223170000_AddPurchaseOrderControlledDocumentId extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table if exists "purchase_order"
                add column if not exists "controlled_document_id" uuid null;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table if exists "purchase_order"
                drop column if exists "controlled_document_id";
        `);
    }
}
