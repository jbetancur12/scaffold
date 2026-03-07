import { Migration } from '@mikro-orm/migrations';

export class Migration20260307210000_AddPurchaseRequisitionOrigins extends Migration {
    override async up(): Promise<void> {
        this.addSql('alter table "purchase_requisition" add column if not exists "production_order_ids" jsonb null;');
        this.addSql('alter table "purchase_requisition_item" add column if not exists "source_production_orders" jsonb null;');
        this.addSql(`
            update "purchase_requisition"
            set "production_order_ids" = jsonb_build_array("production_order_id")
            where "production_order_id" is not null
              and ("production_order_ids" is null or jsonb_array_length("production_order_ids") = 0);
        `);
    }

    override async down(): Promise<void> {
        this.addSql('alter table "purchase_requisition_item" drop column if exists "source_production_orders";');
        this.addSql('alter table "purchase_requisition" drop column if exists "production_order_ids";');
    }
}
