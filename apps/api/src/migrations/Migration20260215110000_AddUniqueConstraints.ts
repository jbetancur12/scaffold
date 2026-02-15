import { Migration } from '@mikro-orm/migrations';

export class Migration20260215110000_AddUniqueConstraints extends Migration {

    override async up(): Promise<void> {
        // product_variant.sku must be globally unique
        this.addSql(`
            with duplicated as (
                select "id", row_number() over (partition by "sku" order by "updated_at" desc, "created_at" desc, "id" desc) as rn
                from "product_variant"
            )
            update "product_variant" pv
            set "sku" = concat(pv."sku", '-dup-', duplicated.rn::text, '-', substring(pv."id"::text, 1, 8))
            from duplicated
            where pv."id" = duplicated."id" and duplicated.rn > 1;
        `);
        this.addSql('alter table "product_variant" drop constraint if exists "product_variant_sku_unique";');
        this.addSql('alter table "product_variant" add constraint "product_variant_sku_unique" unique ("sku");');

        // production_order.code must be unique
        this.addSql(`
            with duplicated as (
                select "id", row_number() over (partition by "code" order by "updated_at" desc, "created_at" desc, "id" desc) as rn
                from "production_order"
            )
            update "production_order" po
            set "code" = concat(po."code", '-dup-', duplicated.rn::text, '-', substring(po."id"::text, 1, 8))
            from duplicated
            where po."id" = duplicated."id" and duplicated.rn > 1;
        `);
        this.addSql('alter table "production_order" drop constraint if exists "production_order_code_unique";');
        this.addSql('alter table "production_order" add constraint "production_order_code_unique" unique ("code");');

        // supplier_material must be unique per supplier/raw_material pair
        this.addSql(`
            with ranked as (
                select "id",
                    row_number() over (
                        partition by "supplier_id", "raw_material_id"
                        order by "updated_at" desc, "created_at" desc, "id" desc
                    ) as rn
                from "supplier_material"
            )
            delete from "supplier_material" sm
            using ranked
            where sm."id" = ranked."id" and ranked.rn > 1;
        `);
        this.addSql('alter table "supplier_material" drop constraint if exists "supplier_material_supplier_raw_material_unique";');
        this.addSql('alter table "supplier_material" add constraint "supplier_material_supplier_raw_material_unique" unique ("supplier_id", "raw_material_id");');

        // Merge duplicated inventory rows by warehouse/raw_material and warehouse/variant before enforcing unique pairs
        this.addSql(`
            with ranked as (
                select
                    "id",
                    "warehouse_id",
                    "raw_material_id",
                    sum("quantity") over (partition by "warehouse_id", "raw_material_id") as total_qty,
                    row_number() over (
                        partition by "warehouse_id", "raw_material_id"
                        order by "updated_at" desc, "created_at" desc, "id" desc
                    ) as rn
                from "inventory_item"
                where "raw_material_id" is not null
            )
            update "inventory_item" i
            set "quantity" = ranked.total_qty, "updated_at" = now(), "last_updated" = now()
            from ranked
            where i."id" = ranked."id" and ranked.rn = 1;
        `);
        this.addSql(`
            with ranked as (
                select
                    "id",
                    row_number() over (
                        partition by "warehouse_id", "raw_material_id"
                        order by "updated_at" desc, "created_at" desc, "id" desc
                    ) as rn
                from "inventory_item"
                where "raw_material_id" is not null
            )
            delete from "inventory_item" i
            using ranked
            where i."id" = ranked."id" and ranked.rn > 1;
        `);
        this.addSql(`
            with ranked as (
                select
                    "id",
                    "warehouse_id",
                    "variant_id",
                    sum("quantity") over (partition by "warehouse_id", "variant_id") as total_qty,
                    row_number() over (
                        partition by "warehouse_id", "variant_id"
                        order by "updated_at" desc, "created_at" desc, "id" desc
                    ) as rn
                from "inventory_item"
                where "variant_id" is not null
            )
            update "inventory_item" i
            set "quantity" = ranked.total_qty, "updated_at" = now(), "last_updated" = now()
            from ranked
            where i."id" = ranked."id" and ranked.rn = 1;
        `);
        this.addSql(`
            with ranked as (
                select
                    "id",
                    row_number() over (
                        partition by "warehouse_id", "variant_id"
                        order by "updated_at" desc, "created_at" desc, "id" desc
                    ) as rn
                from "inventory_item"
                where "variant_id" is not null
            )
            delete from "inventory_item" i
            using ranked
            where i."id" = ranked."id" and ranked.rn > 1;
        `);
        this.addSql('alter table "inventory_item" drop constraint if exists "inventory_item_warehouse_raw_material_unique";');
        this.addSql('alter table "inventory_item" add constraint "inventory_item_warehouse_raw_material_unique" unique ("warehouse_id", "raw_material_id");');
        this.addSql('alter table "inventory_item" drop constraint if exists "inventory_item_warehouse_variant_unique";');
        this.addSql('alter table "inventory_item" add constraint "inventory_item_warehouse_variant_unique" unique ("warehouse_id", "variant_id");');
    }

    override async down(): Promise<void> {
        this.addSql('alter table "inventory_item" drop constraint if exists "inventory_item_warehouse_variant_unique";');
        this.addSql('alter table "inventory_item" drop constraint if exists "inventory_item_warehouse_raw_material_unique";');
        this.addSql('alter table "supplier_material" drop constraint if exists "supplier_material_supplier_raw_material_unique";');
        this.addSql('alter table "production_order" drop constraint if exists "production_order_code_unique";');
        this.addSql('alter table "product_variant" drop constraint if exists "product_variant_sku_unique";');
    }

}
