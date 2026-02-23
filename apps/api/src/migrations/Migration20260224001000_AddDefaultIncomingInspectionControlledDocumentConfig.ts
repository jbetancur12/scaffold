import { Migration } from '@mikro-orm/migrations';

export class Migration20260224001000_AddDefaultIncomingInspectionControlledDocumentConfig extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table if exists "operational_config"
                add column if not exists "default_incoming_inspection_controlled_document_code" varchar(255) null;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table if exists "operational_config"
                drop column if exists "default_incoming_inspection_controlled_document_code";
        `);
    }
}
