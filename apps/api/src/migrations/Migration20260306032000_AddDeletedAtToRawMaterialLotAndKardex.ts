import { Migration } from '@mikro-orm/migrations';

export class Migration20260306032000_AddDeletedAtToRawMaterialLotAndKardex extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table if exists "raw_material_lot"
                add column if not exists "deleted_at" timestamptz null;
        `);

        this.addSql(`
            alter table if exists "raw_material_kardex"
                add column if not exists "deleted_at" timestamptz null;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table if exists "raw_material_kardex"
                drop column if exists "deleted_at";
        `);

        this.addSql(`
            alter table if exists "raw_material_lot"
                drop column if exists "deleted_at";
        `);
    }
}
