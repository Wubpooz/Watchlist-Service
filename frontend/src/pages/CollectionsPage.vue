<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppModal from '@/components/AppModal.vue';
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

type CollectionTab = 'all' | 'owned' | 'shared' | 'public';

const authStore = useAuthStore();
const collections = ref<CollectionItem[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const actionError = ref<string | null>(null);
const createError = ref<string | null>(null);
const createModalOpen = ref(false);
const creatingCollection = ref(false);
const newCollectionName = ref('');
const newCollectionDescription = ref('');
const newCollectionTags = ref('');
const newCollectionVisibility = ref<'PUBLIC' | 'PRIVATE'>('PRIVATE');
const removingMediaIds = ref<string[]>([]);
const activeTab = ref<CollectionTab>('all');

const visibilityOptions = ['PUBLIC', 'PRIVATE'] as const;
const collectionTabs: Array<{ key: CollectionTab; label: string }> = [
  { key: 'all', label: 'All Collections' },
  { key: 'owned', label: 'Owned by me' },
  { key: 'shared', label: 'Shared with me' },
  { key: 'public', label: 'Public' },
];

const currentUserLabel = computed(() => authStore.user?.name || authStore.user?.email || 'your account');
const collectionCount = computed(() => collections.value.length);
const mediaCount = computed(() => collections.value.reduce((total, collection) => total + collection.media.length, 0));
const ownedCollections = computed(() => collections.value.filter((collection) => collection.ownerId === authStore.user?.id));
const sharedCollections = computed(() => collections.value.filter((collection) => collection.ownerId !== authStore.user?.id && collection.visibility !== 'PUBLIC'));
const publicCollections = computed(() => collections.value.filter((collection) => collection.visibility === 'PUBLIC'));

const filteredCollections = computed(() => {
  if (activeTab.value === 'owned') {
    return ownedCollections.value;
  }

  if (activeTab.value === 'shared') {
    return sharedCollections.value;
  }

  if (activeTab.value === 'public') {
    return publicCollections.value;
  }

  return collections.value;
});

const activeTabLabel = computed(() => collectionTabs.find((tab) => tab.key === activeTab.value)?.label ?? 'All Collections');
const collectionGridCount = computed(() => filteredCollections.value.length);

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authStore.authToken) {
    headers.Authorization = `Bearer ${authStore.authToken}`;
  }

  return headers;
}

function isRemovingMedia(collectionMediaId: string): boolean {
  return removingMediaIds.value.includes(collectionMediaId);
}

function openCreateCollectionModal(): void {
  createError.value = null;
  createModalOpen.value = true;
}

function closeCreateCollectionModal(): void {
  if (creatingCollection.value) {
    return;
  }

  createModalOpen.value = false;
  createError.value = null;
}

function resetCreateCollectionForm(): void {
  newCollectionName.value = '';
  newCollectionDescription.value = '';
  newCollectionTags.value = '';
  newCollectionVisibility.value = 'PRIVATE';
}

function normalizeTags(tagsInput: string): string[] {
  return tagsInput
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

async function fetchCollections(): Promise<CollectionItem[]> {
  const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';
  const pageSize = 100;
  const loadedCollections: CollectionItem[] = [];
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
    loadedCollections.push(...payload.data.map((collection) => ({
      ...collection,
      media: [],
    })));

    totalPages = payload.pages || 1;
    page += 1;
  }

  const mediaResults = await Promise.allSettled(
    loadedCollections.map(async (collection) => {
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
      ...loadedCollections[index],
      media: [],
    };
  });
}

async function createCollection(): Promise<void> {
  const name = newCollectionName.value.trim();
  const description = newCollectionDescription.value.trim();
  const tags = normalizeTags(newCollectionTags.value);

  if (!name) {
    createError.value = 'Collection name is required';
    return;
  }

  const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';
  createError.value = null;
  creatingCollection.value = true;

  try {
    const response = await fetch(`${apiBaseUrl}/api/collections`, {
      method: 'POST',
      headers: buildHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        name,
        ...(description ? { description } : {}),
        ...(tags.length ? { tags } : {}),
        visibility: newCollectionVisibility.value,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string; message?: string } | null;
      throw new Error(payload?.error || payload?.message || 'Failed to create collection');
    }

    const createdCollection = await response.json() as Omit<CollectionItem, 'media'> & { media?: never };
    collections.value = [{
      ...createdCollection,
      media: [],
      _count: createdCollection._count ?? { media: 0, members: 0 },
    }, ...collections.value];

    resetCreateCollectionForm();
    createModalOpen.value = false;
  } catch (err) {
    createError.value = err instanceof Error ? err.message : 'Failed to create collection';
  } finally {
    creatingCollection.value = false;
  }
}

