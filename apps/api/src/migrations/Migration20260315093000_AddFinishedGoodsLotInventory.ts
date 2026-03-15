import { Migration } from '@mikro-orm/migrations';

export class Migration20260315093000_AddFinishedGoodsLotInventory extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table if not exists "finished_goods_lot_inventory" (
                "id" uuid not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "deleted_at" timestamptz null,
                "production_batch_id" uuid not null,
                "warehouse_id" uuid not null,
                "quantity" numeric(10,4) not null,
                constraint "finished_goods_lot_inventory_pkey" primary key ("id")
            );
        `);
        this.addSql(`create unique index if not exists "finished_goods_lot_inventory_batch_warehouse_unique" on "finished_goods_lot_inventory" ("production_batch_id", "warehouse_id");`);
        this.addSql(`alter table "finished_goods_lot_inventory" add constraint "finished_goods_lot_inventory_production_batch_fk" foreign key ("production_batch_id") references "production_batch" ("id") on update cascade;`);
        this.addSql(`alter table "finished_goods_lot_inventory" add constraint "finished_goods_lot_inventory_warehouse_fk" foreign key ("warehouse_id") references "warehouse" ("id") on update cascade;`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "finished_goods_lot_inventory";`);
    }
}
