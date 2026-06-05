import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { createRouteTestApp, fixtures, jsonHeaders } from '../test/route-test-utils.js';

const mockStats = {
  totalMedia: 10,
  byType: [
    { type: 'FILM', count: 5 },
    { type: 'SERIES', count: 3 },
    { type: 'BOOK', count: 2 },
  ],
  topTags: [
    { tag: 'sci-fi', count: 4 },
    { tag: 'drama', count: 2 },
  ],
  topPlatforms: [
    { platform: 'Netflix', count: 6 },
    { platform: 'Prime', count: 4 },
  ],
  collectionsOwned: 2,
  collectionsShared: 1,
  avgMediaPerCollection: 5.0,
  recentItems: [
    {
      mediaId: 'media-1',
      title: 'Inception',
      type: 'FILM',
      addedAt: '2026-03-10T10:00:00.000Z',
      collectionName: 'Favorites',
    }
  ],
};

const statsService = {
  getUserStats: mock(async () => mockStats),
};

mock.module('../services/stats.service.js', () => ({ statsService }));

const { statsRoutes } = await import('./stats.routes.js');

describe('statsRoutes', () => {
  beforeEach(() => {
    statsService.getUserStats.mockClear();
  });

  it('requires authentication to get statistics', async () => {
    const { app } = createRouteTestApp(statsRoutes);

    const response = await app.request('/');
    const body: any = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(statsService.getUserStats).not.toHaveBeenCalled();
  });

  it('returns statistics for authenticated user', async () => {
    const { app } = createRouteTestApp(statsRoutes, {
      user: fixtures.ownerUser,
      session: fixtures.session,
    });

    const response = await app.request('/');
    const body: any = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(mockStats);
    expect(statsService.getUserStats).toHaveBeenCalledWith(fixtures.ownerUser.id);
  });
});
