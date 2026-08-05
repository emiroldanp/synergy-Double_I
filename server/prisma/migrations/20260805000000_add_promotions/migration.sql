-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "badgeLabel" TEXT NOT NULL DEFAULT 'Oferta especial',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ctaHref" TEXT NOT NULL DEFAULT '/catalogo',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);
