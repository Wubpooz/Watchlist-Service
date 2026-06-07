<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useDebounce } from '@/composables/useDebounce';
import { useAbortController } from '@/composables/useAbortController';

const router = useRouter();
const authStore = useAuthStore();

// ─── Types ────────────────────────────────────────────────────────────────────

type MediaType = 'FILM' | 'SERIES' | 'BOOK' | 'ARTICLE' | 'OTHER';
type SortField = 'createdAt' | 'title' | 'releaseDate';
type SortOrder = 'asc' | 'desc';

interface MediaItem {
  id: string;
  title: string;
  type: MediaType;
  directorAuthor?: string | null;
  releaseDate?: string | null;
  platforms: string[];
  tags: string[];
  description?: string | null;
}

interface PaginationLinks {
  self: string;
  next: string | null;
  prev: string | null;
}

interface ApiPage {
  data: MediaItem[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  links: PaginationLinks;
  cursor?: string | null;
}

interface Collection {
  id: string;
  name: string;
  visibility: string;
}

// ─── State ────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const mediaItems = ref<MediaItem[]>([]);
const isLoading = ref(false);
const error = ref('');
const searchQuery = ref('');
const activeType = ref<MediaType | null>(null);
const sortField = ref<SortField>('createdAt');
const sortOrder = ref<SortOrder>('desc');
const currentPage = ref(1);
const totalItems = ref(0);
const totalPages = ref(1);
const paginationLinks = ref<PaginationLinks | null>(null);

const collections = ref<Collection[]>([]);
const collectionPickerMediaId = ref<string | null>(null);
const isAddingToCollection = ref<string | null>(null);
const addSuccessMediaId = ref<string | null>(null);
const isCollectionsLoading = ref(false);

// Debounce: waits 300 ms after the last keystroke before sending the request.
// Empty string fires immediately so clearing the field resets results without delay.
const { debouncedValue: debouncedSearch, isPending: isSearchPending } = useDebounce(searchQuery, 300);

// Cancels any in-flight `/api/media` request whenever a newer one starts.
// Also aborted automatically when the component unmounts.
const { getSignal } = useAbortController();

// ─── Computed ─────────────────────────────────────────────────────────────────

const rangeStart = computed(() => (currentPage.value - 1) * PAGE_SIZE + 1);
const rangeEnd = computed(() => Math.min(currentPage.value * PAGE_SIZE, totalItems.value));

/** Page buttons with ellipsis gaps */
const visiblePages = computed<(number | '...')[]>(() => {
  const total = totalPages.value;
  const current = currentPage.value;

  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
});

// ─── API ──────────────────────────────────────────────────────────────────────

const fetchMedia = async () => {
  // Abort any previous in-flight request and obtain a signal for this one.
  // If fetchMedia() is called again before this one finishes, getSignal()
  // will set signal.aborted = true on THIS signal, letting the finally
  // block know it should not touch the loading state.
  const signal = getSignal();

  isLoading.value = true;
  error.value = '';

  try {
    const token = authStore.authToken;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const params = new URLSearchParams({
      pageSize: String(PAGE_SIZE),
      page: String(currentPage.value),
      sort: sortField.value,
      order: sortOrder.value,
    });
    if (debouncedSearch.value.trim()) params.set('q', debouncedSearch.value.trim());
    if (activeType.value) params.set('type', activeType.value);

    const res = await fetch(
      `${import.meta.env.VITE_API_URL ?? ''}/api/media?${params}`,
      { headers, credentials: 'include', signal }
    );

    if (res.ok) {
      const body: ApiPage = await res.json();
      mediaItems.value = body.data ?? [];
      totalItems.value = body.total ?? 0;
      totalPages.value = body.pages ?? 1;
      paginationLinks.value = body.links ?? null;
    } else {
      error.value = 'Failed to load media catalog.';
    }
  } catch (err: any) {
    // AbortError means this request was superseded — a newer one is already
    // running and will manage isLoading itself. Do not touch any state here.
    if (err?.name === 'AbortError') return;
    error.value = 'Failed to load media catalog.';
  } finally {
    // Guard: only clear the loading flag if THIS specific request was not
    // superseded. Without this, aborting request N would set isLoading=false
    // while request N+1 is still in flight, causing a spurious loading flash.
    if (!signal.aborted) {
      isLoading.value = false;
    }
  }
};

const fetchCollections = async () => {
  if (collections.value.length > 0) return;
  isCollectionsLoading.value = true;
  try {
    const token = authStore.authToken;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(
      `${import.meta.env.VITE_API_URL ?? ''}/api/collections?pageSize=50`,
      { headers, credentials: 'include' }
    );
    if (res.ok) {
      const body = await res.json();
      collections.value = body.data ?? [];
    }
  } catch {
    // silent
  } finally {
    isCollectionsLoading.value = false;
  }
};

const addToCollection = async (mediaId: string, collectionId: string) => {
  isAddingToCollection.value = mediaId;
  try {
    const token = authStore.authToken;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(
      `${import.meta.env.VITE_API_URL ?? ''}/api/collections/${collectionId}/media`,
      {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ mediaId, position: 0 }),
      }
    );
    if (res.ok || res.status === 201) {
      addSuccessMediaId.value = mediaId;
      collectionPickerMediaId.value = null;
      setTimeout(() => { addSuccessMediaId.value = null; }, 2000);
    }
  } catch {
    // silent
  } finally {
    isAddingToCollection.value = null;
  }
};

