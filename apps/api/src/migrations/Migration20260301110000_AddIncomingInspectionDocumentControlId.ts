import { Migration } from '@mikro-orm/migrations';

export class Migration20260301110000_AddIncomingInspectionDocumentControlId extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table if exists "incoming_inspection"
                add column if not exists "document_control_id" varchar(255) null;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table if exists "incoming_inspection"
                drop column if exists "document_control_id";
        `);
    }
}
