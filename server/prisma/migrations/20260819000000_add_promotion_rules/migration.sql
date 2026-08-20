-- CreateEnum: tipo de regla funcional de una promoción (null = solo banner visual)
CREATE TYPE "PromotionType" AS ENUM ('free_shipping', 'percentage_off', 'fixed_off');

-- AlterTable: campos de regla en Promotion — todos nullable, así las promociones
-- existentes (creadas antes de esta migración) quedan como "solo visual"
ALTER TABLE "Promotion" ADD COLUMN "type" "PromotionType";
ALTER TABLE "Promotion" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "Promotion" ADD COLUMN "value" DECIMAL(10,2);
ALTER TABLE "Promotion" ADD COLUMN "minAmount" DECIMAL(10,2);
ALTER TABLE "Promotion" ADD COLUMN "startsAt" TIMESTAMP(3);
ALTER TABLE "Promotion" ADD COLUMN "endsAt" TIMESTAMP(3);

-- AddForeignKey: relación Promotion → Category (alcance de descuento por categoría)
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: registrar qué promoción automática se aplicó a cada orden
ALTER TABLE "Order" ADD COLUMN "promotionId" TEXT;
ALTER TABLE "Order" ADD CONSTRAINT "Order_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
