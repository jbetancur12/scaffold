import { Migration } from '@mikro-orm/migrations';

export class Migration20260216190000_AddControlledDocumentCategoryArea extends Migration {
    override async up(): Promise<void> {
        this.addSql('alter table if exists "controlled_document" add column if not exists "document_category" varchar(255) null;');
        this.addSql('alter table if exists "controlled_document" add column if not exists "process_area_code" varchar(255) null;');
    }

    override async down(): Promise<void> {
        this.addSql('alter table if exists "controlled_document" drop column if exists "document_category";');
        this.addSql('alter table if exists "controlled_document" drop column if exists "process_area_code";');
    }
}
