-- CreateTable
CREATE TABLE "stats_cache" (
    "user_id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stats_cache_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE INDEX "collection_media_collectionId_added_at_idx" ON "collection_media"("collectionId", "added_at");

-- CreateIndex
CREATE INDEX "collection_media_mediaId_idx" ON "collection_media"("mediaId");

-- CreateIndex
CREATE INDEX "collection_users_userId_accepted_idx" ON "collection_users"("userId", "accepted");

-- CreateIndex
CREATE INDEX "collections_ownerId_idx" ON "collections"("ownerId");

-- CreateIndex
CREATE INDEX "media_type_idx" ON "media"("type");

-- CreateIndex
CREATE INDEX "media_created_at_idx" ON "media"("created_at");

-- CreateIndex
CREATE INDEX "media_title_idx" ON "media"("title");
