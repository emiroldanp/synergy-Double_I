-- CreateTable
CREATE TABLE "PokemonCardCache" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameLower" TEXT NOT NULL,
    "cardNumber" TEXT,
    "setName" TEXT,
    "setSeries" TEXT,
    "rarity" TEXT,
    "imageUrl" TEXT,
    "imageSmallUrl" TEXT,
    "externalUrl" TEXT,
    "releaseDate" TIMESTAMP(3),
    "metadata" JSONB,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PokemonCardCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PokemonCardCache_nameLower_idx" ON "PokemonCardCache"("nameLower");
