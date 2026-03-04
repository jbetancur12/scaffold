import { Migration } from '@mikro-orm/migrations';

export class Migration20260304120000_AddProductLengthWidthHeight extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table if exists "product"
                add column if not exists "length_cm" numeric(10,2) null,
                add column if not exists "width_cm" numeric(10,2) null,
                add column if not exists "height_cm" numeric(10,2) null;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table if exists "product"
                drop column if exists "height_cm",
                drop column if exists "width_cm",
                drop column if exists "length_cm";
        `);
    }
}