onMounted(async () => {
  try {
    collections.value = await fetchCollections();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load collections';
  } finally {
    loading.value = false;
  }
});

function formatMediaType(type: string): string {
  return type.replace(/_/g, ' ').toLowerCase();
}

function collectionAccessLabel(collection: CollectionItem): string {
  if (collection.ownerId === authStore.user?.id) {
    return 'Owned by me';
  }

  if (collection.visibility === 'PUBLIC') {
    return 'Public';
  }

  return 'Shared with me';
}

function collectionVisibilityLabel(visibility: string): string {
  return visibility.charAt(0) + visibility.slice(1).toLowerCase();
}

function tabCount(tab: CollectionTab): number {
  if (tab === 'owned') {
    return ownedCollections.value.length;
  }

  if (tab === 'shared') {
    return sharedCollections.value.length;
  }

  if (tab === 'public') {
    return publicCollections.value.length;
  }

  return collections.value.length;
}

async function removeMediaFromCollection(collectionId: string, collectionMediaId: string, mediaTitle: string): Promise<void> {
  const confirmed = window.confirm(`Remove ${mediaTitle} from this collection?`);
  if (!confirmed) {
    return;
  }

  const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';
  actionError.value = null;
  removingMediaIds.value = [...removingMediaIds.value, collectionMediaId];

  try {
    const response = await fetch(`${apiBaseUrl}/api/collections/${collectionId}/media/${collectionMediaId}`, {
      method: 'DELETE',
      headers: buildHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string; message?: string } | null;
      throw new Error(payload?.error || payload?.message || 'Failed to remove media from collection');
    }

    collections.value = collections.value.map((collection) => {
      if (collection.id !== collectionId) {
        return collection;
      }

      const nextMedia = collection.media.filter((entry) => entry.id !== collectionMediaId);
      const nextCount = collection._count?.media;

      return {
        ...collection,
        media: nextMedia,
        _count: nextCount === undefined
          ? collection._count
          : {
              ...collection._count,
              media: Math.max(0, nextCount - 1),
            },
      };
    });
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Failed to remove media from collection';
  } finally {
    removingMediaIds.value = removingMediaIds.value.filter((id) => id !== collectionMediaId);
  }
}
</script>

