<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useStatsStore } from '@/stores/stats';
import AppModal from '@/components/AppModal.vue';

// === State ===================================================================
const statsStore = useStatsStore();

const stats = computed(() => statsStore.stats);
const loading = computed(() => statsStore.isLoading || (!statsStore.stats && !statsStore.error));
const error = computed(() => statsStore.error);

// Compteurs et statistiques calculés basés sur le store Pinia (Données dérivées)
const totalMediaCount = computed(() => statsStore.totalMedia);
const averageMediaPerCollection = computed(() => statsStore.avgMediaPerCollection);
const collectionsOwnedCount = computed(() => statsStore.collectionsOwned);
const collectionsSharedCount = computed(() => statsStore.collectionsShared);
const totalCollectionsCount = computed(() => statsStore.totalCollections);

const isModalOpen = ref(false);
const selectedRecentItem = ref<any>(null);

function openRecentItem(item: any) {
  selectedRecentItem.value = item;
  isModalOpen.value = true;
}

// === Fetch ===================================================================
onMounted(() => {
  statsStore.fetchStats();
});

// === Computed: Media Distribution (donut chart) ===============================
const MEDIA_TYPE_COLORS: Record<string, string> = {
  FILM:    '#0f62fe',
  SERIES:  '#24a148',
  BOOK:    '#f1c21b',
  ARTICLE: '#8a3ffc',
  OTHER:   '#393939',
};

const MEDIA_TYPE_LABELS: Record<string, string> = {
  FILM: 'Films', SERIES: 'Series', BOOK: 'Books', ARTICLE: 'Articles', OTHER: 'Other',
};

/**
 * Computed: sorted type items with their percentage share.
 * Derived entirely from the raw API response — demonstrates the computed pattern.
 */
const typeItems = computed(() => {
  if (totalMediaCount.value === 0) return [];
  return statsStore.byType.map(({ type, count }) => ({
    type,
    label: MEDIA_TYPE_LABELS[type] ?? type,
    count,
    pct: Math.round((count / totalMediaCount.value) * 100),
    color: MEDIA_TYPE_COLORS[type] ?? '#8d8d8d',
  }));
});

/** CSS conic-gradient string for the donut chart. */
const donutGradient = computed(() => {
  if (typeItems.value.length === 0) return 'conic-gradient(#e0e0e0 0% 100%)';
  let cursor = 0;
  const stops = typeItems.value.map(({ pct, color }) => {
    const start = cursor;
    cursor += pct;
    return `${color} ${start}% ${cursor}%`;
  });
  return `conic-gradient(${stops.join(', ')})`;
});

// === Computed: Top Tags =======================================================
const topTagsDisplay = computed(() => {
  const tags = statsStore.topTags;
  if (!tags.length) return [];
  const max = tags[0]?.count ?? 1;
  return tags.slice(0, 6).map(({ tag, count }) => ({
    tag,
    count,
    widthPct: Math.round((count / max) * 100),
  }));
});

// === Computed: Top Platforms ==================================================
const topPlatformsDisplay = computed(() => {
  const platforms = statsStore.topPlatforms;
  if (!platforms.length) return [];
  const max = platforms[0]?.count ?? 1;
  return platforms.slice(0, 5).map(({ platform, count }) => ({
    platform,
    count,
    widthPct: Math.round((count / max) * 100),
    initial: platform.charAt(0).toUpperCase(),
  }));
});

