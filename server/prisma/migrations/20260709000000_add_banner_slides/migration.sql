-- CreateTable
CREATE TABLE "BannerSlide" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "ctaLabel" TEXT NOT NULL DEFAULT 'Ver ahora',
    "ctaHref" TEXT NOT NULL DEFAULT '/catalogo',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BannerSlide_pkey" PRIMARY KEY ("id")
);
