<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import AppModal from '@/components/AppModal.vue';

const route = useRoute();
const router = useRouter();
const mediaId = computed(() => route.params.id as string);

type Media = {
  id: string;
  title: string;
  description?: string | null;
  type?: string | null;
  releaseDate?: string | null;
  directorAuthor?: string | null;
  tags?: string[];
  platforms?: string[];
  scores?: Record<string, number> | null;
  url?: string | null;
};

type CollectionSummary = {
  id: string;
  name: string;
};

type CollectionToAdd = {
  id: string;
  name: string;
  description?: string | null;
  tags?: string[];
  visisibility: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  _count?: {
    media?: number;
    members?: number;
  };
  media: Media[];
}

const media = ref<Media | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const authStore = useAuthStore();
const collectionsWithMedia = ref<CollectionSummary[]>([]); // For future use when we fetch collections containing this media
const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';

const addToCollectionError = ref<string | null>(null);
const addToCollectionModalOpen = ref(false);
const selectedCollectionIds = ref<string[]>([]);
const loadingAddableCollections = ref(false);
const addableCollections = ref<CollectionToAdd[]>([]);
const collectionSearchQuery = ref('');
const filteredAddableCollections = computed(() => {
  const query = collectionSearchQuery.value.trim().toLowerCase();
  if (!query) return addableCollections.value;
  return addableCollections.value.filter((col) =>
    col.name.toLowerCase().includes(query) ||
    (col.description && col.description.toLowerCase().includes(query))
  );
});
const addingCollection = ref(false);

const selectedCollectionCount = computed(() => selectedCollectionIds.value.length);

const addImageURLError = ref<string | null>(null);
const addImageURLModalOpen = ref(false);
const addingImageURL = ref(false);

// === Display helpers ==========================================================

const TYPE_COLOR: Record<string, string> = {
  FILM: '#0043ce', SERIES: '#393939', BOOK: '#6e4c31', ARTICLE: '#005d5d', OTHER: '#393939',
};
const TYPE_ICON: Record<string, string> = {
  FILM: 'movie', SERIES: 'tv', BOOK: 'menu_book', ARTICLE: 'article', OTHER: 'category',
};
const TYPE_LABEL: Record<string, string> = {
  FILM: 'Movie', SERIES: 'TV Series', BOOK: 'Book', ARTICLE: 'Article', OTHER: 'Other',
};

const releaseYear = (d?: string | null) => {
  if (!d) return '—';
  try { return new Date(d).getFullYear().toString(); } catch { return '—'; }
};

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authStore.authToken) {
    headers.Authorization = `Bearer ${authStore.authToken}`;
  }

  return headers;
}

async function loadMedia(id: string) {
  loading.value = true;
  error.value = null;
  try {
    const res = await fetch(`/api/media/${encodeURIComponent(id)}`, {
      headers: buildHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to fetch media (${res.status})`);
    const data = await res.json();
    // API may return the media directly or wrapped, handle both
    media.value = data.media ?? data;

    const mediaCollectionsRes = await fetch(`${apiBaseUrl}/api/media/${encodeURIComponent(id)}/collections`, {
      headers: buildHeaders(),
      credentials: 'include',
    });

    if (!mediaCollectionsRes.ok) {
      throw new Error(`Failed to load collections containing this media (${mediaCollectionsRes.status})`);
    }

    const mediaCollectionsData = await mediaCollectionsRes.json();
    collectionsWithMedia.value = mediaCollectionsData ?? [];

  } catch (err: any) {
    error.value = err?.message ?? 'Unknown error';
  } finally {
    loading.value = false;
  }
}

function openAddToCollectionModal(): void {
  addToCollectionError.value = null;
  addToCollectionModalOpen.value = true;
  selectedCollectionIds.value = [];
  collectionSearchQuery.value = '';
  void loadAddableCollections();
}

function closeAddToCollectionModal(): void {
  if (addingCollection.value) {
    return;
  }

  addToCollectionError.value = null;
  addToCollectionModalOpen.value = false;
  selectedCollectionIds.value = [];
  collectionSearchQuery.value = '';
}

// collections the user owns that do not have this media, to show in the "add to collection" modal
async function loadAddableCollections(): Promise<void> {
  if (!media.value) {
    return;
  }

  loadingAddableCollections.value = true;
  addToCollectionError.value = null;

  const userId = authStore.user?.id;

  try {
    const response = await fetch(`${apiBaseUrl}/api/users/${encodeURIComponent(userId!)}/owned-collections`, {
      headers: buildHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to load collections you own (${response.status})`);
    }

    const ownedCollectionsData = await response.json();
    const ownedCollections: CollectionToAdd[] = ownedCollectionsData.collections ?? [];

    // keep the collection that are in ownedCollections but not in collectionsWithMedia
    const collectionsWithMediaIds = new Set(collectionsWithMedia.value.map(c => c.id));
    addableCollections.value = ownedCollections.filter(c => !collectionsWithMediaIds.has(c.id));
  } catch (err) {
    addToCollectionError.value = err instanceof Error ? err.message : 'Failed to load collections';
  } finally {
    loadingAddableCollections.value = false;
  }
}

