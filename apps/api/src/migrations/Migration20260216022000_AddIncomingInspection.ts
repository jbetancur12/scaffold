import { Migration } from '@mikro-orm/migrations';

export class Migration20260216022000_AddIncomingInspection extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table if not exists "incoming_inspection" (
                "id" uuid not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "deleted_at" timestamptz null,
                "purchase_order_id" uuid null,
                "purchase_order_item_id" uuid null,
                "raw_material_id" uuid not null,
                "warehouse_id" uuid not null,
                "status" text check ("status" in ('pendiente', 'liberado', 'rechazado')) not null default 'pendiente',
                "inspection_result" text check ("inspection_result" in ('aprobado', 'condicional', 'rechazado')) null,
                "supplier_lot_code" varchar(255) null,
                "certificate_ref" varchar(255) null,
                "notes" text null,
                "quantity_received" numeric(10,4) not null,
                "quantity_accepted" numeric(10,4) not null default 0,
                "quantity_rejected" numeric(10,4) not null default 0,
                "inspected_by" varchar(255) null,
                "inspected_at" timestamptz null,
                "released_by" varchar(255) null,
                "released_at" timestamptz null,
                constraint "incoming_inspection_pkey" primary key ("id")
            );
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'incoming_inspection_purchase_order_id_foreign') then
                    alter table "incoming_inspection"
                    add constraint "incoming_inspection_purchase_order_id_foreign"
                    foreign key ("purchase_order_id") references "purchase_order" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'incoming_inspection_purchase_order_item_id_foreign') then
                    alter table "incoming_inspection"
                    add constraint "incoming_inspection_purchase_order_item_id_foreign"
                    foreign key ("purchase_order_item_id") references "purchase_order_item" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'incoming_inspection_raw_material_id_foreign') then
                    alter table "incoming_inspection"
                    add constraint "incoming_inspection_raw_material_id_foreign"
                    foreign key ("raw_material_id") references "raw_material" ("id") on update cascade;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'incoming_inspection_warehouse_id_foreign') then
                    alter table "incoming_inspection"
                    add constraint "incoming_inspection_warehouse_id_foreign"
                    foreign key ("warehouse_id") references "warehouse" ("id") on update cascade;
                end if;
            end $$;
        `);
        this.addSql(`create index if not exists "incoming_inspection_status_idx" on "incoming_inspection" ("status");`);
        this.addSql(`create index if not exists "incoming_inspection_raw_material_idx" on "incoming_inspection" ("raw_material_id");`);
        this.addSql(`create index if not exists "incoming_inspection_purchase_order_idx" on "incoming_inspection" ("purchase_order_id");`);
    }

    override async down(): Promise<void> {
        this.addSql('drop table if exists "incoming_inspection" cascade;');
    }
}