// === Computed: Recent items formatted ========================================
const recentItemsDisplay = computed(() => {
  return statsStore.recentItems.map((item) => ({
    ...item,
    typeLabel: MEDIA_TYPE_LABELS[item.type] ?? item.type,
    typeColor: MEDIA_TYPE_COLORS[item.type] ?? '#8d8d8d',
    dateLabel: new Date(item.addedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
  }));
});

// === Helpers =================================================================
function platformColor(platform: string): string {
  const map: Record<string, string> = {
    netflix: '#e50914', prime: '#00a8e1', 'amazon prime': '#00a8e1',
    hulu: '#3dba4e', 'disney+': '#113ccf', 'apple tv+': '#555555',
    hbo: '#6a1be8', peacock: '#eb7800',
  };
  return map[platform.toLowerCase()] ?? '#0f62fe';
}
</script>

<template>
  <div class="stats-page">
    <!-- Page Header -->
    <header class="stats-header">
      <h1 class="stats-title">Library Analytics</h1>
      <p class="stats-subtitle">Comprehensive overview of your media distribution and engagement.</p>
    </header>

    <!-- Loading state -->
    <div v-if="loading" class="stats-loading">
      <div class="loading-spinner"></div>
      <span>Loading your statistics…</span>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="stats-error">
      <span class="material-symbols-outlined">error</span>
      <p>{{ error }}</p>
    </div>

    <!-- Empty state -->
    <div v-else-if="stats && totalMediaCount === 0" class="stats-empty">
      <span class="material-symbols-outlined stats-empty-icon">library_add</span>
      <h2>No media yet</h2>
      <p>Add media to your collections to see your library analytics here.</p>
    </div>

    <!-- Main dashboard grid -->
    <div v-else-if="stats" class="stats-grid">

      <!-- == Card 1: Media Distribution (Donut) ============ -->
      <div class="stats-card">
        <div class="stats-card-header">
          <h3 class="stats-card-title">Media Distribution</h3>
          <span class="material-symbols-outlined stats-card-icon">pie_chart</span>
        </div>
        <div class="donut-wrapper">
          <div class="donut-chart" :style="{ background: donutGradient }"></div>
          <div class="donut-center">
            <div class="donut-total">{{ totalMediaCount.toLocaleString() }}</div>
            <div class="donut-label">Total Items</div>
          </div>
        </div>
        <div class="donut-legend">
          <div v-for="item in typeItems" :key="item.type" class="legend-item">
            <div class="legend-dot" :style="{ backgroundColor: item.color }"></div>
            <span>{{ item.label }} ({{ item.pct }}%)</span>
          </div>
        </div>
      </div>

      <!-- == Card 2: Top Tags (Horizontal bars) ============ -->
      <div class="stats-card">
        <div class="stats-card-header">
          <h3 class="stats-card-title">Top Tags</h3>
          <span class="material-symbols-outlined stats-card-icon">bar_chart</span>
        </div>
        <div v-if="topTagsDisplay.length" class="bar-list">
          <div v-for="item in topTagsDisplay" :key="item.tag" class="bar-item">
            <div class="bar-meta">
              <span class="bar-label">{{ item.tag }}</span>
              <span class="bar-count">{{ item.count }}</span>
            </div>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: item.widthPct + '%' }"></div>
            </div>
          </div>
        </div>
        <div v-else class="stats-no-data">
          <span class="material-symbols-outlined">label_off</span>
          <p>No tags used yet.</p>
        </div>
      </div>

      <!-- == Card 3: Collection Summary ==================== -->
      <div class="stats-card">
        <div class="stats-card-header">
          <h3 class="stats-card-title">Collection Connections</h3>
          <span class="material-symbols-outlined stats-card-icon">hub</span>
        </div>
        <div class="collection-summary">
          <div class="collection-big-stat">
            <div class="collection-big-number">{{ averageMediaPerCollection }}</div>
            <div class="collection-big-label">Avg. Items per Collection</div>
          </div>
          <div class="collection-metrics">
            <div class="metric-cell">
              <div class="metric-name">Owned</div>
              <div class="metric-value">{{ collectionsOwnedCount }}</div>
            </div>
            <div class="metric-cell">
              <div class="metric-name">Shared</div>
              <div class="metric-value">{{ collectionsSharedCount }}</div>
            </div>
            <div class="metric-cell">
              <div class="metric-name">Total Media</div>
              <div class="metric-value">{{ totalMediaCount.toLocaleString() }}</div>
            </div>
            <div class="metric-cell">
              <div class="metric-name">Total Collections</div>
              <div class="metric-value">{{ totalCollectionsCount }}</div>
            </div>
          </div>
        </div>

        <!-- Recent Activity strip -->
        <div v-if="recentItemsDisplay.length" class="recent-activity">
          <div class="recent-header">Recently Added (click to view details)</div>
          <div v-for="item in recentItemsDisplay" :key="item.mediaId" class="recent-item recent-item-clickable" @click="openRecentItem(item)">
            <div class="recent-dot" :style="{ backgroundColor: item.typeColor }"></div>
            <div class="recent-info">
              <span class="recent-title">{{ item.title }}</span>
              <span class="recent-meta">{{ item.dateLabel }} · {{ item.collectionName }}</span>
            </div>
            <span class="recent-type">{{ item.typeLabel }}</span>
          </div>
        </div>
      </div>

      <!-- == Card 4: Platform Coverage ===================== -->
      <div class="stats-card">
        <div class="stats-card-header">
          <h3 class="stats-card-title">Platform Coverage</h3>
          <span class="material-symbols-outlined stats-card-icon">cell_tower</span>
        </div>
        <div v-if="topPlatformsDisplay.length" class="platform-list">
          <div v-for="item in topPlatformsDisplay" :key="item.platform" class="platform-row">
            <div class="platform-badge" :style="{ backgroundColor: platformColor(item.platform) }">
              {{ item.initial }}
            </div>
            <div class="platform-info">
              <div class="platform-meta">
                <span class="platform-name">{{ item.platform }}</span>
                <span class="platform-count">{{ item.count }} items</span>
              </div>
              <div class="platform-track">
                <div class="platform-fill" :style="{ width: item.widthPct + '%', backgroundColor: platformColor(item.platform) }"></div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="stats-no-data">
          <span class="material-symbols-outlined">devices_off</span>
          <p>No platform data yet.</p>
        </div>
      </div>

    </div>

    <!-- Modal detail view -->
    <AppModal v-model="isModalOpen" :title="selectedRecentItem?.title">
      <div v-if="selectedRecentItem" class="modal-detail-content">
        <div class="modal-detail-row">
          <span class="modal-detail-label">Type</span>
          <span class="modal-detail-value">
            <span class="modal-type-badge" :style="{ backgroundColor: selectedRecentItem.typeColor }">
              {{ selectedRecentItem.typeLabel }}
            </span>
          </span>
        </div>
        <div class="modal-detail-row">
          <span class="modal-detail-label">Collection</span>
          <span class="modal-detail-value">{{ selectedRecentItem.collectionName }}</span>
        </div>
        <div class="modal-detail-row">
          <span class="modal-detail-label">Added Date</span>
          <span class="modal-detail-value">{{ selectedRecentItem.dateLabel }}</span>
        </div>
      </div>
      <template #footer>
        <button class="modal-close-action" @click="isModalOpen = false">Close</button>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
