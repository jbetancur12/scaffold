import { Migration } from '@mikro-orm/migrations';

export class Migration20260504053706 extends Migration {

    override async up(): Promise<void> {
        this.addSql(`alter table "purchase_order" add column "retention_iva_amount" numeric(10,2) not null default 0`);
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "purchase_order" drop column "retention_iva_amount"`);
    }

}