async function addToSelectedCollections() : Promise<void> {
  if (!media.value) {
    return;
  }

  if (selectedCollectionIds.value.length === 0) {
    addToCollectionError.value = 'Please select at least one collection to add to.';
    return;
  }

  addingCollection.value = true;
  addToCollectionError.value = null;

  try {
    const responses = await Promise.all(
      selectedCollectionIds.value.map(collectionId => {
        return fetch(`${apiBaseUrl}/api/collections/${encodeURIComponent(collectionId)}/media`, {
          method: 'POST',
          headers: buildHeaders(),
          credentials: 'include',
          body: JSON.stringify({
            mediaId: media.value!.id,
            position: 0 // thought this would cause me emotional turmoil but turns out it just kinda worked
          })
        });
      })
    );

    for (const response of responses) {
      if (!response.ok) {
        throw new Error('Failed to add selected media');
      }
    }

    addToCollectionModalOpen.value = false;
    selectedCollectionIds.value = [];
    await loadMedia(media.value.id);
  } catch (err) {
    addToCollectionError.value = err instanceof Error ? err.message : 'Failed to add to collections';
  } finally {
    addingCollection.value = false;
  }
}

function openAddImageURLModal(): void {
  addImageURLError.value = null;
  addImageURLModalOpen.value = true;
}

function closeAddImageURLModal(): void {
  if (addingImageURL.value) {
    return;
  }
  addImageURLError.value = null;
  addImageURLModalOpen.value = false;
}

