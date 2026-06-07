import prisma from '../db/index.js';

export interface MediaTypeCount {
  type: string;
  count: number;
}

export interface TagCount {
  tag: string;
  count: number;
}

export interface PlatformCount {
  platform: string;
  count: number;
}

export interface RecentItem {
  mediaId: string;
  title: string;
  type: string;
  addedAt: Date;
  collectionName: string;
  url?: string | null;
}

export interface UserStats {
  /** Total media items across all user-owned collections */
  totalMedia: number;
  /** Breakdown of media by type (FILM, SERIES, BOOK, ARTICLE, OTHER) */
  byType: MediaTypeCount[];
  /** Top 10 most-used tags across user's media */
  topTags: TagCount[];
  /** Top 10 most-used platforms across user's media */
  topPlatforms: PlatformCount[];
  /** Number of collections the user owns */
  collectionsOwned: number;
  /** Number of collections the user is a member of (non-owner, accepted) */
  collectionsShared: number;
  /** Average number of media items per owned collection */
  avgMediaPerCollection: number;
  /** 5 most recently added items to user's collections */
  recentItems: RecentItem[];
}

export const statsService = {
  /**
   * Get aggregated statistics for a specific user.
   * Runs parallel Prisma queries and merges results.
   *
   * @param userId - The authenticated user's ID
   * @returns A UserStats object with all computed metrics
   */
  async getUserStats(userId: string): Promise<UserStats> {
    // 1. Check database-backed cache
    try {
      const cache = await prisma.statsCache.findUnique({
        where: { userId },
      });

      const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
      if (cache && (Date.now() - new Date(cache.updatedAt).getTime()) < CACHE_TTL_MS) {
        return cache.data as any;
      }
    } catch (e) {
      console.error('Failed to read stats cache from database:', e);
    }

    // 2. Fetch owned collection IDs (needed for media access scoping)
    const ownedCollections = await prisma.collection.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    const ownedCollectionIds = ownedCollections.map((c) => c.id);

    // Run all expensive queries in parallel
    const [
      mediaInOwnedCollections,
      sharedCount,
      recentEntries,
    ] = await Promise.all([
      // All media entries across user-owned collections (with type/tags/platforms)
      prisma.collectionMedia.findMany({
        where: { collectionId: { in: ownedCollectionIds } },
        select: {
          addedAt: true,
          collectionId: true,
          collection: { select: { name: true } },
          media: {
            select: {
              id: true,
              title: true,
              type: true,
              tags: true,
              platforms: true,
            },
          },
        },
      }),

      // Shared collections: accepted memberships where user is NOT owner
      prisma.collectionUser.count({
        where: {
          userId,
          accepted: true,
          collection: { ownerId: { not: userId } },
        },
      }),

      // Recent additions across owned collections (fetch up to 50 to deduplicate by mediaId in JS)
      prisma.collectionMedia.findMany({
        where: { collectionId: { in: ownedCollectionIds } },
        orderBy: { addedAt: 'desc' },
        take: 50,
        select: {
          addedAt: true,
          collection: { select: { name: true } },
          media: { select: { id: true, title: true, type: true, url: true } },
        },
      }),
    ]);

    const totalMedia = mediaInOwnedCollections.length;
    const collectionsOwned = ownedCollections.length;
    const avgMediaPerCollection =
      collectionsOwned > 0
        ? Math.round((totalMedia / collectionsOwned) * 10) / 10
        : 0;

    // Aggregate media by type
    const typeCounts: Record<string, number> = {};
    // Aggregate tags
    const tagCounts: Record<string, number> = {};
    // Aggregate platforms
    const platformCounts: Record<string, number> = {};

    for (const entry of mediaInOwnedCollections) {
      const m = entry.media;
      // By type
      typeCounts[m.type] = (typeCounts[m.type] ?? 0) + 1;
      // Tags
      for (const tag of m.tags) {
        tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
      }
      // Platforms
      for (const platform of m.platforms) {
        platformCounts[platform] = (platformCounts[platform] ?? 0) + 1;
      }
    }

    const byType: MediaTypeCount[] = Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    const topTags: TagCount[] = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topPlatforms: PlatformCount[] = Object.entries(platformCounts)
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const seenMediaIds = new Set<string>();
    const recentItems: RecentItem[] = [];
    for (const entry of recentEntries) {
      if (!seenMediaIds.has(entry.media.id)) {
        seenMediaIds.add(entry.media.id);
        recentItems.push({
          mediaId: entry.media.id,
          title: entry.media.title,
          type: entry.media.type,
          addedAt: entry.addedAt,
          collectionName: entry.collection.name,
          url: entry.media.url,
        });
        if (recentItems.length === 5) {
          break;
        }
      }
    }

    const finalStats: UserStats = {
      totalMedia,
      byType,
      topTags,
      topPlatforms,
      collectionsOwned,
      collectionsShared: sharedCount,
      avgMediaPerCollection,
      recentItems,
    };

    // 3. Persist stats to cache table
    try {
      await prisma.statsCache.upsert({
        where: { userId },
        create: {
          userId,
          data: finalStats as any,
        },
        update: {
          data: finalStats as any,
          updatedAt: new Date(),
        },
      });
    } catch (e) {
      console.error('Failed to update stats cache in database:', e);
    }

    return finalStats;
  },
};
