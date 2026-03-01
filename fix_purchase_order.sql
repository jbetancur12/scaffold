ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS code VARCHAR(255);
UPDATE purchase_order SET code = CONCAT('OC-LEG-', SUBSTR(id::text, 1, 6)) WHERE code IS NULL;
ALTER TABLE purchase_order ALTER COLUMN code SET NOT NULL;
ALTER TABLE purchase_order DROP CONSTRAINT IF EXISTS purchase_order_code_unique;
ALTER TABLE purchase_order ADD CONSTRAINT purchase_order_code_unique UNIQUE (code);

ALTER TABLE operational_config ADD COLUMN IF NOT EXISTS purchase_order_prefix VARCHAR(255);
ALTER TABLE operational_config ADD COLUMN IF NOT EXISTS purchase_order_sequence INT NOT NULL DEFAULT 0;
