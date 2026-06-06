import { beforeEach, describe, expect, it, mock } from 'bun:test';

const prismaMock = {
  statsCache: {
    findUnique: mock(async (): Promise<any> => null),
    upsert: mock(async (): Promise<any> => ({})),
  },
  collection: {
    findMany: mock(async (): Promise<any> => []),
  },
  collectionMedia: {
    findMany: mock(async (): Promise<any> => []),
  },
  collectionUser: {
    count: mock(async (): Promise<any> => 0),
  },
};

mock.module('../db', () => ({
  default: prismaMock,
}));

const STATS_SERVICE_MODULE = './stats.service?unit';

describe('statsService Caching', () => {
  beforeEach(() => {
    prismaMock.statsCache.findUnique.mockReset();
    prismaMock.statsCache.upsert.mockReset();
    prismaMock.collection.findMany.mockReset();
    prismaMock.collectionMedia.findMany.mockReset();
    prismaMock.collectionUser.count.mockReset();
  });

  it('serves stats from cache when cache exists and is fresh (less than 5 mins old)', async () => {
    const freshDate = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes old
    const cachedStats = {
      totalMedia: 42,
      byType: [],
      topTags: [],
      topPlatforms: [],
      collectionsOwned: 3,
      collectionsShared: 1,
      avgMediaPerCollection: 14,
      recentItems: [],
    };

    prismaMock.statsCache.findUnique.mockResolvedValueOnce({
      userId: 'user-1',
      data: cachedStats,
      updatedAt: freshDate,
    });

    const { statsService } = await import(STATS_SERVICE_MODULE);
    const result = await statsService.getUserStats('user-1');

    expect(result).toEqual(cachedStats as any);
    expect(prismaMock.statsCache.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
    // Ensure no live calculation queries are run
    expect(prismaMock.collection.findMany).not.toHaveBeenCalled();
    expect(prismaMock.collectionMedia.findMany).not.toHaveBeenCalled();
    expect(prismaMock.statsCache.upsert).not.toHaveBeenCalled();
  });

  it('re-calculates and updates cache when cache is expired (more than 5 mins old)', async () => {
    const expiredDate = new Date(Date.now() - 6 * 60 * 1000); // 6 minutes old
    const cachedStats = {
      totalMedia: 42,
    };

    prismaMock.statsCache.findUnique.mockResolvedValueOnce({
      userId: 'user-1',
      data: cachedStats,
      updatedAt: expiredDate,
    });

    // Mock live aggregation queries
    prismaMock.collection.findMany.mockResolvedValueOnce([{ id: 'col-1' }]);
    prismaMock.collectionMedia.findMany.mockResolvedValue([
      {
        addedAt: new Date(),
        collectionId: 'col-1',
        collection: { name: 'Main' },
        media: {
          id: 'media-1',
          title: 'Title',
          type: 'FILM',
          tags: ['action'],
          platforms: ['Netflix'],
        },
      },
    ]);
    prismaMock.collectionUser.count.mockResolvedValueOnce(2);

    const { statsService } = await import(STATS_SERVICE_MODULE);
    const result = await statsService.getUserStats('user-1');

    expect(result.totalMedia).toBe(1);
    expect(result.collectionsOwned).toBe(1);
    expect(result.collectionsShared).toBe(2);

    // Verify cache is upserted
    expect(prismaMock.statsCache.upsert).toHaveBeenCalled();
  });

  it('re-calculates and updates cache when cache does not exist', async () => {
    prismaMock.statsCache.findUnique.mockResolvedValueOnce(null);

    // Mock live aggregation queries
    prismaMock.collection.findMany.mockResolvedValueOnce([]);
    prismaMock.collectionMedia.findMany.mockResolvedValue([]);
    prismaMock.collectionUser.count.mockResolvedValueOnce(0);

    const { statsService } = await import(STATS_SERVICE_MODULE);
    const result = await statsService.getUserStats('user-1');

    expect(result.totalMedia).toBe(0);
    expect(prismaMock.statsCache.upsert).toHaveBeenCalled();
  });
});
