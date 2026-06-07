<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import AppModal from '@/components/AppModal.vue';

const route = useRoute();
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
const addingCollection = ref(false);

const selectedCollectionCount = computed(() => selectedCollectionIds.value.length);

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
  void loadAddableCollections();
}

function closeAddToCollectionModal(): void {
  if (addingCollection.value) {
    return;
  }

  addToCollectionError.value = null;
  addToCollectionModalOpen.value = false;
  selectedCollectionIds.value = [];
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

onMounted(() => {
  if (mediaId.value) loadMedia(mediaId.value);
});
</script>

<template>
  <div class="page-container">
    <!-- left side : cover image if we ever have those -->
    <div v-if="media?.url" class="cover-image">
      <img v-if="media?.url" :src="media.url" alt="Media Cover" class="cover-img" />
    </div>
    <!-- right side : name, author, type, description, release, tags, platforms, add to collection button, collections that have it -->
    <div class="media-details">

      <h1 v-if="media?.description" class="media-title">{{ media.title }}</h1>
      <div class="author-type-row">
        <span v-if="media?.directorAuthor" class="author-text">{{ media.directorAuthor }}</span>
        <span v-if="media?.type" class="visibility-chip">{{ media.type }}</span>
      </div>
      <p v-if="media?.description" class="media-description">{{ media.description }}</p>

      <ul class="data-list">
        <li v-if="media?.releaseDate"><strong>Release Date:</strong> {{ media.releaseDate ? new Date(media.releaseDate).toLocaleDateString(undefined, { year: 'numeric' }) : '—' }}</li>
        <li v-if="media?.tags && media.tags.length">
          <strong>Tags: </strong>
          <!-- tag1, tag2, tag3 -->
          <span class="detail-list-item" v-for="(tag, index) in media.tags" :key="tag">
            {{ tag }}<span v-if="index < media.tags.length - 1">, </span>
          </span>
        </li>
        <li v-if="media?.platforms && media.platforms.length">
          <strong>Platforms: </strong>
          <!-- platform1, platform2, platform3 -->
          <span class="detail-list-item" v-for="(platform, index) in media.platforms" :key="platform">
            {{ platform }}<span v-if="index < media.platforms.length - 1">, </span>
          </span>
        </li>
      </ul>

      <div class="collection-section">
        <!-- button opens a modal to add to a collection, kind of like how in collection detail page we open a modal to add a media -->
        <div class="add-to-collection-row">
          <button type="button" class="add-to-collection-button" @click="openAddToCollectionModal">
            Add to a collection
          </button>
        </div>
        <!-- list of collections that have this media, each item is a link to the collection detail page -->
        <div class="collections-with-media">
          <strong>Collections you have access to that contain this item</strong>

          <div v-if="collectionsWithMedia.length === 0" class="placeholder" style="margin-top: 12px">
            This media is not in any of your collections yet.
          </div>

          <ul class="collection-list" v-for="collection in collectionsWithMedia" :key="collection.id">
            <li class="collection-link">
              <RouterLink :to="`/collections/${collection.id}`">{{ collection.name }}</RouterLink>
            </li>
          </ul>

        </div>
      </div>
    </div>


    <AppModal v-model="addToCollectionModalOpen" title="Add media to collection" @close="closeAddToCollectionModal">
      <div class="add-collection-modal-body">
        <p class="modal-copy">
          Choose one or more collections to add this media to.
        </p>

        <p v-if="addToCollectionError" class="modal-error">
          {{ addToCollectionError }}
        </p>

        <div v-else-if="loadingAddableCollections" class="modal-state">
          Loading collections...
        </div>

        <div v-else-if="addableCollections.length === 0" class="modal-state">
          No collection is available to add this media to.
        </div>

        <div v-else class="collection-picker-list" role="list" aria-label="Available collections">
          <label v-for="collection in addableCollections" :key="collection.id" class="collection-picker-item">
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
        </div>
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
  </div>
</template>

<style scoped>
.page-container {
  max-width: 1800px;
  height: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: row;
  gap: 24px;
}

/* .page-container h1 {
  color: #42b883;
  margin-bottom: 1rem;
}

.placeholder {
  padding: 1.5rem;
  background-color: #1a1a1a;
  border: 1px dashed #333333;
  border-radius: 8px;
  text-align: center;
  color: #888888;
}

.meta-list {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 1rem 0;
}

.meta-list li { margin: 6px 0 }

.scores ul { padding-left: 1rem } */


.cover-image {
  /* background-color: #e0e0e0; */
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  overflow: hidden;
}

.media-details {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.media-title {
  margin: 0;
  font-size: clamp(2rem, 4vw, 2.75rem);
  line-height: 1;
  font-weight: 300;
  color: #161616;
}

.author-type-row {
  display: flex;
  gap: 12px;
  padding: 0;
  margin: 0.5rem 0 1rem 0;
}

.author-text {
  color: #525252;
}

.visibility-chip {
  font-size: 12px;
  color: #161616;
  background: #f3f3f3;
  padding: 4px 8px;
  border: 1px solid #dedede;
}

.media-description,
.data-list,
.add-to-collection-row,
.collections-with-media {
  padding-top: 24px;
  padding-bottom: 24px;
}

.media-description,
.data-list {
  border-bottom: 1px solid #e0e0e0;
}

.detail-list-item {
  text-transform: capitalize;
}

.add-to-collection-button {
  border: none;
  border-radius: 999px;
  font-weight: 700;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

.add-to-collection-button {
  padding: 12px 18px;
  border: 1px solid #0f62fe;
  background: linear-gradient(135deg, #0f62fe 0%, #2563eb 100%);
  color: #ffffff;
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

.collection-list {
  list-style: none;
  padding: 0;
  margin: 12px 0 0 0;
}

.collection-link {
  /* padding: 8px 12px; */
  border-radius: 6px;
  color: #0f62fe;
}


/* modal */

.add-collection-modal-body {
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

</style>
