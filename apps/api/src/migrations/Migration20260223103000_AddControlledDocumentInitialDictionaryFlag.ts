import { Migration } from '@mikro-orm/migrations';

export class Migration20260223103000_AddControlledDocumentInitialDictionaryFlag extends Migration {
    override async up(): Promise<void> {
        this.addSql('alter table if exists "controlled_document" add column if not exists "is_initial_dictionary" boolean not null default false;');
        this.addSql(`
            with first_document as (
                select id
                from "controlled_document"
                order by "created_at" asc
                limit 1
            )
            update "controlled_document"
            set "is_initial_dictionary" = true
            where id in (select id from first_document)
              and not exists (
                select 1
                from "controlled_document"
                where "is_initial_dictionary" = true
              );
        `);
    }

    override async down(): Promise<void> {
        this.addSql('alter table if exists "controlled_document" drop column if exists "is_initial_dictionary";');
    }
}