// ─── Event handlers ───────────────────────────────────────────────────────────

const openCollectionPicker = (mediaId: string, e: MouseEvent) => {
  e.stopPropagation();
  collectionPickerMediaId.value = collectionPickerMediaId.value === mediaId ? null : mediaId;
  if (collectionPickerMediaId.value) fetchCollections();
};

const closeCollectionPicker = () => { collectionPickerMediaId.value = null; };

const setType = (type: MediaType | null) => {
  if (activeType.value === type) return;
  activeType.value = type;
  currentPage.value = 1;
};

const goToPage = (page: number) => {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return;
  currentPage.value = page;
};

const onSortChange = (e: Event) => {
  const val = (e.target as HTMLSelectElement).value;
  const [field, order] = val.split('-') as [SortField, SortOrder];
  sortField.value = field;
  sortOrder.value = order;
  currentPage.value = 1;
};

// ─── Watchers ─────────────────────────────────────────────────────────────────

// Fires only after the debounce settles (or immediately on empty string).
watch(debouncedSearch, () => {
  currentPage.value = 1;
  fetchMedia();
});

watch([activeType, sortField, sortOrder], () => {
  currentPage.value = 1;
  fetchMedia();
});

watch(currentPage, fetchMedia);

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(() => {
  fetchMedia();
  window.addEventListener('click', closeCollectionPicker);
});

onUnmounted(() => {
  // useAbortController and useDebounce both clean up via their own onUnmounted hooks.
  window.removeEventListener('click', closeCollectionPicker);
});

// ─── Display helpers ──────────────────────────────────────────────────────────

const TYPE_NAV = [
  { type: 'FILM' as MediaType,    label: 'Movies',   icon: 'movie' },
  { type: 'SERIES' as MediaType,  label: 'Shows',    icon: 'tv' },
  { type: 'BOOK' as MediaType,    label: 'Books',    icon: 'menu_book' },
  { type: 'ARTICLE' as MediaType, label: 'Articles', icon: 'article' },
];

const TYPE_ICON: Record<string, string> = {
  FILM: 'movie', SERIES: 'tv', BOOK: 'menu_book', ARTICLE: 'article', OTHER: 'category',
};

const TYPE_COLOR: Record<string, string> = {
  FILM: '#0043ce', SERIES: '#393939', BOOK: '#6e4c31', ARTICLE: '#005d5d', OTHER: '#393939',
};

const SORT_OPTIONS = [
  { value: 'createdAt-desc', label: 'Latest added' },
  { value: 'createdAt-asc',  label: 'Oldest added' },
  { value: 'title-asc',      label: 'Title A → Z' },
  { value: 'title-desc',     label: 'Title Z → A' },
  { value: 'releaseDate-desc', label: 'Release (newest)' },
  { value: 'releaseDate-asc',  label: 'Release (oldest)' },
];

const sortValue = computed(() => `${sortField.value}-${sortOrder.value}`);

const platformIcon = (platform: string): string => {
  const p = platform.toLowerCase();
  if (p.includes('netflix'))              return 'play_circle';
  if (p.includes('amazon') || p.includes('prime')) return 'shopping_bag';
  if (p.includes('spotify'))             return 'headphones';
  if (p.includes('theater') || p.includes('cinema')) return 'theaters';
  if (p.includes('youtube'))             return 'smart_display';
  if (p.includes('apple'))               return 'tv';
  return 'desktop_windows';
};

