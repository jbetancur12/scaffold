import { Migration } from '@mikro-orm/migrations';

export class Migration20260216070000_AddShipmentTraceability extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table if not exists "customer" (
                "id" uuid not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "deleted_at" timestamptz null,
                "name" varchar(255) not null,
                "document_type" varchar(255) null,
                "document_number" varchar(255) null,
                "contact_name" varchar(255) null,
                "email" varchar(255) null,
                "phone" varchar(255) null,
                "address" varchar(255) null,
                "notes" text null,
                constraint "customer_pkey" primary key ("id")
            );
        `);
        this.addSql(`create index if not exists "customer_name_idx" on "customer" ("name");`);
        this.addSql(`create unique index if not exists "customer_name_document_unique" on "customer" ("name", "document_number");`);

        this.addSql(`
            create table if not exists "shipment" (
                "id" uuid not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "deleted_at" timestamptz null,
                "customer_id" uuid not null,
                "commercial_document" varchar(255) not null,
                "shipped_at" timestamptz not null,
                "dispatched_by" varchar(255) null,
                "notes" text null,
                constraint "shipment_pkey" primary key ("id")
            );
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'shipment_customer_id_foreign') then
                    alter table "shipment"
                    add constraint "shipment_customer_id_foreign"
                    foreign key ("customer_id") references "customer" ("id") on update cascade;
                end if;
            end $$;
        `);
        this.addSql(`create index if not exists "shipment_customer_idx" on "shipment" ("customer_id");`);
        this.addSql(`create index if not exists "shipment_document_idx" on "shipment" ("commercial_document");`);

        this.addSql(`
            create table if not exists "shipment_item" (
                "id" uuid not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "deleted_at" timestamptz null,
                "shipment_id" uuid not null,
                "production_batch_id" uuid not null,
                "production_batch_unit_id" uuid null,
                "quantity" numeric(14,4) not null,
                constraint "shipment_item_pkey" primary key ("id")
            );
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'shipment_item_shipment_id_foreign') then
                    alter table "shipment_item"
                    add constraint "shipment_item_shipment_id_foreign"
                    foreign key ("shipment_id") references "shipment" ("id") on update cascade on delete cascade;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'shipment_item_production_batch_id_foreign') then
                    alter table "shipment_item"
                    add constraint "shipment_item_production_batch_id_foreign"
                    foreign key ("production_batch_id") references "production_batch" ("id") on update cascade;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'shipment_item_production_batch_unit_id_foreign') then
                    alter table "shipment_item"
                    add constraint "shipment_item_production_batch_unit_id_foreign"
                    foreign key ("production_batch_unit_id") references "production_batch_unit" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);
        this.addSql(`create index if not exists "shipment_item_batch_idx" on "shipment_item" ("production_batch_id");`);
        this.addSql(`create index if not exists "shipment_item_unit_idx" on "shipment_item" ("production_batch_unit_id");`);
        this.addSql(`
            create unique index if not exists "shipment_item_unique_unit_dispatch"
            on "shipment_item" ("production_batch_unit_id")
            where "production_batch_unit_id" is not null;
        `);
    }

    override async down(): Promise<void> {
        this.addSql('drop table if exists "shipment_item" cascade;');
        this.addSql('drop table if exists "shipment" cascade;');
        this.addSql('drop table if exists "customer" cascade;');
    }
}
