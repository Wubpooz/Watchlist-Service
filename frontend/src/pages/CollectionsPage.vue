<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAuthStore } from '@/stores/auth';

interface MediaItem {
  id: string;
  title: string;
  type: string;
  description?: string | null;
}

interface CollectionMediaItem {
  id: string;
  position: number;
  addedAt: string;
  media: MediaItem;
}

interface CollectionItem {
  id: string;
  name: string;
  description?: string | null;
  tags: string[];
  visibility: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    media?: number;
    members?: number;
  };
  media: CollectionMediaItem[];
}

interface CollectionListResponse {
  data: Array<Omit<CollectionItem, 'media'> & { media?: never }>;
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  cursor?: string | null;
}

const authStore = useAuthStore();
const collections = ref<CollectionItem[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const currentUserLabel = computed(() => authStore.user?.name || authStore.user?.email || 'your account');
const collectionCount = computed(() => collections.value.length);
const mediaCount = computed(() => collections.value.reduce((total, collection) => total + collection.media.length, 0));

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authStore.authToken) {
    headers.Authorization = `Bearer ${authStore.authToken}`;
  }

  return headers;
}

async function fetchOwnedCollections(): Promise<CollectionItem[]> {
  const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';
  const pageSize = 100;
  const ownedCollections: CollectionItem[] = [];
  let page = 1;
  let totalPages = 1;

  if (!authStore.user?.id) {
    throw new Error('Unable to determine the current user');
  }

  while (page <= totalPages) {
    const response = await fetch(`${apiBaseUrl}/api/collections?page=${page}&pageSize=${pageSize}&sort=updatedAt&order=desc`, {
      headers: buildHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to load collections (${response.status})`);
    }

    const payload = await response.json() as CollectionListResponse;
    const ownedPage = payload.data.filter((collection) => collection.ownerId === authStore.user!.id);

    ownedCollections.push(...ownedPage.map((collection) => ({
      ...collection,
      media: [],
    })));

    totalPages = payload.pages || 1;
    page += 1;
  }

  const mediaResults = await Promise.allSettled(
    ownedCollections.map(async (collection) => {
      const mediaResponse = await fetch(`${apiBaseUrl}/api/collections/${collection.id}/media`, {
        headers: buildHeaders(),
        credentials: 'include',
      });

      if (!mediaResponse.ok) {
        throw new Error(`Failed to load media for ${collection.name}`);
      }

      const mediaItems = await mediaResponse.json() as CollectionMediaItem[];
      return {
        ...collection,
        media: mediaItems,
      };
    })
  );

  return mediaResults.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }

    return {
      ...ownedCollections[index],
      media: [],
    };
  });
}

onMounted(async () => {
  try {
    collections.value = await fetchOwnedCollections();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load collections';
  } finally {
    loading.value = false;
  }
});

function formatMediaType(type: string): string {
  return type.replace(/_/g, ' ').toLowerCase();
}

function collectionVisibilityLabel(visibility: string): string {
  return visibility.charAt(0) + visibility.slice(1).toLowerCase();
}
</script>

<template>
  <div class="page-container">
    <header class="hero">
      <div>
        <p class="eyebrow">Collections</p>
        <h1>My Collections</h1>
        <p class="hero-copy">
          Browse the collections owned by {{ currentUserLabel }} and the media stored inside each one.
        </p>
      </div>

      <div class="hero-stats">
        <div class="stat-card">
          <span class="stat-value">{{ collectionCount }}</span>
          <span class="stat-label">Collections</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ mediaCount }}</span>
          <span class="stat-label">Media items</span>
        </div>
      </div>
    </header>

    <section v-if="loading" class="state-card">
      <p>Loading your collections...</p>
    </section>

    <section v-else-if="error" class="state-card state-error">
      <p>{{ error }}</p>
    </section>

    <section v-else-if="collections.length === 0" class="state-card state-empty">
      <p>No collections found yet.</p>
      <span>Create your first collection to start grouping media together.</span>
    </section>

    <section v-else class="collection-grid">
      <article v-for="collection in collections" :key="collection.id" class="collection-card">
        <div class="collection-header">
          <div>
            <p class="collection-kicker">{{ collectionVisibilityLabel(collection.visibility) }}</p>
            <h2>{{ collection.name }}</h2>
          </div>
          <div class="collection-count">
            <span>{{ collection.media.length }}</span>
            <small>items</small>
          </div>
        </div>

        <p v-if="collection.description" class="collection-description">
          {{ collection.description }}
        </p>

        <div v-if="collection.tags.length" class="tag-list">
          <span v-for="tag in collection.tags" :key="tag" class="tag-chip">{{ tag }}</span>
        </div>

        <div class="media-section">
          <div class="section-title">
            <h3>Contained media</h3>
            <span>{{ collection._count?.media ?? collection.media.length }} total</span>
          </div>

          <div v-if="collection.media.length" class="media-list">
            <div v-for="entry in collection.media" :key="entry.id" class="media-item">
              <div class="media-title-row">
                <h4>{{ entry.media.title }}</h4>
                <span class="media-type">{{ formatMediaType(entry.media.type) }}</span>
              </div>
              <p v-if="entry.media.description" class="media-description">
                {{ entry.media.description }}
              </p>
            </div>
          </div>

          <div v-else class="media-empty">
            <p>This collection does not contain any media yet.</p>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.page-container {
  max-width: 1200px;
  margin: 0 auto;
}

.hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
  padding: 28px 28px 24px;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #0f62fe;
}

.hero h1 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1.05;
  color: #111827;
}

.hero-copy {
  max-width: 62ch;
  margin: 12px 0 0;
  color: #4b5563;
  line-height: 1.6;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(120px, 1fr));
  gap: 12px;
  min-width: 280px;
}

.stat-card {
  padding: 16px 18px;
  border-radius: 16px;
  background: #111827;
  color: #f9fafb;
}

.stat-value {
  display: block;
  font-size: 1.8rem;
  font-weight: 700;
  line-height: 1;
}

.stat-label {
  display: block;
  margin-top: 6px;
  font-size: 0.9rem;
  color: #cbd5e1;
}

.state-card {
  padding: 28px;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  background: #ffffff;
  color: #374151;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
}

.state-error {
  border-color: #fecaca;
  background: #fef2f2;
  color: #991b1b;
}

.state-empty {
  color: #6b7280;
}

.state-empty span {
  display: block;
  margin-top: 6px;
  color: #9ca3af;
}

.collection-grid {
  display: grid;
  gap: 20px;
}

.collection-card {
  padding: 24px;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
}

.collection-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.collection-kicker {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6b7280;
}

.collection-card h2 {
  margin: 0;
  font-size: 1.4rem;
  color: #111827;
}

.collection-count {
  min-width: 72px;
  padding: 12px 14px;
  border-radius: 16px;
  background: #eff6ff;
  text-align: center;
  color: #0f62fe;
}

.collection-count span {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1;
}

.collection-count small {
  display: block;
  margin-top: 4px;
}

.collection-description {
  margin: 14px 0 0;
  color: #4b5563;
  line-height: 1.6;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.tag-chip {
  padding: 6px 10px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #374151;
  font-size: 12px;
  font-weight: 600;
}

.media-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.section-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.section-title h3 {
  margin: 0;
  font-size: 1rem;
  color: #111827;
}

.section-title span {
  font-size: 0.9rem;
  color: #6b7280;
}

.media-list {
  display: grid;
  gap: 12px;
}

.media-item {
  padding: 14px 16px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
}

.media-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.media-item h4 {
  margin: 0;
  font-size: 0.98rem;
  color: #111827;
}

.media-type {
  flex-shrink: 0;
  padding: 5px 8px;
  border-radius: 999px;
  background: #e0f2fe;
  color: #075985;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.media-description {
  margin: 8px 0 0;
  color: #6b7280;
  line-height: 1.5;
}

.media-empty {
  padding: 18px;
  border-radius: 16px;
  background: #f9fafb;
  color: #6b7280;
  text-align: center;
}

@media (max-width: 900px) {
  .hero {
    align-items: stretch;
    flex-direction: column;
  }

  .hero-stats {
    width: 100%;
    min-width: 0;
  }
}

@media (max-width: 640px) {
  .page-container {
    padding: 0 8px;
  }

  .hero,
  .collection-card,
  .state-card {
    padding: 20px;
    border-radius: 16px;
  }

  .collection-header,
  .section-title,
  .media-title-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .collection-count {
    min-width: 0;
  }
}
</style>
