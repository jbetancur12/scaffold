import { Migration } from '@mikro-orm/migrations';

export class Migration20260206030000 extends Migration {

    async up(): Promise<void> {
        this.addSql('alter table "product_variant" add column "target_margin" numeric(10, 2) not null default 0.4;');
    }

    async down(): Promise<void> {
        this.addSql('alter table "product_variant" drop column "target_margin";');
    }

}