const releaseYear = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  try { return new Date(dateStr).getFullYear().toString(); } catch { return ''; }
};

const cardMeta = (item: MediaItem): string =>
  [item.directorAuthor, releaseYear(item.releaseDate)].filter(Boolean).join(' • ');
</script>

<template>
  <div class="catalog-layout">

    <!-- ── Left Sidebar ───────────────────────────────────────── -->
    <aside class="catalog-sidebar">
      <div class="sidebar-header">
        <span class="sidebar-title">Collections</span>
        <span class="sidebar-subtitle">Global Library</span>
      </div>

      <nav class="sidebar-nav">
        <button
          :class="['sidebar-item', { 'sidebar-item--active': activeType === null }]"
          @click="setType(null)"
        >
          <span class="material-symbols-outlined">grid_view</span>
          <span>All Media</span>
        </button>
        <button
          v-for="nav in TYPE_NAV"
          :key="nav.type"
          :class="['sidebar-item', { 'sidebar-item--active': activeType === nav.type }]"
          @click="setType(nav.type)"
        >
          <span class="material-symbols-outlined">{{ nav.icon }}</span>
          <span>{{ nav.label }}</span>
        </button>
      </nav>

      <div class="sidebar-footer">
        <a href="#" class="sidebar-item">
          <span class="material-symbols-outlined">help</span>
          <span>Help</span>
        </a>
        <a href="#" class="sidebar-item">
          <span class="material-symbols-outlined">chat_bubble</span>
          <span>Feedback</span>
        </a>
      </div>
    </aside>

    <!-- ── Main Content ───────────────────────────────────────── -->
    <div class="catalog-content">

      <!-- Toolbar -->
      <div class="catalog-toolbar">
        <!-- Search -->
        <div class="catalog-search-wrapper">
          <!-- Icon: spinning while debounce is pending OR request is loading -->
          <span
            :class="['material-symbols-outlined', 'catalog-search-icon',
                     { 'catalog-spinner': isSearchPending || isLoading }]"
          >{{ isSearchPending || isLoading ? 'autorenew' : 'search' }}</span>

          <input
            v-model="searchQuery"
            type="text"
            class="catalog-search-input"
            :class="{ 'catalog-search-input--has-value': searchQuery }"
            placeholder="Search catalog..."
            aria-label="Search media catalog"
          />

          <!-- Clear button: shown only when there is text in the input -->
          <button
            v-if="searchQuery"
            class="search-clear-btn"
            type="button"
            aria-label="Clear search"
            @click.stop="searchQuery = ''"
          >
            <span class="material-symbols-outlined" style="font-size:16px">close</span>
          </button>
        </div>

        <!-- Filter chips -->
        <div class="filter-chips">
          <span class="filter-label">Filter:</span>
          <button
            :class="['filter-chip', { 'filter-chip--active': activeType === null }]"
            @click="setType(null)"
          >All</button>
          <button
            v-for="nav in TYPE_NAV"
            :key="nav.type"
            :class="['filter-chip', { 'filter-chip--active': activeType === nav.type }]"
            @click="setType(nav.type)"
          >{{ nav.label }}</button>
        </div>

        <!-- Sort -->
        <div class="sort-wrapper">
          <label class="sort-label" for="catalog-sort">Sort:</label>
          <div class="sort-select-wrapper">
            <select
              id="catalog-sort"
              class="sort-select"
              :value="sortValue"
              @change="onSortChange"
            >
              <option v-for="opt in SORT_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <span class="material-symbols-outlined sort-arrow">expand_more</span>
          </div>
        </div>
      </div>

      <!-- Results bar -->
      <div v-if="!isLoading && totalItems > 0" class="results-bar">
        <span>
          Showing <strong>{{ rangeStart }}–{{ rangeEnd }}</strong>
          of <strong>{{ totalItems }}</strong> results
        </span>
        <span v-if="activeType" class="results-filter-badge">
          <span class="material-symbols-outlined" style="font-size:14px">{{ TYPE_ICON[activeType] }}</span>
          {{ TYPE_NAV.find(n => n.type === activeType)?.label }}
          <button class="badge-clear" @click="setType(null)" title="Clear filter">✕</button>
        </span>
      </div>

      <!-- Content area -->
      <div class="catalog-grid-area">

        <!-- Error banner: non-blocking, shown above the grid on subsequent fetch errors -->
        <div v-if="error" class="error-banner">
          <span class="material-symbols-outlined" style="font-size:18px">error</span>
          <span>{{ error }}</span>
          <button class="retry-btn" @click="fetchMedia">Retry</button>
          <button class="banner-close" aria-label="Dismiss" @click="error = ''">
            <span class="material-symbols-outlined" style="font-size:16px">close</span>
          </button>
        </div>

        <!-- Initial loading: no items in cache yet -->
        <div v-if="isLoading && mediaItems.length === 0" class="catalog-status">
          <span class="material-symbols-outlined catalog-spinner">autorenew</span>
          <span>Loading catalog…</span>
        </div>

        <!-- Empty state after a successful (but empty) fetch -->
        <div v-else-if="!isLoading && mediaItems.length === 0 && !error" class="catalog-status">
          <span class="material-symbols-outlined">search_off</span>
          <p>No media found{{ searchQuery ? ` for "${searchQuery}"` : '' }}.</p>
        </div>

        <!-- Grid: stays visible and dims while fetching new results -->
        <div
          v-else-if="mediaItems.length > 0"
          :class="['media-grid', { 'media-grid--loading': isLoading }]"
        >
          <article
            v-for="item in mediaItems"
            :key="item.id"
            class="media-card"
            @click="router.push({ name: 'MediaDetail', params: { id: item.id } })"
          >
            <!-- Poster -->
            <div
              class="media-card-poster"
              :style="{ backgroundColor: TYPE_COLOR[item.type] ?? '#393939' }"
            >
              <span class="media-card-poster-icon material-symbols-outlined">
                {{ TYPE_ICON[item.type] ?? 'movie' }}
              </span>

              <!-- Hover overlay -->
              <div class="media-card-overlay" @click.stop>
                <div v-if="addSuccessMediaId === item.id" class="overlay-success">
                  <span class="material-symbols-outlined">check_circle</span>
                  <span>Added!</span>
                </div>
                <template v-else>
                  <button class="overlay-btn" @click.stop="openCollectionPicker(item.id, $event)">
                    <span class="material-symbols-outlined" style="font-size:18px">add</span>
                    Add to Watchlist
                  </button>
                  <div
                    v-if="collectionPickerMediaId === item.id"
                    class="collection-picker"
                    @click.stop
                  >
                    <div v-if="isCollectionsLoading" class="picker-empty">Loading…</div>
                    <div v-else-if="collections.length === 0" class="picker-empty">No collections yet</div>
                    <button
                      v-for="col in collections"
                      :key="col.id"
                      class="picker-item"
                      :disabled="isAddingToCollection === item.id"
                      @click.stop="addToCollection(item.id, col.id)"
                    >
                      <span class="material-symbols-outlined" style="font-size:16px">folder</span>
                      {{ col.name }}
                    </button>
                  </div>
                </template>
              </div>
            </div>

            <!-- Card body -->
            <div class="media-card-body">
              <h3 class="media-card-title">{{ item.title }}</h3>
              <p class="media-card-meta">{{ cardMeta(item) }}</p>
              <div v-if="item.platforms?.length" class="media-card-platforms">
                <span
                  v-for="(p, i) in item.platforms.slice(0, 4)"
                  :key="i"
                  class="material-symbols-outlined platform-icon"
                  :title="p"
                >{{ platformIcon(p) }}</span>
              </div>
            </div>
          </article>
        </div>

        <!-- ── Pagination ──────────────────────────────────────── -->
        <nav
          v-if="totalPages > 1 && !isLoading && mediaItems.length > 0"
          class="pagination"
          aria-label="Page navigation"
        >
          <!-- Prev -->
          <button
            class="page-btn"
            :disabled="currentPage === 1 || !paginationLinks?.prev"
            aria-label="Previous page"
            @click="goToPage(currentPage - 1)"
          >
            <span class="material-symbols-outlined">chevron_left</span>
          </button>

          <!-- Page number buttons -->
          <template v-for="(p, i) in visiblePages" :key="i">
            <span v-if="p === '...'" class="page-ellipsis">…</span>
            <button
              v-else
              :class="['page-btn', 'page-num', { 'page-btn--active': p === currentPage }]"
              :aria-label="`Page ${p}`"
              :aria-current="p === currentPage ? 'page' : undefined"
              @click="goToPage(p as number)"
            >{{ p }}</button>
          </template>

          <!-- Next -->
          <button
            class="page-btn"
            :disabled="currentPage === totalPages || !paginationLinks?.next"
            aria-label="Next page"
            @click="goToPage(currentPage + 1)"
          >
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
        </nav>

      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Layout ──────────────────────────────────────────────── */
