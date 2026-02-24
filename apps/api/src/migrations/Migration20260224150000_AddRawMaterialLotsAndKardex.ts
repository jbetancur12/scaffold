import { Migration } from '@mikro-orm/migrations';

export class Migration20260224150000_AddRawMaterialLotsAndKardex extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table if not exists "raw_material_lot" (
                "id" varchar(255) not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "raw_material_id" varchar(255) not null,
                "warehouse_id" varchar(255) not null,
                "incoming_inspection_id" varchar(255) null,
                "supplier_lot_code" varchar(120) not null,
                "quantity_initial" numeric(12,4) not null,
                "quantity_available" numeric(12,4) not null,
                "unit_cost" numeric(12,4) null,
                "received_at" timestamptz not null,
                "expires_at" timestamptz null,
                "notes" text null,
                constraint "raw_material_lot_pkey" primary key ("id")
            );
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'raw_material_lot_raw_material_id_foreign') then
                    alter table "raw_material_lot"
                    add constraint "raw_material_lot_raw_material_id_foreign"
                    foreign key ("raw_material_id") references "raw_material" ("id") on update cascade;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'raw_material_lot_warehouse_id_foreign') then
                    alter table "raw_material_lot"
                    add constraint "raw_material_lot_warehouse_id_foreign"
                    foreign key ("warehouse_id") references "warehouse" ("id") on update cascade;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'raw_material_lot_incoming_inspection_id_foreign') then
                    alter table "raw_material_lot"
                    add constraint "raw_material_lot_incoming_inspection_id_foreign"
                    foreign key ("incoming_inspection_id") references "incoming_inspection" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);
        this.addSql(`
            create unique index if not exists "raw_material_lot_unique_material_warehouse_supplier_lot"
            on "raw_material_lot" ("raw_material_id", "warehouse_id", "supplier_lot_code");
        `);
        this.addSql(`
            create index if not exists "raw_material_lot_material_warehouse_received_idx"
            on "raw_material_lot" ("raw_material_id", "warehouse_id", "received_at");
        `);

        this.addSql(`
            create table if not exists "raw_material_kardex" (
                "id" varchar(255) not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "raw_material_id" varchar(255) not null,
                "warehouse_id" varchar(255) not null,
                "lot_id" varchar(255) null,
                "movement_type" varchar(60) not null,
                "quantity" numeric(12,4) not null,
                "balance_after" numeric(12,4) not null,
                "reference_type" varchar(80) null,
                "reference_id" varchar(255) null,
                "notes" text null,
                "occurred_at" timestamptz not null,
                constraint "raw_material_kardex_pkey" primary key ("id")
            );
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'raw_material_kardex_raw_material_id_foreign') then
                    alter table "raw_material_kardex"
                    add constraint "raw_material_kardex_raw_material_id_foreign"
                    foreign key ("raw_material_id") references "raw_material" ("id") on update cascade;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'raw_material_kardex_warehouse_id_foreign') then
                    alter table "raw_material_kardex"
                    add constraint "raw_material_kardex_warehouse_id_foreign"
                    foreign key ("warehouse_id") references "warehouse" ("id") on update cascade;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'raw_material_kardex_lot_id_foreign') then
                    alter table "raw_material_kardex"
                    add constraint "raw_material_kardex_lot_id_foreign"
                    foreign key ("lot_id") references "raw_material_lot" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);
        this.addSql(`
            create index if not exists "raw_material_kardex_material_occurred_idx"
            on "raw_material_kardex" ("raw_material_id", "occurred_at");
        `);
    }

    override async down(): Promise<void> {
        this.addSql('drop table if exists "raw_material_kardex" cascade;');
        this.addSql('drop table if exists "raw_material_lot" cascade;');
    }
}
