import { Migration } from '@mikro-orm/migrations';

export class Migration20260301143000_AddFinishedInspectionToProductionBatch extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table if exists "production_batch"
                add column if not exists "finished_inspection_status" varchar(255) not null default 'pending',
                add column if not exists "finished_inspection_form_data" jsonb null,
                add column if not exists "finished_inspection_form_completed" boolean not null default false,
                add column if not exists "finished_inspection_form_filled_by" varchar(255) null,
                add column if not exists "finished_inspection_form_filled_at" timestamptz null,
                add column if not exists "finished_inspection_form_document_id" varchar(255) null,
                add column if not exists "finished_inspection_form_document_code" varchar(255) null,
                add column if not exists "finished_inspection_form_document_title" varchar(255) null,
                add column if not exists "finished_inspection_form_document_version" int null,
                add column if not exists "finished_inspection_form_document_date" timestamptz null;
        `);

        this.addSql(`
            alter table if exists "operational_config"
                add column if not exists "default_finished_inspection_controlled_document_code" varchar(255) null;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table if exists "production_batch"
                drop column if exists "finished_inspection_status",
                drop column if exists "finished_inspection_form_data",
                drop column if exists "finished_inspection_form_completed",
                drop column if exists "finished_inspection_form_filled_by",
                drop column if exists "finished_inspection_form_filled_at",
                drop column if exists "finished_inspection_form_document_id",
                drop column if exists "finished_inspection_form_document_code",
                drop column if exists "finished_inspection_form_document_title",
                drop column if exists "finished_inspection_form_document_version",
                drop column if exists "finished_inspection_form_document_date";
        `);

        this.addSql(`
            alter table if exists "operational_config"
                drop column if exists "default_finished_inspection_controlled_document_code";
        `);
    }
}

