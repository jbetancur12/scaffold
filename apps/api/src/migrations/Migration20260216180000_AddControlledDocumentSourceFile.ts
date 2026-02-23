import { Migration } from '@mikro-orm/migrations';

export class Migration20260216180000_AddControlledDocumentSourceFile extends Migration {
    override async up(): Promise<void> {
        this.addSql('alter table if exists "controlled_document" add column if not exists "source_file_name" varchar(255) null;');
        this.addSql('alter table if exists "controlled_document" add column if not exists "source_file_mime" varchar(255) null;');
        this.addSql('alter table if exists "controlled_document" add column if not exists "source_file_path" text null;');
    }

    override async down(): Promise<void> {
        this.addSql('alter table if exists "controlled_document" drop column if exists "source_file_name";');
        this.addSql('alter table if exists "controlled_document" drop column if exists "source_file_mime";');
        this.addSql('alter table if exists "controlled_document" drop column if exists "source_file_path";');
    }
}
