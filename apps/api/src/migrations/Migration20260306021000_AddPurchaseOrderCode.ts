import { Migration } from '@mikro-orm/migrations';

export class Migration20260306021000_AddPurchaseOrderCode extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table if exists "purchase_order"
                add column if not exists "code" varchar(255) null;
        `);

        this.addSql(`
            with numbered as (
                select
                    "id",
                    row_number() over (order by "created_at" asc, "id" asc) as rn
                from "purchase_order"
                where "code" is null or length(trim("code")) = 0
            )
            update "purchase_order" po
            set "code" = concat('OC-', lpad(numbered.rn::text, 4, '0'))
            from numbered
            where po."id" = numbered."id";
        `);

        this.addSql(`
            alter table if exists "purchase_order"
                alter column "code" set not null;
        `);

        this.addSql(`create unique index if not exists "purchase_order_code_unique" on "purchase_order" ("code");`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop index if exists "purchase_order_code_unique";`);
        this.addSql(`
            alter table if exists "purchase_order"
                drop column if exists "code";
        `);
    }
}