async function addImageURL(): Promise<void> {
  if (!media.value) {
    return;
  }

  addingImageURL.value = true;
  addImageURLError.value = null;

  try {
    const imageURLInput = document.querySelector('input[name="image-url"]') as HTMLInputElement | null;
    const imageURL = imageURLInput?.value.trim();
    const response = await fetch(`${apiBaseUrl}/api/media/${encodeURIComponent(media.value.id)}`, {
      method: 'PATCH',
      headers: buildHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        url: imageURL
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to add image URL (${response.status})`);
    }

    addImageURLModalOpen.value = false;
    await loadMedia(media.value.id);
  } catch (err) {
    addImageURLError.value = err instanceof Error ? err.message : 'Failed to add image';
  } finally {
    addingImageURL.value = false;
  }
}

onMounted(() => {
  if (mediaId.value) loadMedia(mediaId.value);
});
</script>

<template>
  <div class="detail-page">

    <!-- == Loading ================================================ -->
    <div v-if="loading" class="status-area">
      <span class="material-symbols-outlined status-spinner">autorenew</span>
      <span>Loading…</span>
    </div>

    <!-- == Error ================================================== -->
    <div v-else-if="error" class="status-area">
      <span class="material-symbols-outlined" style="font-size:40px;color:#8d8d8d">broken_image</span>
      <p class="status-msg">{{ error }}</p>
      <div class="status-actions">
        <button class="btn-ghost" @click="router.push({ name: 'Catalog' })">Back to catalog</button>
      </div>
    </div>

    <!-- == Content ================================================ -->
    <template v-else-if="media">

      <!-- Back link -->
      <button class="back-link" type="button" @click="router.push({ name: 'Catalog' })">
        <span class="material-symbols-outlined">arrow_back</span>
        Media Catalog
      </button>

      <div class="detail-layout">

        <!-- == Left: Poster ====================================== -->
        <div class="poster-col">

          <button type="button" class="add-image-button" @click="openAddImageURLModal">
            <img v-if="media?.url" :src="media.url" alt="Media Cover" class="poster" />
            <div v-else
              class="poster"
              :style="{ backgroundColor: (media?.type && TYPE_COLOR[media.type]) ?? '#393939' }"
            >
              <span class="material-symbols-outlined poster-icon">
                {{ (media?.type && TYPE_ICON[media.type]) ?? 'category' }}
              </span>
            </div>
          </button>

          <a
            v-if="media.url"
            :href="media.url"
            target="_blank"
            rel="noopener noreferrer"
            class="external-link"
          >
            <span class="material-symbols-outlined" style="font-size:16px">open_in_new</span>
            Visit source
          </a>
        </div>

        <!-- == Right: Details ==================================== -->
        <div class="detail-col">

          <!-- Title + author + type badge -->
          <div class="title-block">
            <h1 class="media-title">{{ media.title }}</h1>
            <div class="byline">
              <span v-if="media.directorAuthor" class="byline-author">
                {{ media.directorAuthor }}
              </span>
              <span class="type-badge">{{ (media?.type && TYPE_LABEL[media.type]) ?? media?.type }}</span>
            </div>
          </div>

          <!-- Description -->
          <p v-if="media.description" class="media-description">{{ media.description }}</p>
          <p v-else class="media-description media-description--empty">No description available.</p>

          <!-- == Metadata grid ==================================== -->
          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">Release</span>
              <span class="meta-value">{{ releaseYear(media.releaseDate) }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Genre / Tags</span>
              <span class="meta-value">{{ media.tags?.length ? media.tags.join(', ') : '—' }}</span>
            </div>
            <div class="meta-item meta-item--full">
              <span class="meta-label">Availability</span>
              <span class="meta-value">
                {{ media.platforms?.length ? media.platforms.join(', ') : '—' }}
              </span>
            </div>
          </div>

          <!-- == Add to collection ================================ -->
          <div class="add-to-collection-row">
            <button type="button" class="btn-add" @click="openAddToCollectionModal">
              Add to a collection
            </button>
          </div>

          <!-- == Existing collections ============================= -->
          <div v-if="collectionsWithMedia.length > 0" class="existing-collections">
            <h3 class="existing-title">Collections that contain this item</h3>
            <ul class="existing-list">
              <li v-for="col in collectionsWithMedia" :key="col.id">
                <RouterLink :to="`/collections/${col.id}`" class="existing-link">
                  <span class="material-symbols-outlined" style="font-size:16px">folder_open</span>
                  {{ col.name }}
                </RouterLink>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </template>


    <!-- add to collection modal -->
    <AppModal v-model="addToCollectionModalOpen" title="Add media to collection" @close="closeAddToCollectionModal">
      <div class="add-collection-modal-body">
        <p class="modal-copy">
          Choose one or more collections to add this media to.
        </p>

        <!-- Search Bar -->
        <div v-if="addableCollections.length > 0" class="mb-2">
          <input
            v-model="collectionSearchQuery"
            type="text"
            class="w-full bg-[#f4f4f4] border-b border-[#8d8d8d] focus:border-[#0f62fe] h-10 px-3 text-sm text-on-surface outline-none"
            placeholder="Search collections by name..."
          />
        </div>

        <p v-if="addToCollectionError" class="modal-error">
          {{ addToCollectionError }}
        </p>

        <div v-else-if="loadingAddableCollections" class="modal-state">
          Loading collections...
        </div>

        <div v-else-if="addableCollections.length === 0" class="modal-state">
          No collection is available to add this media to.
        </div>

        <div v-else-if="filteredAddableCollections.length === 0" class="modal-state italic text-center">
          No collections match your search.
        </div>

        <menu v-else class="collection-picker-list" aria-label="Available collections">
          <label v-for="collection in filteredAddableCollections" :key="collection.id" class="collection-picker-item">
            <input
              v-model="selectedCollectionIds"
              type="checkbox"
              :value="collection.id"
              class="carbon-checkbox"
            >
            <span class="collection-picker-copy">
              <span class="collection-picker-title">{{ collection.name }}</span>
            </span>
          </label>
        </menu>
      </div>

      <template #footer>
        <button type="button" class="secondary-btn" :disabled="addingCollection" @click="closeAddToCollectionModal">
          Cancel
        </button>
        <button type="button" class="primary-btn" :disabled="addingCollection || selectedCollectionCount === 0 || loadingAddableCollections || addableCollections.length === 0" @click="addToSelectedCollections">
          {{ addingCollection ? 'Adding...' : `Add selected (${selectedCollectionCount})` }}
        </button>
      </template>
    </AppModal>

    <!-- add image modal -->
    <AppModal v-model="addImageURLModalOpen" title="Add cover image from URL" @close="closeAddImageURLModal">
      <div class="add-image-modal-body">
          <p class="modal-copy">
            Enter the URL of an image to set it as the cover for this media.
          </p>
  
          <p v-if="addImageURLError" class="modal-error">
            {{ addImageURLError }}
          </p>

          <input
            type="text"
            placeholder="https://example.com/image.jpg"
            class="carbon-text-input"
            name="image-url"
          >
      </div>

      <template #footer>
        <button type="button" class="secondary-btn" :disabled="addingImageURL" @click="closeAddImageURLModal">
          Cancel
        </button>
        <button type="button" class="primary-btn" :disabled="addingImageURL" @click="addImageURL">
          {{ addingImageURL ? 'Adding...' : 'Add Image' }}
        </button>
      </template>
    </AppModal>

  </div>
</template>

<style scoped>
/* == Page wrapper ========================================== */
.detail-page {
  font-family: 'IBM Plex Sans', sans-serif;
  max-width: 1024px;
  margin: 0 auto;
  padding-bottom: 64px;
}

/* == Loading / error states ================================ */
.status-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 96px 24px;
  color: #525252;
  font-size: 14px;
  letter-spacing: 0.16px;
}

.status-spinner {
  font-size: 40px;
  color: #8d8d8d;
  animation: spin 1s linear infinite;
}

.status-msg { margin: 0; font-size: 14px; color: #525252; }

.status-actions { display: flex; gap: 8px; }

/* == Back link ============================================= */
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: #0f62fe;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 13px;
  letter-spacing: 0.16px;
  cursor: pointer;
  padding: 0;
  margin-bottom: 32px;
}

.back-link:hover { color: #0043ce; }
.back-link .material-symbols-outlined { font-size: 18px; }

/* == Two-column layout ===================================== */
.detail-layout {
  display: flex;
  gap: 64px;
  align-items: flex-start;
}

@media (max-width: 768px) {
  .detail-layout { flex-direction: column; gap: 32px; }
}

/* == Poster ================================================ */
.poster-col {
  flex: 0 0 38%;
  max-width: 38%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (max-width: 768px) {
  .poster-col { flex: none; max-width: 100%; width: 100%; }
}

.poster {
  width: 100%;
  aspect-ratio: 2 / 3;
  border: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.poster-icon {
  font-size: 80px;
  color: rgba(255, 255, 255, 0.25);
  user-select: none;
}

.external-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #0f62fe;
  font-size: 13px;
  letter-spacing: 0.16px;
  text-decoration: none;
}

.external-link:hover { color: #0043ce; text-decoration: underline; }

/* == Detail column ========================================= */
.detail-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  color: #161616;
}

/* == Title ================================================= */
.title-block { margin-bottom: 32px; }

.media-title {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 300;
  font-size: 2.625rem;
  line-height: 1.2;
  letter-spacing: -0.01em;
  color: #161616;
  margin: 0 0 10px;
}

.byline {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.byline-author {
  font-size: 16px;
  color: #525252;
  letter-spacing: 0.16px;
}

.type-badge {
  background-color: #f4f4f4;
  border: 1px solid #e0e0e0;
  color: #525252;
  font-size: 11px;
  letter-spacing: 0.32px;
  text-transform: uppercase;
  padding: 2px 8px;
}

/* == Description =========================================== */
.media-description {
  font-size: 14px;
  line-height: 1.6;
  letter-spacing: 0.16px;
  color: #161616;
  max-width: 60ch;
  margin: 0 0 32px;
}

.media-description--empty { color: #8d8d8d; font-style: italic; }

/* == Metadata grid ========================================= */
.meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px 48px;
  border-top: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
  padding: 24px 0;
  margin-bottom: 32px;
}

@media (max-width: 480px) {
  .meta-grid { grid-template-columns: 1fr; }
}

.meta-item { display: flex; flex-direction: column; gap: 4px; }
.meta-item--full { grid-column: 1 / -1; }

.meta-label {
  font-size: 11px;
  color: #525252;
  letter-spacing: 0.32px;
  text-transform: uppercase;
}

.meta-value { font-size: 14px; color: #161616; letter-spacing: 0.16px; }

/* == Add to collection ===================================== */

.collection-row { display: flex; align-items: stretch; }

.btn-add {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 20px;
  background-color: #0f62fe;
  color: #ffffff;
  border: none;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  letter-spacing: 0.16px;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.15s;
  flex-shrink: 0;
}

.btn-add:hover:not(:disabled) { background-color: #0043ce; }

.btn-add:disabled {
  background-color: #c6c6c6;
  color: #8d8d8d;
  cursor: not-allowed;
}
.add-to-collection-row {
  padding-top: 24px;
  padding-bottom: 24px;
}

/* == Existing collections ================================== */
.existing-collections {
  border-top: 1px solid #e0e0e0;
  padding-top: 24px;
}

.existing-title {
  font-weight: 500;
  font-size: 14px;
  letter-spacing: 0.16px;
  color: #161616;
  margin: 0 0 16px;
}

.existing-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.existing-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #0f62fe;
  font-size: 14px;
  letter-spacing: 0.16px;
  text-decoration: none;
}

.existing-link:hover {
  color: #0043ce;
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* == Buttons =============================================== */
.btn-ghost {
  background: transparent;
  border: 1px solid #e0e0e0;
  color: #0f62fe;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  letter-spacing: 0.16px;
  padding: 10px 20px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.btn-ghost:hover { background-color: #f4f4f4; }

.add-image-button {
  filter: brightness(1);
  transition: transform 0.2s ease, filter 0.2s ease;
}

.add-image-button:hover {
  filter: brightness(0.75);
  transition: transform 0.2s ease, filter 0.2s ease;
  cursor: pointer;
}

.primary-btn,
.secondary-btn {
  border: 1px solid transparent;
  font-size: 14px;
  padding: 8px 12px;
  cursor: pointer;
}

.primary-btn {
  background: #0f62fe;
  color: #ffffff;
}

.primary-btn:hover {
  background: #0353e9;
}

.secondary-btn {
  background: #ffffff;
  border-color: #8d8d8d;
  color: #161616;
}

.secondary-btn:hover {
  background: #f4f4f4;
}

.primary-btn:disabled,
.secondary-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.add-to-collection-button {
  padding: 12px 18px;
  border: 1px solid #0f62fe;
  background: linear-gradient(135deg, #0f62fe 0%, #2563eb 100%);
  color: #ffffff;
  font-weight: 700;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

.add-to-collection-button:hover {
  transform: translateY(-1px);
}

.add-to-collection-button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
  transform: none;
}

.add-to-collection-button:focus-visible {
  outline: 2px solid #0f62fe;
  outline-offset: 2px;
}

/* Modals */

.add-collection-modal-body,
.add-image-modal-body {
  display: grid;
  gap: 14px;
}

.modal-copy {
  margin: 0;
  color: #525252;
  line-height: 1.5;
}

.modal-error {
  margin: 0;
  padding: 10px 12px;
  border-left: 3px solid #da1e28;
  background: #ffd7d9;
  color: #8b0000;
}

.modal-state {
  padding: 14px 12px;
  border: 1px solid #e0e0e0;
  background: #f4f4f4;
  color: #525252;
}

.collection-picker-list {
  display: grid;
  gap: 10px;
  max-height: 360px;
  overflow-y: auto;
  padding-right: 4px;
}

.collection-picker-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #e0e0e0;
  background: #ffffff;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.collection-picker-item:hover {
  background: #f4f4f4;
  border-color: #c6c6c6;
}

.collection-picker-copy {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.collection-picker-title {
  color: #161616;
  font-weight: 600;
}

.collection-picker-type {
  color: #525252;
  font-size: 13px;
}

</style>