.catalog-layout {
  display: flex;
  min-height: calc(100vh - 48px);
  background-color: #ffffff;
}

/* ── Sidebar ─────────────────────────────────────────────── */
.catalog-sidebar {
  width: 256px;
  min-width: 256px;
  border-right: 1px solid #e0e0e0;
  background-color: #f6f3f2;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: calc(100vh - 48px);
  overflow-y: auto;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar-title {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 700;
  font-size: 14px;
  color: #161616;
  letter-spacing: 0.16px;
}

.sidebar-subtitle {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 13px;
  color: #525252;
  letter-spacing: 0.16px;
}

.sidebar-nav {
  flex: 1;
  padding: 16px 0;
  display: flex;
  flex-direction: column;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  color: #525252;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  text-decoration: none;
  letter-spacing: 0.16px;
  line-height: 1.5;
  transition: background-color 0.1s;
  width: 100%;
}

.sidebar-item:hover {
  background-color: #eae7e7;
  color: #161616;
}

.sidebar-item--active {
  background-color: #e0e0e0;
  border-left: 4px solid #0f62fe;
  color: #161616;
  padding-left: 12px;
}

.sidebar-footer {
  border-top: 1px solid #e0e0e0;
  padding: 16px 0;
  margin-top: auto;
  display: flex;
  flex-direction: column;
}

/* ── Main Content ────────────────────────────────────────── */
.catalog-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* ── Toolbar ─────────────────────────────────────────────── */
.catalog-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 24px;
  padding: 12px 24px;
  border-bottom: 1px solid #e0e0e0;
  background-color: #ffffff;
  position: sticky;
  top: 0;
  z-index: 5;
}

