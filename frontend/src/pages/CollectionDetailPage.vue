<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppModal from '@/components/AppModal.vue';
import { useAuthStore } from '@/stores/auth';

type CollectionVisibility = 'PUBLIC' | 'PRIVATE';

type Collection = {
  id: string;
  name: string;
  description?: string | null;
  visibility: CollectionVisibility;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

type CollectionMediaItem = {
  id: string;
  position: number;
  addedAt: string;
  media: {
    id: string;
    title: string;
    type: string;
  };
};

type MediaItem = {
  id: string;
  title: string;
  type: string;
};

type MediaListResponse = {
  data: MediaItem[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  cursor?: string | null;
};

type User = {
  id: string;
  name: string;
  email: string;
};

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const collection = ref<Collection | null>(null);
const mediaItems = ref<CollectionMediaItem[]>([]);
const owner = ref<User | null>(null);
const loading = ref(true);
const actionMessage = ref<string | null>(null);
const actionError = ref<string | null>(null);
const editMode = ref(false);
const descriptionDraft = ref('');
const savingDescription = ref(false);
const deletingCollection = ref(false);
const removingMediaIds = ref<string[]>([]);
const addMediaError = ref<string | null>(null);
const addMediaModalOpen = ref(false);
const addableMedia = ref<MediaItem[]>([]);
const selectedMediaIds = ref<string[]>([]);
const loadingAddableMedia = ref(false);
const addingMedia = ref(false);

const collectionId = computed(() => String(route.params.id ?? ''));
const visibilityLabel = computed(() => (collection.value?.visibility === 'PUBLIC' ? 'Public' : 'Private'));
const selectedMediaCount = computed(() => selectedMediaIds.value.length);

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authStore.authToken) {
    headers.Authorization = `Bearer ${authStore.authToken}`;
  }

  return headers;
}

function openAddMediaModal(): void {
  addMediaError.value = null;
  addMediaModalOpen.value = true;
  selectedMediaIds.value = [];
  void loadAddableMedia();
}

function closeAddMediaModal(): void {
  if (addingMedia.value) {
    return;
  }

  addMediaModalOpen.value = false;
  addMediaError.value = null;
  selectedMediaIds.value = [];
}

