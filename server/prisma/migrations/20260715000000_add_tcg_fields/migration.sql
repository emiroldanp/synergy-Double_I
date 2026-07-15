-- AddColumn: campos TCG para importación desde API
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "externalSource" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "tcgMetadata" JSONB;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "marketPriceUsd" DECIMAL(10,2);
