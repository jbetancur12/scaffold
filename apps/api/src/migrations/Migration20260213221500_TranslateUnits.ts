import { Migration } from '@mikro-orm/migrations';

export class Migration20260213221500_TranslateUnits extends Migration {

    override async up(): Promise<void> {
        this.addSql('UPDATE "raw_material" SET "unit" = \'unidad\' WHERE "unit" = \'unit\';');
        this.addSql('UPDATE "raw_material" SET "unit" = \'litro\' WHERE "unit" = \'liter\';');
        this.addSql('UPDATE "raw_material" SET "unit" = \'metro\' WHERE "unit" = \'meter\';');
    }

    override async down(): Promise<void> {
        this.addSql('UPDATE "raw_material" SET "unit" = \'unit\' WHERE "unit" = \'unidad\';');
        this.addSql('UPDATE "raw_material" SET "unit" = \'liter\' WHERE "unit" = \'litro\';');
        this.addSql('UPDATE "raw_material" SET "unit" = \'meter\' WHERE "unit" = \'metro\';');
    }

}
