import { Migration } from '@mikro-orm/migrations';

export class Migration20260502000000_AddItemNotesToQuotationItem extends Migration {
    override async up(): Promise<void> {
        this.addSql(`alter table "quotation_item" add column if not exists "item_notes" text null;`);
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "quotation_item" drop column if exists "item_notes";`);
    }
}
