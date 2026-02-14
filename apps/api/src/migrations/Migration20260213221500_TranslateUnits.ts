import { Migration } from '@mikro-orm/migrations';

export class Migration20260213221500_TranslateUnits extends Migration {

    override async up(): Promise<void> {
        // Drop the old check constraint that only allows English values
        this.addSql('ALTER TABLE "raw_material" DROP CONSTRAINT IF EXISTS "raw_material_unit_check";');

        // Update values to Spanish
        this.addSql('UPDATE "raw_material" SET "unit" = \'unidad\' WHERE "unit" = \'unit\';');
        this.addSql('UPDATE "raw_material" SET "unit" = \'litro\' WHERE "unit" = \'liter\';');
        this.addSql('UPDATE "raw_material" SET "unit" = \'metro\' WHERE "unit" = \'meter\';');

        // Add the new check constraint with Spanish values
        this.addSql('ALTER TABLE "raw_material" ADD CONSTRAINT "raw_material_unit_check" CHECK (unit IN (\'unidad\', \'kg\', \'litro\', \'metro\'));');
    }

    override async down(): Promise<void> {
        this.addSql('ALTER TABLE "raw_material" DROP CONSTRAINT IF EXISTS "raw_material_unit_check";');

        this.addSql('UPDATE "raw_material" SET "unit" = \'unit\' WHERE "unit" = \'unidad\';');
        this.addSql('UPDATE "raw_material" SET "unit" = \'liter\' WHERE "unit" = \'litro\';');
        this.addSql('UPDATE "raw_material" SET "unit" = \'meter\' WHERE "unit" = \'metro\';');

        this.addSql('ALTER TABLE "raw_material" ADD CONSTRAINT "raw_material_unit_check" CHECK (unit IN (\'unit\', \'kg\', \'liter\', \'meter\'));');
    }

}
