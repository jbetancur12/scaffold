import { Migration } from '@mikro-orm/migrations';

export class Migration20260309090000_AddQuotationNoteLines extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table "quotation_item"
            add column if not exists "line_type" text not null default 'item',
            add column if not exists "note_text" text null,
            add column if not exists "sort_order" int not null default 0;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'quotation_item_line_type_check') then
                    alter table "quotation_item"
                    add constraint "quotation_item_line_type_check"
                    check ("line_type" in ('item', 'note'));
                end if;
            end $$;
        `);
        this.addSql(`update "quotation_item" set "line_type" = 'item' where "line_type" is null;`);
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "quotation_item" drop constraint if exists "quotation_item_line_type_check";`);
        this.addSql(`
            alter table "quotation_item"
            drop column if exists "line_type",
            drop column if exists "note_text",
            drop column if exists "sort_order";
        `);
    }
}