.catalog-search-wrapper {
  position: relative;
  flex: 1;
  min-width: 180px;
  max-width: 360px;
}

.catalog-search-icon {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 18px;
  color: #8d8d8d;
  pointer-events: none;
}

.catalog-search-input {
  width: 100%;
  height: 34px;
  background-color: #ffffff;
  border: none;
  border-bottom: 1px solid #8d8d8d;
  padding: 0 10px 0 32px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  color: #161616;
  outline: none;
  letter-spacing: 0.16px;
  transition: border-bottom-color 0.15s;
}

.catalog-search-input::placeholder { color: #a8a8a8; }

.catalog-search-input:focus { border-bottom-color: #0f62fe; }

/* Pad right side when the clear button is present */
.catalog-search-input--has-value { padding-right: 28px; }

/* Clear (×) button inside the search field */
.search-clear-btn {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  cursor: pointer;
  color: #525252;
  transition: color 0.1s;
  padding: 0;
}

.search-clear-btn:hover { color: #161616; }

/* Filter chips */
.filter-chips {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.filter-label,
.sort-label {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 12px;
  color: #525252;
  white-space: nowrap;
  letter-spacing: 0.32px;
  text-transform: uppercase;
}

.filter-chip {
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  color: #161616;
  padding: 3px 10px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 13px;
  letter-spacing: 0.16px;
  cursor: pointer;
  transition: background-color 0.1s, border-color 0.1s;
  height: 28px;
}

.filter-chip:hover { background-color: #f4f4f4; }

.filter-chip--active {
  background-color: #e8eeff;
  border-color: #0f62fe;
  color: #0043ce;
  font-weight: 500;
}

/* Sort */
.sort-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.sort-select-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.sort-select {
  appearance: none;
  background-color: #ffffff;
  border: none;
  border-bottom: 1px solid #8d8d8d;
  padding: 4px 28px 4px 8px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 13px;
  color: #161616;
  cursor: pointer;
  outline: none;
  height: 34px;
  letter-spacing: 0.16px;
  transition: border-bottom-color 0.15s;
}

.sort-select:focus { border-bottom-color: #0f62fe; }

.sort-arrow {
  position: absolute;
  right: 4px;
  font-size: 18px;
  color: #525252;
  pointer-events: none;
}

/* ── Results bar ─────────────────────────────────────────── */
.results-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 24px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 13px;
  color: #525252;
  border-bottom: 1px solid #e0e0e0;
  background-color: #fafafa;
  flex-wrap: wrap;
}

.results-filter-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background-color: #e8eeff;
  border: 1px solid #0f62fe;
  color: #0043ce;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 500;
}

.badge-clear {
  background: none;
  border: none;
  color: #0043ce;
  cursor: pointer;
  padding: 0 0 0 4px;
  font-size: 11px;
  line-height: 1;
}

/* ── Grid area ───────────────────────────────────────────── */
.catalog-grid-area {
  flex: 1;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ── Status / Empty / Error ──────────────────────────────── */
.catalog-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 64px 24px;
  color: #525252;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
}

.catalog-status .material-symbols-outlined {
  font-size: 40px;
  color: #8d8d8d;
}

.catalog-status--error { color: #ba1a1a; }
.catalog-status--error .material-symbols-outlined { color: #ba1a1a; }

/* ── Error banner (non-blocking, shows above the grid) ────── */
.error-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background-color: #ffd7d9;
  border-left: 3px solid #da1e28;
  color: #750000;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 13px;
}

.banner-close {
  background: none;
  border: none;
  color: #750000;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0;
  margin-left: auto;
}

.retry-btn {
  background-color: #da1e28;
  color: #ffffff;
  border: none;
  padding: 5px 14px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.15s;
  white-space: nowrap;
}

.retry-btn:hover { background-color: #b81922; }

.catalog-spinner { animation: spin 1s linear infinite; }

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* ── Media Grid ──────────────────────────────────────────── */
.media-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

@media (min-width: 480px) { .media-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 900px) { .media-grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 1280px) { .media-grid { grid-template-columns: repeat(4, 1fr); } }

/* Keep previous results visible but dimmed while a new request is loading */
.media-grid--loading {
  opacity: 0.45;
  pointer-events: none;
  transition: opacity 0.2s;
}

/* ── Media Card ──────────────────────────────────────────── */
.media-card {
  border: 1px solid #e0e0e0;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: border-color 0.15s;
}

.media-card:hover { border-color: #0f62fe; }

.media-card-poster {
  width: 100%;
  aspect-ratio: 2 / 3;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.media-card-poster-icon {
  font-size: 56px;
  color: rgba(255, 255, 255, 0.2);
  user-select: none;
}

/* Hover overlay */
.media-card-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(22, 22, 22, 0.82);
  opacity: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  transition: opacity 0.18s;
}

.media-card:hover .media-card-overlay { opacity: 1; }

.overlay-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #ffffff;
  background: transparent;
  color: #ffffff;
  padding: 8px 16px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 13px;
  letter-spacing: 0.16px;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.overlay-btn:hover {
  background-color: #ffffff;
  color: #161616;
}

.overlay-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #42be65;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
}

.overlay-success .material-symbols-outlined { font-size: 32px; }

/* Collection picker */
.collection-picker {
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  width: 100%;
  max-height: 200px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.picker-empty {
  padding: 12px 16px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 13px;
  color: #525252;
  text-align: center;
}

.picker-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 16px;
  background: none;
  border: none;
  border-bottom: 1px solid #f4f4f4;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 13px;
  color: #161616;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.1s;
}

.picker-item:last-child { border-bottom: none; }
.picker-item:hover:not(:disabled) { background-color: #f4f4f4; }
.picker-item:disabled { opacity: 0.5; cursor: not-allowed; }

/* Card body */
.media-card-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.media-card-title {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 600;
  font-size: 15px;
  color: #161616;
  letter-spacing: 0.16px;
  line-height: 1.4;
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.media-card-meta {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 13px;
  color: #525252;
  letter-spacing: 0.16px;
  margin: 0 0 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.media-card-platforms {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid #f4f4f4;
  display: flex;
  gap: 8px;
  color: #8d8d8d;
}

.platform-icon { font-size: 20px; }

/* ── Pagination ──────────────────────────────────────────── */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 0 16px;
  flex-wrap: wrap;
}

.page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  padding: 0 4px;
  border: 1px solid #e0e0e0;
  background-color: #ffffff;
  color: #161616;
  cursor: pointer;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 13px;
  letter-spacing: 0.16px;
  transition: background-color 0.1s, border-color 0.1s;
}

.page-num { min-width: 36px; }

.page-btn:hover:not(:disabled):not(.page-btn--active) {
  background-color: #f4f4f4;
}

.page-btn--active {
  background-color: #0f62fe;
  border-color: #0f62fe;
  color: #ffffff;
  cursor: default;
}

.page-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.page-ellipsis {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  color: #525252;
  user-select: none;
}

/* ── Responsive ──────────────────────────────────────────── */
@media (max-width: 767px) {
  .catalog-sidebar { display: none; }
  .sort-wrapper { margin-left: 0; }
}
</style>
