import { Migration } from '@mikro-orm/migrations';

export class Migration20260303052000_AddQuotations extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table if not exists "quotation" (
                "id" uuid not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "deleted_at" timestamptz null,
                "code" varchar(255) not null,
                "customer_id" uuid not null,
                "quotation_date" timestamptz not null,
                "valid_until" timestamptz null,
                "status" text check ("status" in ('draft','sent','approved_partial','approved_full','rejected','converted')) not null default 'draft',
                "notes" text null,
                "subtotal_base" numeric(12,2) not null default 0,
                "tax_total" numeric(12,2) not null default 0,
                "discount_amount" numeric(12,2) not null default 0,
                "total_amount" numeric(12,2) not null default 0,
                "net_total_amount" numeric(12,2) not null default 0,
                "converted_sales_order_id" uuid null,
                constraint "quotation_pkey" primary key ("id")
            );
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'quotation_code_unique') then
                    alter table "quotation" add constraint "quotation_code_unique" unique ("code");
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'quotation_customer_id_foreign') then
                    alter table "quotation"
                    add constraint "quotation_customer_id_foreign"
                    foreign key ("customer_id") references "customer" ("id") on update cascade;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'quotation_converted_sales_order_id_foreign') then
                    alter table "quotation"
                    add constraint "quotation_converted_sales_order_id_foreign"
                    foreign key ("converted_sales_order_id") references "sales_order" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);

        this.addSql(`
            create table if not exists "quotation_item" (
                "id" uuid not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "deleted_at" timestamptz null,
                "quotation_id" uuid not null,
                "is_catalog_item" boolean not null default true,
                "product_id" uuid null,
                "variant_id" uuid null,
                "custom_description" varchar(255) null,
                "custom_sku" varchar(255) null,
                "quantity" numeric(12,3) not null,
                "approved_quantity" numeric(12,3) not null default 0,
                "converted_quantity" numeric(12,3) not null default 0,
                "unit_price" numeric(12,2) not null,
                "base_unit_cost" numeric(12,2) not null default 0,
                "target_margin" numeric(6,4) not null default 0,
                "min_allowed_margin" numeric(6,4) not null default 0,
                "discount_percent" numeric(6,2) not null default 0,
                "tax_rate" numeric(6,2) not null default 0,
                "tax_amount" numeric(12,2) not null default 0,
                "subtotal" numeric(12,2) not null default 0,
                "net_subtotal" numeric(12,2) not null default 0,
                "approved" boolean not null default false,
                constraint "quotation_item_pkey" primary key ("id")
            );
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'quotation_item_quotation_id_foreign') then
                    alter table "quotation_item"
                    add constraint "quotation_item_quotation_id_foreign"
                    foreign key ("quotation_id") references "quotation" ("id") on update cascade on delete cascade;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'quotation_item_product_id_foreign') then
                    alter table "quotation_item"
                    add constraint "quotation_item_product_id_foreign"
                    foreign key ("product_id") references "product" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'quotation_item_variant_id_foreign') then
                    alter table "quotation_item"
                    add constraint "quotation_item_variant_id_foreign"
                    foreign key ("variant_id") references "product_variant" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);
    }

    override async down(): Promise<void> {
        this.addSql('drop table if exists "quotation_item" cascade;');
        this.addSql('drop table if exists "quotation" cascade;');
    }
}
