import { Migration } from '@mikro-orm/migrations';

export class Migration20260206040000_FixQuantityTypes extends Migration {

    async up(): Promise<void> {
        // Change BOMItem quantity to decimal
        this.addSql('alter table "bomitem" alter column "quantity" type numeric(10, 4);');

        // Change InventoryItem quantity to decimal
        this.addSql('alter table "inventory_item" alter column "quantity" type numeric(10, 4);');
    }

    async down(): Promise<void> {
        this.addSql('alter table "bomitem" alter column "quantity" type int;');
        this.addSql('alter table "inventory_item" alter column "quantity" type int;');
    }

}
