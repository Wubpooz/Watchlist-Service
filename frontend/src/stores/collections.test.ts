import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useCollectionsStore } from '@/stores/collections';
import { useAuthStore } from '@/stores/auth';

describe('Collections Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('initializes with empty collection state', () => {
    const collectionsStore = useCollectionsStore();

    expect(collectionsStore.collections).toEqual([]);
    expect(collectionsStore.collectionCount).toBe(0);
    expect(collectionsStore.mediaCount).toBe(0);
    expect(collectionsStore.error).toBeNull();
    expect(collectionsStore.createError).toBeNull();
  });

  it('computes owned collections based on authenticated user', () => {
    const authStore = useAuthStore();
    authStore.user = { id: 'owner', email: 'owner@example.com' };

    const collectionsStore = useCollectionsStore();
    collectionsStore.collections = [
      {
        id: '1',
        name: 'Owned Collection',
        description: null,
        tags: [],
        visibility: 'PRIVATE',
        ownerId: 'owner',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        media: [],
        _count: { media: 0, members: 0 },
      },
      {
        id: '2',
        name: 'Shared Collection',
        description: null,
        tags: [],
        visibility: 'PRIVATE',
        ownerId: 'other-user',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        media: [],
        _count: { media: 0, members: 0 },
      },
    ];

    expect(collectionsStore.collectionCount).toBe(2);
    expect(collectionsStore.ownedCollections.length).toBe(1);
    expect(collectionsStore.sharedCollections.length).toBe(1);
  });

  it('clears collection state', () => {
    const collectionsStore = useCollectionsStore();
    collectionsStore.collections = [
      {
        id: '1',
        name: 'Clearing Collection',
        description: null,
        tags: [],
        visibility: 'PUBLIC',
        ownerId: 'owner',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        media: [],
        _count: { media: 0, members: 0 },
      },
    ];
    collectionsStore.selectedCollection = collectionsStore.collections[0];
    collectionsStore.selectedCollectionMedia = [
      {
        id: '1',
        position: 0,
        addedAt: '2026-01-01T00:00:00.000Z',
        media: { id: 'm1', title: 'Media Item', type: 'MOVIE' },
      },
    ];
    collectionsStore.error = 'Some error';
    collectionsStore.createError = 'Create error';

    collectionsStore.clearCollections();

    expect(collectionsStore.collections).toEqual([]);
    expect(collectionsStore.selectedCollection).toBeNull();
    expect(collectionsStore.selectedCollectionMedia).toEqual([]);
    expect(collectionsStore.error).toBeNull();
    expect(collectionsStore.createError).toBeNull();
  });
});
