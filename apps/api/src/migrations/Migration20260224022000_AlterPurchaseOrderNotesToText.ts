import { Migration } from '@mikro-orm/migrations';

export class Migration20260224022000_AlterPurchaseOrderNotesToText extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table if exists "purchase_order"
            alter column "notes" type text;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table if exists "purchase_order"
            alter column "notes" type varchar(255)
            using left(coalesce("notes", ''), 255);
        `);
    }
}
