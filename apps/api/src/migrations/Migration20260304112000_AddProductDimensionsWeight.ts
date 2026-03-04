import { Migration } from '@mikro-orm/migrations';

export class Migration20260304112000_AddProductDimensionsWeight extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table if exists "product"
                add column if not exists "dimensions" varchar(255) null,
                add column if not exists "weight_kg" numeric(10,3) null;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table if exists "product"
                drop column if exists "weight_kg",
                drop column if exists "dimensions";
        `);
    }
}