async function loadAddableMedia(): Promise<void> {
  if (!collection.value) {
    return;
  }

  const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';
  loadingAddableMedia.value = true;
  addMediaError.value = null;

  try {
    const pageSize = 100;
    let page = 1;
    let totalPages = 1;
    const allMedia: MediaItem[] = [];

    while (page <= totalPages) {
      const response = await fetch(`${apiBaseUrl}/api/media?page=${page}&pageSize=${pageSize}&sort=title&order=asc`, {
        headers: buildHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to load media catalog (${response.status})`);
      }

      const payload = await response.json() as MediaListResponse;
      allMedia.push(...payload.data);
      totalPages = payload.pages || 1;
      page += 1;
    }

    const existingMediaIds = new Set(mediaItems.value.map((item) => item.media.id));
    addableMedia.value = allMedia.filter((media) => !existingMediaIds.has(media.id));
  } catch (err) {
    addMediaError.value = err instanceof Error ? err.message : 'Failed to load media catalog';
  } finally {
    loadingAddableMedia.value = false;
  }
}

async function addSelectedMedia(): Promise<void> {
  if (!collection.value) {
    return;
  }

  if (selectedMediaIds.value.length === 0) {
    addMediaError.value = 'Select at least one media item.';
    return;
  }

  const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';
  const nextPosition = mediaItems.value.reduce((maxPosition, item) => Math.max(maxPosition, item.position), -1) + 1;

  addingMedia.value = true;
  addMediaError.value = null;

  try {
    const responses = await Promise.all(
      selectedMediaIds.value.map((mediaId, index) => {
        return fetch(`${apiBaseUrl}/api/collections/${collection.value!.id}/media`, {
          method: 'POST',
          headers: buildHeaders(),
          credentials: 'include',
          body: JSON.stringify({
            mediaId,
            position: nextPosition + index,
          }),
        });
      })
    );

    for (const response of responses) {
      if (!response.ok) {
        throw new Error('Failed to add selected media');
      }
    }

    addMediaModalOpen.value = false;
    selectedMediaIds.value = [];
    actionMessage.value = 'Selected media added to collection.';
    await loadCollectionDetail();
  } catch (err) {
    addMediaError.value = err instanceof Error ? err.message : 'Failed to add selected media';
  } finally {
    addingMedia.value = false;
  }
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }

  return new Date(date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
}

function formatDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }

  return new Date(date).toLocaleString(undefined, { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatMediaType(type: string): string {
  return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function isRemovingMedia(collectionMediaId: string): boolean {
  return removingMediaIds.value.includes(collectionMediaId);
}

async function loadCollectionDetail(): Promise<void> {
  if (!collectionId.value) {
    actionError.value = 'Collection id is missing from the route.';
    loading.value = false;
    return;
  }

  const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';
  loading.value = true;
  actionError.value = null;
  actionMessage.value = null;

  try {
    const [collectionRes, mediaRes] = await Promise.all([
      fetch(`${apiBaseUrl}/api/collections/${collectionId.value}`, {
        headers: buildHeaders(),
        credentials: 'include',
      }),
      fetch(`${apiBaseUrl}/api/collections/${collectionId.value}/media`, {
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

    const collectionPayload = await collectionRes.json() as Collection;
    const mediaPayload = await mediaRes.json() as CollectionMediaItem[];

    collection.value = collectionPayload;
    descriptionDraft.value = collectionPayload.description ?? '';
    mediaItems.value = mediaPayload;
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Failed to load collection details';
  } finally {
    loading.value = false;
  }

  if (!collection.value) {
    return;
  }

  const ownerId = collection.value?.ownerId;
  const ownerRes = await fetch(`${apiBaseUrl}/api/users/${ownerId}`, {
    method: 'GET',
    headers: buildHeaders(),
    credentials: 'include',
  });
  const data = await ownerRes.json();
  owner.value = data.user || data;
}

function startEditDescription(): void {
  if (!collection.value) {
    return;
  }

  descriptionDraft.value = collection.value.description ?? '';
  actionError.value = null;
  actionMessage.value = null;
  editMode.value = true;
}

function cancelEditDescription(): void {
  if (!collection.value) {
    return;
  }

  descriptionDraft.value = collection.value.description ?? '';
  editMode.value = false;
}

async function saveDescription(): Promise<void> {
  if (!collection.value) {
    return;
  }

  const nextDescription = descriptionDraft.value.trim();
  const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';
  savingDescription.value = true;
  actionError.value = null;
  actionMessage.value = null;

  try {
    const res = await fetch(`${apiBaseUrl}/api/collections/${collection.value.id}`, {
      method: 'PATCH',
      headers: buildHeaders(),
      credentials: 'include',
      body: JSON.stringify({ description: nextDescription }),
    });

    if (!res.ok) {
      throw new Error('Failed to update collection description');
    }

    const updated = await res.json() as Collection;
    collection.value = {
      ...collection.value,
      ...updated,
    };
    descriptionDraft.value = updated.description ?? '';
    editMode.value = false;
    actionMessage.value = 'Collection description updated.';
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Failed to update collection description';
  } finally {
    savingDescription.value = false;
  }
}

async function removeMedia(collectionMediaId: string, mediaTitle: string): Promise<void> {
  if (!collection.value) {
    return;
  }

  const confirmed = globalThis.confirm(`Remove ${mediaTitle} from this collection?`);
  if (!confirmed) {
    return;
  }

  const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';
  actionError.value = null;
  actionMessage.value = null;
  removingMediaIds.value = [...removingMediaIds.value, collectionMediaId];

  try {
    const res = await fetch(`${apiBaseUrl}/api/collections/${collection.value.id}/media/${collectionMediaId}`, {
      method: 'DELETE',
      headers: buildHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error('Failed to remove media from collection');
    }

    mediaItems.value = mediaItems.value.filter((item) => item.id !== collectionMediaId);
    actionMessage.value = `${mediaTitle} removed from collection.`;
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Failed to remove media from collection';
  } finally {
    removingMediaIds.value = removingMediaIds.value.filter((id) => id !== collectionMediaId);
  }
}

async function deleteCollection(): Promise<void> {
  if (!collection.value) {
    return;
  }

  const confirmed = globalThis.confirm(`Delete the collection "${collection.value.name}"? This action cannot be undone.`);
  if (!confirmed) {
    return;
  }

  const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';
  deletingCollection.value = true;
  actionError.value = null;
  actionMessage.value = null;

  try {
    const res = await fetch(`${apiBaseUrl}/api/collections/${collection.value.id}`, {
      method: 'DELETE',
      headers: buildHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error('Failed to delete collection');
    }

    await router.push('/collections');
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Failed to delete collection';
  } finally {
    deletingCollection.value = false;
  }
}

onMounted(() => {
  void loadCollectionDetail();
});

watch(collectionId, () => {
  void loadCollectionDetail();
}, { immediate: true });
</script>

<template>
  <div class="collection-detail-page">
    <div v-if="loading" class="state-card">Loading collection details...</div>

    <div v-else-if="actionError && !collection" class="state-card state-error">
      {{ actionError }}
    </div>

    <div v-else-if="collection" class="canvas">
      <div class="breadcrumbs">
        <RouterLink to="/collections">Collections</RouterLink>
        <span>/</span>
        <span>{{ collection.name }}</span>
      </div>

      <header class="detail-header">
        <div class="title-row">
          <h1>{{ collection.name }}</h1>
          <span class="visibility-chip">{{ visibilityLabel }}</span>
        </div>

        <div class="action-bar">
          <button type="button" class="action-link" @click="startEditDescription">
            Edit description
          </button>
          <button
            type="button"
            class="action-link danger"
            :disabled="deletingCollection"
            @click="deleteCollection"
          >
            {{ deletingCollection ? 'Deleting...' : 'Delete collection' }}
          </button>
        </div>

        <div class="description-panel">
          <p class="panel-title">Description</p>
          <template v-if="editMode">
            <textarea
              v-model="descriptionDraft"
              rows="4"
              maxlength="1000"
              class="description-input"
              placeholder="Describe this collection"
            ></textarea>
            <div class="description-actions">
              <button type="button" class="secondary-btn" :disabled="savingDescription" @click="cancelEditDescription">
                Cancel
              </button>
              <button type="button" class="primary-btn" :disabled="savingDescription" @click="saveDescription">
                {{ savingDescription ? 'Saving...' : 'Save description' }}
              </button>
            </div>
          </template>
          <p v-else class="description-text">
            {{ collection.description || 'No description yet.' }}
          </p>
        </div>
      </header>

      <p v-if="actionError" class="inline-message error">{{ actionError }}</p>
      <p v-if="actionMessage" class="inline-message success">{{ actionMessage }}</p>

      <div class="content-grid">
        <section class="media-section">
          <div class="section-head">
            <h2>Collection Items ({{ mediaItems.length }})</h2>
            <button type="button" class="add-media-button" @click="openAddMediaModal">
              Add media
            </button>
          </div>

          <table class="table-wrap" aria-label="Collection media list">
            <tr class="table-head">
              <span>Title</span>
              <span>Type</span>
              <span>Date Added</span>
              <span class="actions-head">Actions</span>
            </tr>

            <div v-if="mediaItems.length === 0" class="empty-row">
              No media in this collection yet.
            </div>

            <tr v-for="item in mediaItems" :key="item.id" class="table-row">
              <RouterLink :to="`/media/${item.media.id}`" class="media-title">
                {{ item.media.title }}
              </RouterLink>
              <RouterLink :to="`/media/${item.media.id}`">
                {{ formatMediaType(item.media.type) }}
              </RouterLink>
              <RouterLink :to="`/media/${item.media.id}`">
                {{ formatDate(item.addedAt) }}
              </RouterLink>

              <div class="row-actions">
                <button
                  type="button"
                  class="remove-btn"
                  :disabled="isRemovingMedia(item.id)"
                  @click="removeMedia(item.id, item.media.title)"
                >
                  {{ isRemovingMedia(item.id) ? 'Removing...' : 'Remove' }}
                </button>
              </div>
            </tr>
          </table>
        </section>

        <aside class="inspector">
          <h3>Properties</h3>

          <div class="property-group">
            <span class="property-label">Owner</span>
            <span class="property-value">{{ owner?.name + ' (' + owner?.email + ')' || 'Unknown' }}</span>
          </div>

          <div class="property-group">
            <span class="property-label">Visibility</span>
            <span class="property-value">{{ visibilityLabel }}</span>
          </div>

          <div class="property-group">
            <span class="property-label">Created</span>
            <span class="property-value">{{ formatDate(collection.createdAt) }}</span>
          </div>

          <div class="property-group">
            <span class="property-label">Last Modified</span>
            <span class="property-value">{{ formatDateTime(collection.updatedAt) }}</span>
          </div>
        </aside>
      </div>
    </div>

    <AppModal v-model="addMediaModalOpen" title="Add media to collection" @close="closeAddMediaModal">
      <div class="add-media-modal-body">
        <p class="modal-copy">
          Choose one or more media items to add to this collection.
        </p>

        <p v-if="addMediaError" class="modal-error">
          {{ addMediaError }}
        </p>

        <div v-else-if="loadingAddableMedia" class="modal-state">
          Loading media catalog...
        </div>

        <div v-else-if="addableMedia.length === 0" class="modal-state">
          No additional media is available to add.
        </div>

        <menu v-else class="media-picker-list" aria-label="Available media">
          <label v-for="media in addableMedia" :key="media.id" class="media-picker-item">
            <input
              v-model="selectedMediaIds"
              type="checkbox"
              :value="media.id"
              class="carbon-checkbox"
            >
            <span class="media-picker-copy">
              <span class="media-picker-title">{{ media.title }}</span>
              <span class="media-picker-type">{{ formatMediaType(media.type) }}</span>
            </span>
          </label>
        </menu>
      </div>

      <template #footer>
        <button type="button" class="secondary-btn" :disabled="addingMedia" @click="closeAddMediaModal">
          Cancel
        </button>
        <button type="button" class="primary-btn" :disabled="addingMedia || selectedMediaCount === 0 || loadingAddableMedia || addableMedia.length === 0" @click="addSelectedMedia">
          {{ addingMedia ? 'Adding...' : `Add selected (${selectedMediaCount})` }}
        </button>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.collection-detail-page {
  max-width: 1200px;
  margin: 0 auto;
}

.canvas {
  background: #ffffff;
}

.state-card {
  border: 1px solid #e0e0e0;
  background: #f4f4f4;
  color: #161616;
  padding: 16px;
}

.state-error {
  border-left: 4px solid #da1e28;
}

.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
  color: #525252;
  font-size: 14px;
}

.breadcrumbs a {
  color: #0f62fe;
  text-decoration: none;
}

.breadcrumbs a:hover {
  text-decoration: underline;
}

.detail-header {
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 20px;
  margin-bottom: 28px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.title-row h1 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 2.75rem);
  line-height: 1;
  font-weight: 300;
  color: #161616;
}

.visibility-chip {
  font-size: 12px;
  color: #161616;
  background: #e0e0e0;
  padding: 4px 8px;
}

.action-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
}

.action-link {
  border: none;
  background: transparent;
  color: #0f62fe;
  font-size: 14px;
  padding: 8px 10px;
  cursor: pointer;
}

.action-link:hover {
  background: #f4f4f4;
}

.action-link.danger {
  color: #da1e28;
}

.action-link:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.description-panel {
  max-width: 760px;
  background: #f4f4f4;
  border: 1px solid #e0e0e0;
  padding: 14px;
}

.panel-title {
  margin: 0 0 8px;
  font-size: 12px;
  color: #525252;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.description-text {
  margin: 0;
  color: #161616;
  line-height: 1.6;
}

.description-input {
  width: 100%;
  border: 1px solid #8d8d8d;
  background: #ffffff;
  color: #161616;
  padding: 10px;
  resize: vertical;
}

.description-input:focus {
  outline: 2px solid #0f62fe;
  outline-offset: -2px;
}

.description-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
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

.inline-message {
  margin: 0 0 14px;
  padding: 10px 12px;
  font-size: 14px;
}

.inline-message.error {
  background: #ffd7d9;
  color: #8b0000;
}

.inline-message.success {
  background: #d9f2e8;
  color: #0e6027;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr);
  gap: 28px;
}

.media-section h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 400;
  color: #161616;
}

.section-head {
  margin-bottom: 10px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.table-wrap {
  border: 1px solid #e0e0e0;
  border-bottom: none;
  width: 100%;
}

.table-head,
.table-row {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(90px, 0.7fr) minmax(130px, 0.9fr) minmax(110px, 0.6fr);
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #e0e0e0;
}

.table-head {
  background: #f4f4f4;
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #161616;
}

.table-row {
  padding: 10px 14px;
  font-size: 14px;
  color: #161616;
  background: #ffffff;
}

.table-row:hover {
  background: #f4f4f4;
}

.media-title {
  font-weight: 500;
}

.actions-head {
  text-align: right;
}

.row-actions {
  display: flex;
  justify-content: flex-end;
}

.remove-btn {
  border: none;
  background: transparent;
  color: #da1e28;
  font-size: 14px;
  cursor: pointer;
}

.remove-btn:hover {
  text-decoration: underline;
}

.remove-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.empty-row {
  padding: 18px 14px;
  color: #525252;
  border-bottom: 1px solid #e0e0e0;
}

.inspector {
  border-left: 1px solid #e0e0e0;
  padding-left: 20px;
}

.inspector h3 {
  margin: 0 0 14px;
  font-size: 14px;
  font-weight: 600;
  color: #161616;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 8px;
}

.property-group {
  display: grid;
  gap: 4px;
  margin-bottom: 14px;
}

.property-label {
  color: #525252;
  font-size: 12px;
}

.property-value {
  color: #161616;
  font-size: 14px;
}

.add-media-button {
  padding: 12px 18px;
  border: 1px solid #0f62fe;
  background: linear-gradient(135deg, #0f62fe 0%, #2563eb 100%);
  color: #ffffff;
  font-weight: 700;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

.add-media-button:hover {
  transform: translateY(-1px);
}

.add-media-button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
  transform: none;
}

.add-media-button:focus-visible {
  outline: 2px solid #0f62fe;
  outline-offset: 2px;
}

.add-media-modal-body {
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

.media-picker-list {
  display: grid;
  gap: 10px;
  max-height: 360px;
  overflow-y: auto;
  padding-right: 4px;
}

.media-picker-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #e0e0e0;
  background: #ffffff;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.media-picker-item:hover {
  background: #f4f4f4;
  border-color: #c6c6c6;
}

.media-picker-copy {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.media-picker-title {
  color: #161616;
  font-weight: 600;
}

.media-picker-type {
  color: #525252;
  font-size: 13px;
}

@media (max-width: 980px) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .inspector {
    border-left: none;
    border-top: 1px solid #e0e0e0;
    padding-left: 0;
    padding-top: 16px;
  }
}

@media (max-width: 700px) {
  .table-head,
  .table-row {
    grid-template-columns: minmax(0, 1fr);
    gap: 6px;
  }

  .actions-head,
  .row-actions {
    justify-content: flex-start;
    text-align: left;
  }
}
</style>
