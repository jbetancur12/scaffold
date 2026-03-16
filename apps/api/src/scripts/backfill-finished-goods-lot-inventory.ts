import 'dotenv/config';
import { MikroORM } from '@mikro-orm/core';
import config from '../mikro-orm.config';
import { ProductionBatch } from '../modules/mrp/entities/production-batch.entity';
import { ShipmentItem } from '../modules/mrp/entities/shipment-item.entity';
import { FinishedGoodsLotInventory } from '../modules/mrp/entities/finished-goods-lot-inventory.entity';
import { Warehouse } from '../modules/mrp/entities/warehouse.entity';
import { WarehouseType } from '@scaffold/types';

async function run() {
    const orm = await MikroORM.init(config);
    const em = orm.em.fork();

    try {
        let warehouse = await em.findOne(Warehouse, { type: WarehouseType.FINISHED_GOODS });
        if (!warehouse) {
            warehouse = em.create(Warehouse, {
                name: 'Bodega de Producto Terminado',
                location: 'Default',
                type: WarehouseType.FINISHED_GOODS,
            } as Warehouse);
            em.persist(warehouse);
            await em.flush();
        }

        const batches = await em.find(ProductionBatch, {}, { populate: ['units'] });
        const batchIds = batches.map((b) => b.id);
        const shipmentItems = await em.find(ShipmentItem, { productionBatch: { $in: batchIds } }, { populate: ['productionBatch'] });

        const dispatchedByBatch = new Map<string, number>();
        for (const item of shipmentItems) {
            const key = item.productionBatch.id;
            dispatchedByBatch.set(key, (dispatchedByBatch.get(key) || 0) + Number(item.quantity || 0));
        }

        const lotRepo = em.getRepository(FinishedGoodsLotInventory);
        let created = 0;
        let updated = 0;
        let skipped = 0;

        for (const batch of batches) {
            const unitItems = batch.units.getItems();
            const completed = unitItems.length > 0
                ? unitItems.filter((u) => !u.rejected && u.packaged).length
                : Number(batch.producedQty > 0 ? batch.producedQty : batch.plannedQty);
            const dispatched = dispatchedByBatch.get(batch.id) || 0;
            const net = Math.max(0, Number(completed) - Number(dispatched));
            if (net <= 0) {
                skipped += 1;
                continue;
            }

            let row = await lotRepo.findOne({ productionBatch: batch.id, warehouse });
            if (row) {
                row.quantity = Number(row.quantity || 0) + Number(net);
                updated += 1;
            } else {
                row = lotRepo.create({
                    productionBatch: batch,
                    warehouse,
                    quantity: net,
                } as any);
                created += 1;
            }
            em.persist(row);
        }

        await em.flush();
        // eslint-disable-next-line no-console
        console.log(`[backfill] created=${created} updated=${updated} skipped=${skipped}`);
    } finally {
        await orm.close();
    }
}

run().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
});
