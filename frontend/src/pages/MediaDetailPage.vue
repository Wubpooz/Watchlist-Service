<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const route  = useRoute();
const router = useRouter();
const authStore = useAuthStore();

// === Types ====================================================================

type MediaType = 'FILM' | 'SERIES' | 'BOOK' | 'ARTICLE' | 'OTHER';

interface MediaDetail {
  id: string;
  title: string;
  description: string | null;
  type: MediaType;
  releaseDate: string | null;
  directorAuthor: string | null;
  tags: string[];
  platforms: string[];
  url: string | null;
  scores: unknown;
  createdAt: string;
  updatedAt: string;
  collections: unknown[];
}

interface Collection {
  id: string;
  name: string;
  visibility: string;
}

// === State ====================================================================

const mediaId   = computed(() => route.params.id as string);
const media     = ref<MediaDetail | null>(null);
const isLoading = ref(true);
const error     = ref('');

const collections        = ref<Collection[]>([]);
const selectedCollection = ref('');
const isAdding           = ref(false);
const addError           = ref('');
const addSuccess         = ref(false);

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

// Collections this media already belongs to (from the join field in the response).
const existingCollections = computed(() => {
  if (!media.value?.collections) return [];
  return (media.value.collections as any[])
    .map(c => ({
      id:   c.collection?.id   ?? c.id   ?? '',
      name: c.collection?.name ?? c.name ?? '',
    }))
    .filter(c => c.id && c.name);
});

// === API ======================================================================

const authHeaders = (): Record<string, string> => {
  const h: Record<string, string> = {};
  if (authStore.authToken) h['Authorization'] = `Bearer ${authStore.authToken}`;
  return h;
};

const fetchMedia = async () => {
  isLoading.value = true;
  error.value = '';
  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_URL ?? ''}/api/media/${mediaId.value}`,
      { headers: authHeaders(), credentials: 'include' }
    );
    if (res.status === 404) { error.value = 'This media item could not be found.'; }
    else if (!res.ok)       { error.value = 'Failed to load media details.'; }
    else                    { media.value = await res.json(); }
  } catch {
    error.value = 'Network error. Please try again.';
  } finally {
    isLoading.value = false;
  }
};

const fetchCollections = async () => {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_URL ?? ''}/api/collections?pageSize=50`,
      { headers: authHeaders(), credentials: 'include' }
    );
    if (res.ok) { const b = await res.json(); collections.value = b.data ?? []; }
  } catch { /* silent — dropdown degrades gracefully */ }
};

const addToCollection = async () => {
  if (!selectedCollection.value || !media.value) return;
  isAdding.value = true;
  addError.value = '';
  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_URL ?? ''}/api/collections/${selectedCollection.value}/media`,
      {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mediaId: media.value.id, position: 0 }),
      }
    );
    if (res.ok || res.status === 201) {
      addSuccess.value = true;
      selectedCollection.value = '';
      await fetchMedia(); // refresh to update existing-collections list
      setTimeout(() => { addSuccess.value = false; }, 3000);
    } else {
      const d = await res.json().catch(() => ({}));
      addError.value = (d as { message?: string })?.message ?? 'Failed to add to collection.';
    }
  } catch {
    addError.value = 'Network error. Please try again.';
  } finally {
    isAdding.value = false;
  }
};

onMounted(() => {
  fetchMedia();
  fetchCollections();
});
</script>

<template>
  <div class="detail-page">

    <!-- == Loading ================================================ -->
    <div v-if="isLoading" class="status-area">
      <span class="material-symbols-outlined status-spinner">autorenew</span>
      <span>Loading…</span>
    </div>

    <!-- == Error ================================================== -->
    <div v-else-if="error" class="status-area">
      <span class="material-symbols-outlined" style="font-size:40px;color:#8d8d8d">broken_image</span>
      <p class="status-msg">{{ error }}</p>
      <div class="status-actions">
        <button class="btn-ghost" @click="fetchMedia">Retry</button>
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
          <div
            class="poster"
            :style="{ backgroundColor: TYPE_COLOR[media.type] ?? '#393939' }"
          >
            <span class="material-symbols-outlined poster-icon">
              {{ TYPE_ICON[media.type] ?? 'category' }}
            </span>
          </div>

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
              <span class="type-badge">{{ TYPE_LABEL[media.type] ?? media.type }}</span>
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
          <div class="collection-actions">

            <div v-if="addSuccess" class="notice notice--success">
              <span class="material-symbols-outlined" style="font-size:18px">check_circle</span>
              Added to collection.
            </div>

            <div v-if="addError" class="notice notice--error">
              <span class="material-symbols-outlined" style="font-size:16px">error</span>
              {{ addError }}
              <button class="notice-close" type="button" @click="addError = ''">
                <span class="material-symbols-outlined" style="font-size:14px">close</span>
              </button>
            </div>

            <div class="collection-row">
              <div class="select-wrapper">
                <select
                  v-model="selectedCollection"
                  class="collection-select"
                  :disabled="collections.length === 0"
                >
                  <option value="" disabled hidden>
                    {{ collections.length ? 'Add to collection…' : 'No collections yet' }}
                  </option>
                  <option v-for="col in collections" :key="col.id" :value="col.id">
                    {{ col.name }}
                  </option>
                </select>
                <span class="material-symbols-outlined select-arrow">expand_more</span>
              </div>

              <button
                class="btn-add"
                :disabled="!selectedCollection || isAdding"
                @click="addToCollection"
              >
                <span
                  v-if="isAdding"
                  class="material-symbols-outlined btn-spinner"
                  style="font-size:18px"
                >autorenew</span>
                <span v-else class="material-symbols-outlined" style="font-size:18px">add</span>
                {{ isAdding ? 'Adding…' : 'Add' }}
              </button>
            </div>
          </div>

          <!-- == Existing collections ============================= -->
          <div v-if="existingCollections.length > 0" class="existing-collections">
            <h3 class="existing-title">Collections that contain this item</h3>
            <ul class="existing-list">
              <li v-for="col in existingCollections" :key="col.id">
                <RouterLink :to="{ name: 'Collections' }" class="existing-link">
                  <span class="material-symbols-outlined" style="font-size:16px">folder_open</span>
                  {{ col.name }}
                </RouterLink>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </template>

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
.collection-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 32px;
}

.notice {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  letter-spacing: 0.16px;
  padding: 8px 12px;
}

.notice--success { color: #198038; }

.notice--error {
  background-color: #ffd7d9;
  border-left: 3px solid #da1e28;
  color: #750000;
}

.notice-close {
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  display: flex;
  padding: 0;
  margin-left: auto;
}

.collection-row { display: flex; align-items: stretch; }

.select-wrapper { position: relative; flex: 1; max-width: 280px; }

.collection-select {
  appearance: none;
  display: block;
  width: 100%;
  height: 40px;
  padding: 0 36px 0 12px;
  background-color: #f4f4f4;
  border: none;
  border-bottom: 1px solid #525252;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  color: #161616;
  letter-spacing: 0.16px;
  cursor: pointer;
  outline: 2px solid transparent;
  outline-offset: -2px;
  transition: outline 0.1s;
}

.collection-select:focus { outline-color: #0f62fe; border-bottom-color: transparent; }
.collection-select:disabled { color: #8d8d8d; cursor: not-allowed; }

.select-arrow {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 20px;
  color: #161616;
  pointer-events: none;
}

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

.btn-spinner { animation: spin 1s linear infinite; }

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
</style>
