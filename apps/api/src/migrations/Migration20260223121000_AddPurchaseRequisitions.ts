import { Migration } from '@mikro-orm/migrations';

export class Migration20260223121000_AddPurchaseRequisitions extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table if not exists "purchase_requisition" (
                "id" uuid not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "deleted_at" timestamptz null,
                "requested_by" varchar(255) not null,
                "production_order_id" uuid null,
                "needed_by" timestamptz null,
                "notes" text null,
                "status" text check ("status" in ('pendiente', 'aprobada', 'convertida', 'cancelada')) not null default 'pendiente',
                "converted_purchase_order_id" uuid null,
                constraint "purchase_requisition_pkey" primary key ("id")
            );
        `);

        this.addSql(`
            create table if not exists "purchase_requisition_item" (
                "id" uuid not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "deleted_at" timestamptz null,
                "requisition_id" uuid not null,
                "raw_material_id" uuid not null,
                "quantity" numeric(10,4) not null,
                "suggested_supplier_id" uuid null,
                "notes" text null,
                constraint "purchase_requisition_item_pkey" primary key ("id")
            );
        `);

        this.addSql('create index if not exists "purchase_requisition_status_index" on "purchase_requisition" ("status");');
        this.addSql('create index if not exists "purchase_requisition_item_requisition_index" on "purchase_requisition_item" ("requisition_id");');
        this.addSql('create index if not exists "purchase_requisition_item_raw_material_index" on "purchase_requisition_item" ("raw_material_id");');

        this.addSql(`
            alter table if exists "purchase_requisition_item"
                add constraint "purchase_requisition_item_requisition_id_foreign"
                foreign key ("requisition_id") references "purchase_requisition" ("id")
                on update cascade on delete cascade;
        `);
        this.addSql(`
            alter table if exists "purchase_requisition_item"
                add constraint "purchase_requisition_item_raw_material_id_foreign"
                foreign key ("raw_material_id") references "raw_material" ("id")
                on update cascade on delete restrict;
        `);
        this.addSql(`
            alter table if exists "purchase_requisition_item"
                add constraint "purchase_requisition_item_suggested_supplier_id_foreign"
                foreign key ("suggested_supplier_id") references "supplier" ("id")
                on update cascade on delete set null;
        `);
    }

    override async down(): Promise<void> {
        this.addSql('drop table if exists "purchase_requisition_item" cascade;');
        this.addSql('drop table if exists "purchase_requisition" cascade;');
    }
}