/* == Page ================================================== */
.stats-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.stats-header {
  margin-bottom: 2.5rem;
}

.stats-title {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 300;
  font-size: 2.5rem;
  line-height: 1.2;
  color: #161616;
  margin: 0 0 0.5rem;
}

.stats-subtitle {
  font-size: 14px;
  color: #525252;
  margin: 0;
}

/* == States ================================================ */
.stats-loading,
.stats-error,
.stats-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  min-height: 300px;
  color: #525252;
  font-size: 14px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e0e0e0;
  border-top-color: #0f62fe;
  border-radius: 50% !important;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.stats-error {
  color: #da1e28;
}

.stats-error .material-symbols-outlined {
  font-size: 2rem;
}

.stats-empty-icon {
  font-size: 3rem;
  color: #c6c6c6;
}

.stats-empty h2 {
  font-weight: 300;
  font-size: 1.5rem;
  margin: 0;
}

.stats-empty p {
  font-size: 14px;
  margin: 0;
}

.stats-no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  flex: 1;
  color: #8d8d8d;
  font-size: 13px;
}

.stats-no-data .material-symbols-outlined {
  font-size: 2rem;
  color: #c6c6c6;
}

/* == Grid ================================================== */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

@media (max-width: 900px) {
  .stats-grid { grid-template-columns: 1fr; }
}