<template>
  <div class="page-container">
    <header class="hero">
      <div>
        <p class="eyebrow">Collections</p>
        <h1>My Collections</h1>
        <p class="hero-copy">
          Browse collections owned by {{ currentUserLabel }} or shared with you, and switch between the tabs below.
        </p>
      </div>

      <div class="hero-side">
        <div class="hero-stats">
          <div class="stat-card">
            <span class="stat-value">{{ collectionCount }}</span>
            <span class="stat-label">Visible collections</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ mediaCount }}</span>
            <span class="stat-label">Media items</span>
          </div>
        </div>

        <button type="button" class="create-button" @click="openCreateCollectionModal">
          New collection
        </button>
      </div>
    </header>

    <section class="tab-shell" aria-label="Collection filters">
      <div class="tab-list" role="tablist" aria-label="Collection categories">
        <button
          v-for="tab in collectionTabs"
          :key="tab.key"
          type="button"
          class="tab-button"
          :class="{ active: activeTab === tab.key }"
          role="tab"
          :aria-selected="activeTab === tab.key"
          @click="activeTab = tab.key"
        >
          <span>{{ tab.label }}</span>
          <strong>{{ tabCount(tab.key) }}</strong>
        </button>
      </div>

      <div class="tab-meta">
        <span>{{ activeTabLabel }}</span>
        <span>{{ collectionGridCount }} results</span>
      </div>
    </section>

    <section v-if="loading" class="state-card">
      <p>Loading your collections...</p>
    </section>

    <section v-else-if="error" class="state-card state-error">
      <p>{{ error }}</p>
    </section>

    <section v-else-if="actionError" class="state-card state-error action-state">
      <p>{{ actionError }}</p>
    </section>

    <section v-else-if="filteredCollections.length === 0" class="state-card state-empty">
      <p>No collections found yet.</p>
      <span>Create your first collection to start grouping media together.</span>
    </section>

    <section v-else class="collection-grid">
      <article v-for="collection in filteredCollections" :key="collection.id" class="collection-card">
        <div class="collection-header">
          <div>
            <p class="collection-kicker">{{ collectionAccessLabel(collection) }}</p>
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
            <div
              v-for="entry in collection.media"
              :key="entry.id"
              class="media-item"
            >
              <RouterLink
                :to="`/media/${entry.media.id}`"
                class="media-link"
                :aria-label="`Open details for ${entry.media.title}`"
              >
                <div class="media-title-row">
                  <h4>{{ entry.media.title }}</h4>
                  <span class="media-type">{{ formatMediaType(entry.media.type) }}</span>
                </div>
                <p v-if="entry.media.description" class="media-description">
                  {{ entry.media.description }}
                </p>
              </RouterLink>

              <button
                type="button"
                class="media-remove-button"
                :disabled="isRemovingMedia(entry.id)"
                :aria-label="`Remove ${entry.media.title} from ${collection.name}`"
                @click="removeMediaFromCollection(collection.id, entry.id, entry.media.title)"
              >
                {{ isRemovingMedia(entry.id) ? 'Removing...' : 'Remove' }}
              </button>
            </div>
          </div>

          <div v-else class="media-empty">
            <p>This collection does not contain any media yet.</p>
          </div>
        </div>
      </article>
    </section>

    <AppModal v-model="createModalOpen" title="Create collection" @close="createError = null">
      <form id="create-collection-form" class="collection-form" @submit.prevent="createCollection">
        <div class="field-group">
          <label for="collection-name">Name</label>
          <input
            id="collection-name"
            v-model="newCollectionName"
            type="text"
            name="name"
            maxlength="200"
            placeholder="My Favorites"
            required
          >
        </div>

        <div class="field-group">
          <label for="collection-description">Description</label>
          <textarea
            id="collection-description"
            v-model="newCollectionDescription"
            name="description"
            rows="4"
            maxlength="1000"
            placeholder="What will this collection hold?"
          ></textarea>
        </div>

        <div class="field-group">
          <label for="collection-tags">Tags</label>
          <input
            id="collection-tags"
            v-model="newCollectionTags"
            type="text"
            name="tags"
            maxlength="500"
            placeholder="favorites, movies, watchlist"
          >
          <span class="field-hint">Separate tags with commas.</span>
        </div>

        <div class="field-group">
          <label for="collection-visibility">Visibility</label>
          <select id="collection-visibility" v-model="newCollectionVisibility" name="visibility">
            <option v-for="option in visibilityOptions" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </div>

        <p v-if="createError" class="form-error">{{ createError }}</p>
      </form>

      <template #footer>
        <button type="button" class="secondary-button" :disabled="creatingCollection" @click="closeCreateCollectionModal">
          Cancel
        </button>
        <button type="submit" form="create-collection-form" class="primary-button" :disabled="creatingCollection">
          {{ creatingCollection ? 'Creating...' : 'Create collection' }}
        </button>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.page-container {
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
}

.hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 18px;
  padding: 28px 28px 24px;
  border: 1px solid #dfe5ee;
  border-radius: 20px;
  background:
    radial-gradient(circle at top right, rgba(15, 98, 254, 0.1), transparent 30%),
    linear-gradient(135deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.hero-side {
  display: grid;
  gap: 14px;
  justify-items: end;
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

.tab-shell {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 28px;
  border-bottom: 1px solid #d6dde8;
}

.tab-list {
  display: flex;
  gap: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.tab-list::-webkit-scrollbar {
  display: none;
}

.tab-button {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px 13px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #667085;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
}

.tab-button strong {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  height: 1.5rem;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: #edf2f7;
  color: #344054;
  font-size: 12px;
  font-weight: 600;
}

.tab-button:hover {
  color: #1d2939;
  background: rgba(15, 98, 254, 0.04);
}

.tab-button.active {
  color: #0f62fe;
  border-bottom-color: #0f62fe;
}

.tab-button.active strong {
  background: rgba(15, 98, 254, 0.12);
  color: #0f62fe;
}

.tab-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 14px;
  color: #667085;
  font-size: 13px;
  white-space: nowrap;
}

.create-button,
.primary-button,
.secondary-button {
  border: none;
  border-radius: 999px;
  font-weight: 700;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

.create-button {
  padding: 12px 18px;
  border: 1px solid #0f62fe;
  background: linear-gradient(135deg, #0f62fe 0%, #2563eb 100%);
  color: #ffffff;
  box-shadow: 0 12px 24px rgba(15, 98, 254, 0.24);
}

.create-button:hover,
.primary-button:hover,
.secondary-button:hover {
  transform: translateY(-1px);
}

.create-button:disabled,
.primary-button:disabled,
.secondary-button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
  transform: none;
}

.create-button:focus-visible,
.tab-button:focus-visible,
.media-remove-button:focus-visible {
  outline: 2px solid #0f62fe;
  outline-offset: 2px;
}

.collection-form {
  display: grid;
  gap: 16px;
}

.field-group {
  display: grid;
  gap: 8px;
}

.field-group label {
  font-size: 0.95rem;
  font-weight: 700;
  color: #111827;
}

.field-group input,
.field-group textarea,
.field-group select {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 14px;
  padding: 12px 14px;
  background: #ffffff;
  color: #111827;
  font: inherit;
}

.field-group input:focus,
.field-group textarea:focus,
.field-group select:focus {
  outline: 2px solid rgba(15, 98, 254, 0.18);
  border-color: #0f62fe;
}

.field-hint {
  font-size: 0.85rem;
  color: #6b7280;
}

.form-error {
  margin: 0;
  color: #b91c1c;
  font-weight: 600;
}

.primary-button {
  padding: 12px 18px;
  background: #111827;
  color: #ffffff;
}

.secondary-button {
  padding: 12px 18px;
  background: #e5e7eb;
  color: #111827;
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

.action-state {
  margin-bottom: 20px;
}

.collection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
  gap: 20px;
}

.collection-card {
  padding: 20px;
  border: 1px solid #d9e1ec;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%);
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
  color: #0f62fe;
}

.collection-card h2 {
  margin: 0;
  font-size: 1.2rem;
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
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
}

.media-link {
  flex: 1;
  display: block;
  text-decoration: none;
  color: inherit;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.media-link:hover,
.media-link:focus-visible {
  transform: translateY(-1px);
  border-color: #bfdbfe;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.media-link:hover h4 {
  color: #0f62fe;
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

.media-remove-button {
  flex-shrink: 0;
  align-self: center;
  padding: 10px 14px;
  border: 1px solid #fecaca;
  border-radius: 999px;
  background: #fff1f2;
  color: #b91c1c;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease, opacity 0.18s ease;
}

.media-remove-button:hover:not(:disabled),
.media-remove-button:focus-visible:not(:disabled) {
  background: #ffe4e6;
  border-color: #fca5a5;
  color: #991b1b;
}

.media-remove-button:disabled {
  cursor: wait;
  opacity: 0.72;
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

  .hero-side {
    width: 100%;
    min-width: 0;
  }
}

@media (max-width: 640px) {
  .page-container {

  .tab-shell {
    flex-direction: column;
    align-items: stretch;
  }

  .tab-meta {
    padding-bottom: 0;
  }
    padding: 0 8px;
  }

  .hero,
  .collection-card,
  .state-card {
    padding: 20px;
    border-radius: 16px;
  }

  .tab-shell {
    margin-bottom: 22px;
  }

  .collection-header,
  .section-title,
  .media-title-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .media-item {
    flex-direction: column;
  }

  .media-remove-button {
    align-self: flex-start;
  }

  .collection-count {
    min-width: 0;
  }
}
</style>
