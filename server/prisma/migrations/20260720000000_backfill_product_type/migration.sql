-- Backfill productType para productos existentes que tienen NULL (campo agregado sin migración de datos)

-- 1. Normalizar cadenas vacías a NULL
UPDATE "Product" SET "productType" = NULL WHERE "productType" = '';

-- 2. Cartas individuales: productos con rareza definida son cartas TCG
UPDATE "Product"
SET "productType" = 'carta'
WHERE "productType" IS NULL
  AND "rarity" IS NOT NULL
  AND "rarity" != '';

-- 3. Accesorios: productos en la categoría de accesorios
UPDATE "Product"
SET "productType" = 'accessory'
FROM "Category"
WHERE "Product"."categoryId" = "Category"."id"
  AND "Category"."slug" = 'accesorios'
  AND "Product"."productType" IS NULL;

-- Nota: displays, dados y binders sin rareza quedan con productType = NULL
-- y deben actualizarse manualmente desde el admin.