/* == Card ================================================== */
.stats-card {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  min-height: 380px;
}

.stats-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.stats-card-title {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 600;
  font-size: 1rem;
  color: #161616;
  margin: 0;
}

.stats-card-icon {
  color: #8d8d8d;
  font-size: 1.25rem;
}

/* == Donut chart =========================================== */
.donut-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  min-height: 200px;
}

.donut-chart {
  width: 180px;
  height: 180px;
  border-radius: 50% !important;
  flex-shrink: 0;
}

.donut-center {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 110px;
  height: 110px;
  background: #ffffff;
  border-radius: 50% !important;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.donut-total {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 300;
  font-size: 1.75rem;
  color: #161616;
  line-height: 1;
}

.donut-label {
  font-size: 11px;
  color: #525252;
  margin-top: 4px;
  text-align: center;
}

.donut-legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem 1rem;
  margin-top: 1.25rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #161616;
}

.legend-dot {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
}

/* == Bar list (tags) ======================================= */
.bar-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
  justify-content: center;
}

.bar-item { width: 100%; }

.bar-meta {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 4px;
}

.bar-label { color: #161616; }
.bar-count { color: #525252; }

.bar-track {
  width: 100%;
  height: 8px;
  background: #f4f4f4;
}

.bar-fill {
  height: 100%;
  background: #0f62fe;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

/* == Collection summary ==================================== */
.collection-summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.collection-big-stat {
  text-align: center;
}

.collection-big-number {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 300;
  font-size: 3.5rem;
  color: #0f62fe;
  line-height: 1;
}

.collection-big-label {
  font-size: 13px;
  font-weight: 600;
  color: #161616;
  margin-top: 6px;
}

.collection-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  width: 100%;
  border-top: 1px solid #e0e0e0;
  padding-top: 1.25rem;
}

.metric-cell { text-align: center; }

.metric-name {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #525252;
  margin-bottom: 4px;
}

.metric-value {
  font-size: 1.25rem;
  font-family: 'IBM Plex Sans', sans-serif;
  color: #161616;
}

/* == Recent activity ======================================= */
.recent-activity {
  width: 100%;
  border-top: 1px solid #e0e0e0;
  padding-top: 1rem;
  margin-top: 0.5rem;
}

.recent-header {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #525252;
  margin-bottom: 0.75rem;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid #f4f4f4;
}

.recent-dot {
  width: 8px;
  height: 8px;
  border-radius: 50% !important;
  flex-shrink: 0;
}

.recent-info {
  flex: 1;
  min-width: 0;
}

.recent-title {
  font-size: 13px;
  color: #161616;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-meta {
  font-size: 11px;
  color: #8d8d8d;
}

.recent-type {
  font-size: 11px;
  color: #525252;
  white-space: nowrap;
  flex-shrink: 0;
}

/* == Platform coverage ===================================== */
.platform-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  flex: 1;
  justify-content: center;
}

.platform-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.platform-badge {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-weight: 700;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.platform-info { flex: 1; }

.platform-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.platform-name {
  font-size: 13px;
  font-weight: 600;
  color: #161616;
}

.platform-count {
  font-size: 12px;
  color: #525252;
}

.platform-track {
  width: 100%;
  height: 4px;
  background: #f4f4f4;
}

.platform-fill {
  height: 100%;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

/* == Modal Integration Styles ============================= */
.recent-item-clickable {
  cursor: pointer;
  transition: background-color 0.15s ease-in-out;
}

.recent-item-clickable:hover {
  background-color: #f4f4f4;
}

.modal-detail-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f4f4f4;
  padding-bottom: 0.5rem;
}

.modal-detail-label {
  font-weight: 600;
  color: #161616;
}

.modal-detail-value {
  color: #525252;
}

.modal-type-badge {
  color: #ffffff;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.modal-close-action {
  background-color: #393939;
  color: #ffffff;
  border: none;
  padding: 0.5rem 1.5rem;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.15s ease-in-out;
}

.modal-close-action:hover {
  background-color: #4c4c4c;
}
</style>
