import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useAuthStore } from './auth';

export type CollectionVisibility = 'PUBLIC' | 'PRIVATE';

export interface CollectionMediaItem {
  id: string;
  position: number;
  addedAt: string;
  media: {
    id: string;
    title: string;
    type: string;
  };
}

export interface CollectionSummary {
  id: string;
  name: string;
  description?: string | null;
  tags: string[];
  visibility: CollectionVisibility;
  ownerId: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  _count?: {
    media?: number;
    members?: number;
  };
  media: CollectionMediaItem[];
}

export interface CollectionDetail extends CollectionSummary {}

interface UserCollectionResponse {
  collections: CollectionSummary[];
}

export const useCollectionsStore = defineStore('collections', () => {
  const collections = ref<CollectionSummary[]>([]);
  const selectedCollection = ref<CollectionDetail | null>(null);
  const selectedCollectionMedia = ref<CollectionMediaItem[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const createError = ref<string | null>(null);
  const authStore = useAuthStore();

  const collectionCount = computed(() => collections.value.length);
  const mediaCount = computed(() => collections.value.reduce((total, collection) => total + collection.media.length, 0));
  const ownedCollections = computed(() => collections.value.filter((collection) => collection.ownerId === authStore.user?.id));
  const sharedCollections = computed(() => collections.value.filter((collection) => collection.ownerId !== authStore.user?.id && collection.visibility !== 'PUBLIC'));
  const publicCollections = computed(() => collections.value.filter((collection) => collection.visibility === 'PUBLIC'));

  function buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (authStore.authToken) {
      headers.Authorization = `Bearer ${authStore.authToken}`;
    }

    return headers;
  }

  async function fetchCollections(pageSize = 100) {
    isLoading.value = true;
    error.value = null;

    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';
      const loadedCollections: CollectionSummary[] = [];
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        const response = await fetch(`${apiBaseUrl}/api/collections?page=${page}&pageSize=${pageSize}&sort=updatedAt&order=desc`, {
          headers: buildHeaders(),
          cache: 'no-store',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Failed to load collections (${response.status})`);
        }

        const payload = await response.json() as {
          data: Array<Omit<CollectionSummary, 'media'> & { media?: never }>;
          pages: number;
        };

        loadedCollections.push(...payload.data.map((collection) => ({
          ...collection,
          media: [],
          _count: collection._count ?? { media: 0, members: 0 },
        })));

        totalPages = payload.pages || 1;
        page += 1;
      }

      collections.value = loadedCollections;
      return loadedCollections;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load collections';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function createCollection(payload: {
    name: string;
    description?: string;
    tags?: string[];
    visibility: CollectionVisibility;
  }) {
    createError.value = null;
    isLoading.value = true;

    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';
      const response = await fetch(`${apiBaseUrl}/api/collections`, {
        method: 'POST',
        headers: buildHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string; message?: string } | null;
        throw new Error(payload?.error || payload?.message || 'Failed to create collection');
      }

      const createdCollection = await response.json() as Omit<CollectionSummary, 'media'> & { media?: never };
      collections.value = [{
        ...createdCollection,
        media: [],
        _count: createdCollection._count ?? { media: 0, members: 0 },
      }, ...collections.value];

      return createdCollection;
    } catch (err) {
      createError.value = err instanceof Error ? err.message : 'Failed to create collection';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchCollectionDetail(collectionId: string, force = false) {
    if (selectedCollection.value?.id !== collectionId || force) {
      isLoading.value = true;
    }
    error.value = null;

    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';
      const [collectionRes, mediaRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/collections/${collectionId}`, {
          cache: 'no-store',
          headers: buildHeaders(),
          credentials: 'include',
        }),
        fetch(`${apiBaseUrl}/api/collections/${collectionId}/media`, {
          cache: 'no-store',
          headers: buildHeaders(),
          credentials: 'include',
        }),
      ]);

      if (!collectionRes.ok) {
        throw new Error(`Failed to load collection (${collectionRes.status})`);
      }

      if (!mediaRes.ok) {
        throw new Error(`Failed to load collection media (${mediaRes.status})`);
      }

      const collectionPayload = await collectionRes.json() as CollectionSummary;
      const mediaPayload = await mediaRes.json() as CollectionMediaItem[];

      selectedCollection.value = collectionPayload;
      selectedCollectionMedia.value = mediaPayload;
      return { collection: collectionPayload, media: mediaPayload };
    } catch (err) {
      if (selectedCollection.value?.id === collectionId) {
        console.error('Background collection detail refresh failed:', err);
      } else {
        error.value = err instanceof Error ? err.message : 'Failed to load collection details';
      }
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchCollectionMedia(collectionId: string) {
    isLoading.value = true;
    error.value = null;

    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';
      const response = await fetch(`${apiBaseUrl}/api/collections/${collectionId}/media`, {
        cache: 'no-store',
        headers: buildHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to load collection media (${response.status})`);
      }

      selectedCollectionMedia.value = await response.json() as CollectionMediaItem[];
      return selectedCollectionMedia.value;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load collection media';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function loadOwnedCollections() {
    if (!authStore.user?.id) {
      throw new Error('Unable to determine the current user');
    }

    isLoading.value = true;
    error.value = null;

    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';
      const response = await fetch(`${apiBaseUrl}/api/users/${encodeURIComponent(authStore.user.id)}/owned-collections`, {
        cache: 'no-store',
        headers: buildHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to load owned collections (${response.status})`);
      }

      const payload = await response.json() as UserCollectionResponse;
      return payload.collections ?? [];
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load owned collections';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  function removeCollection(collectionId: string) {
    collections.value = collections.value.filter((collection) => collection.id !== collectionId);

    if (selectedCollection.value?.id === collectionId) {
      selectedCollection.value = null;
      selectedCollectionMedia.value = [];
    }
  }

  function clearCollections() {
    collections.value = [];
    selectedCollection.value = null;
    selectedCollectionMedia.value = [];
    error.value = null;
    createError.value = null;
  }

  return {
    collections,
    selectedCollection,
    selectedCollectionMedia,
    isLoading,
    error,
    createError,
    collectionCount,
    mediaCount,
    ownedCollections,
    sharedCollections,
    publicCollections,
    fetchCollections,
    createCollection,
    fetchCollectionDetail,
    fetchCollectionMedia,
    loadOwnedCollections,
    removeCollection,
    clearCollections,
  };
});
