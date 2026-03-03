import { Migration } from '@mikro-orm/migrations';

export class Migration20260303012000_AddSalesOrders extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table if not exists "sales_order" (
                "id" uuid not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "deleted_at" timestamptz null,
                "code" varchar(255) not null,
                "customer_id" uuid not null,
                "order_date" timestamptz not null,
                "expected_delivery_date" timestamptz null,
                "status" text check ("status" in ('pending', 'in_production', 'ready_to_ship', 'shipped', 'cancelled')) not null default 'pending',
                "notes" text null,
                "total_amount" numeric(12,2) not null default 0,
                "subtotal_base" numeric(12,2) not null default 0,
                "tax_total" numeric(12,2) not null default 0,
                "discount_amount" numeric(12,2) not null default 0,
                "net_total_amount" numeric(12,2) not null default 0,
                constraint "sales_order_pkey" primary key ("id")
            );
        `);
        this.addSql(`alter table "sales_order" add constraint if not exists "sales_order_code_unique" unique ("code");`);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'sales_order_customer_id_foreign') then
                    alter table "sales_order"
                    add constraint "sales_order_customer_id_foreign"
                    foreign key ("customer_id") references "customer" ("id") on update cascade;
                end if;
            end $$;
        `);

        this.addSql(`
            create table if not exists "sales_order_item" (
                "id" uuid not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "deleted_at" timestamptz null,
                "sales_order_id" uuid not null,
                "product_id" uuid not null,
                "variant_id" uuid null,
                "quantity" integer not null,
                "unit_price" numeric(12,2) not null,
                "tax_rate" numeric(5,2) not null default 0,
                "tax_amount" numeric(12,2) not null,
                "subtotal" numeric(12,2) not null,
                constraint "sales_order_item_pkey" primary key ("id")
            );
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'sales_order_item_sales_order_id_foreign') then
                    alter table "sales_order_item"
                    add constraint "sales_order_item_sales_order_id_foreign"
                    foreign key ("sales_order_id") references "sales_order" ("id") on update cascade on delete cascade;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'sales_order_item_product_id_foreign') then
                    alter table "sales_order_item"
                    add constraint "sales_order_item_product_id_foreign"
                    foreign key ("product_id") references "product" ("id") on update cascade;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'sales_order_item_variant_id_foreign') then
                    alter table "sales_order_item"
                    add constraint "sales_order_item_variant_id_foreign"
                    foreign key ("variant_id") references "product_variant" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);

        this.addSql(`
            alter table "production_order"
            add column if not exists "sales_order_id" uuid null;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'production_order_sales_order_id_foreign') then
                    alter table "production_order"
                    add constraint "production_order_sales_order_id_foreign"
                    foreign key ("sales_order_id") references "sales_order" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);

        this.addSql(`
            alter table "operational_config"
                add column if not exists "sales_order_prefix" varchar(255) null,
                add column if not exists "sales_order_sequence" integer not null default 0;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "production_order" drop constraint if exists "production_order_sales_order_id_foreign";`);
        this.addSql(`alter table "production_order" drop column if exists "sales_order_id";`);
        this.addSql(`alter table "operational_config" drop column if exists "sales_order_prefix";`);
        this.addSql(`alter table "operational_config" drop column if exists "sales_order_sequence";`);
        this.addSql(`drop table if exists "sales_order_item" cascade;`);
        this.addSql(`drop table if exists "sales_order" cascade;`);
    }
}

