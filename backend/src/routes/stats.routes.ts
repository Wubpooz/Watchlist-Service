import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { statsService } from '../services/stats.service.js';
import type { AuthType } from '../middleware/auth.js';

export const statsRoutes = new Hono<{ Variables: AuthType }>();

// GET / - Get statistics for the authenticated user
statsRoutes.get(
  '/',
  describeRoute({
    tags: ['Stats'],
    description: 'Get aggregated library statistics for the authenticated user (media distribution, top tags, platforms, collection metrics)',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'User statistics',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                totalMedia: { type: 'number', description: 'Total media items in owned collections' },
                byType: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string', enum: ['FILM', 'SERIES', 'BOOK', 'ARTICLE', 'OTHER'] },
                      count: { type: 'number' },
                    },
                  },
                },
                topTags: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      tag: { type: 'string' },
                      count: { type: 'number' },
                    },
                  },
                },
                topPlatforms: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      platform: { type: 'string' },
                      count: { type: 'number' },
                    },
                  },
                },
                collectionsOwned: { type: 'number', description: 'Number of collections owned by user' },
                collectionsShared: { type: 'number', description: 'Number of shared/member collections' },
                avgMediaPerCollection: { type: 'number', description: 'Average media per owned collection' },
                recentItems: {
                  type: 'array',
                  description: '5 most recently added media items',
                  items: {
                    type: 'object',
                    properties: {
                      mediaId: { type: 'string' },
                      title: { type: 'string' },
                      type: { type: 'string' },
                      addedAt: { type: 'string', format: 'date-time' },
                      collectionName: { type: 'string' },
                    },
                  },
                },
              },
            } as any,
          },
        },
      },
      401: { description: 'Unauthorized — authentication required' },
    },
  }),
  async (c) => {
    const sessionUser = c.get('user');
    if (!sessionUser) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const stats = await statsService.getUserStats(sessionUser.id);
    c.header('Cache-Control', 'private, max-age=300');
    return c.json(stats, 200);
  }
);
