<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useInvitationsStore } from '@/stores/invitations';
import { useStatsStore } from '@/stores/stats';

const router = useRouter();
const invitationsStore = useInvitationsStore();
const statsStore = useStatsStore();

// === State ====================================================================

const respondingId = ref<string | null>(null);

const imageErrors = ref<Record<string, boolean>>({});
const handleImageError = (id: string) => {
  imageErrors.value[id] = true;
};

// Delegate all stats state to the shared store
const isLoading = computed(() => statsStore.isLoading);
const error = computed(() => statsStore.error);
const stats = computed(() => statsStore.stats);

// === Display helpers ==========================================================

const TYPE_COLOR: Record<string, string> = {
  FILM: '#0043ce', SERIES: '#393939', BOOK: '#6e4c31', ARTICLE: '#005d5d', OTHER: '#393939',
};
const TYPE_ICON: Record<string, string> = {
  FILM: 'movie', SERIES: 'tv', BOOK: 'menu_book', ARTICLE: 'article', OTHER: 'category',
};

const invitations = computed(() => invitationsStore.invitations ?? []);
const pendingCount = computed(() => invitationsStore.invitationCount);

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffH = Math.floor((now.getTime() - date.getTime()) / 3_600_000);
  if (diffH < 1)  return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Yesterday';
  if (diffD < 7)  return `${diffD} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// === API ======================================================================

const respond = async (collectionId: string, accept: boolean) => {
  respondingId.value = collectionId;
  try {
    await invitationsStore.respondToInvitation(collectionId, accept);
  } finally {
    respondingId.value = null;
  }
};

onMounted(() => {
  statsStore.fetchStats();
  invitationsStore.fetchInvitations();
});
</script>

<template>
  <div class="dash-layout">
    <!-- == Main content ============================================ -->
    <main class="dash-main">

      <!-- Loading -->
      <div v-if="isLoading" class="status-area">
        <span class="material-symbols-outlined status-spinner">autorenew</span>
        <span>Loading dashboard…</span>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="status-area">
        <p>{{ error }}</p>
        <button class="btn-ghost" @click="statsStore.fetchStats()">Retry</button>
      </div>

      <template v-else-if="stats">

        <!-- Page heading -->
        <header class="dash-header">
          <h1 class="dash-title">Dashboard Overview</h1>
        </header>

        <!-- == Stats cards ========================================== -->
        <section class="stats-grid">

          <div class="stat-card">
            <h3 class="stat-label">Active Watchlists</h3>
            <div class="stat-value">{{ stats.collectionsOwned }}</div>
          </div>

          <div class="stat-card">
            <h3 class="stat-label">Items Tracked</h3>
            <div class="stat-value">{{ stats.totalMedia }}</div>
          </div>

          <div class="stat-card">
            <h3 class="stat-label">Pending Invites</h3>
            <div class="stat-value-row">
              <div class="stat-value">{{ pendingCount }}</div>
              <span v-if="pendingCount > 0" class="ping-dot">
                <span class="ping-ring"></span>
                <span class="ping-core"></span>
              </span>
            </div>
          </div>

        </section>

        <!-- == Recent media carousel ================================ -->
        <section class="recent-section">
          <div class="section-header">
            <h2 class="section-title">Continue Watching&thinsp;/&thinsp;Reading</h2>
            <RouterLink :to="{ name: 'Catalog' }" class="view-all-link">
              View All
              <span class="material-symbols-outlined" style="font-size:16px">arrow_forward</span>
            </RouterLink>
          </div>

          <div class="carousel">

            <!-- Recent item cards -->
            <div
              v-for="item in stats.recentItems"
              :key="item.mediaId"
              class="media-card"
              @click="router.push({ name: 'MediaDetail', params: { id: item.mediaId } })"
            >
              <div
                class="media-poster"
                :style="{ backgroundColor: (item.url && !imageErrors[item.mediaId]) ? 'transparent' : (TYPE_COLOR[item.type] ?? '#393939') }"
              >
                <img
                  v-if="item.url && !imageErrors[item.mediaId]"
                  :src="item.url"
                  :alt="item.title"
                  class="media-poster-image"
                  @error="handleImageError(item.mediaId)"
                />
                <span v-else class="material-symbols-outlined media-poster-icon">
                  {{ TYPE_ICON[item.type] ?? 'category' }}
                </span>
              </div>
              <div class="media-info">
                <h4 class="media-title">{{ item.title }}</h4>
                <p class="media-meta">
                  {{ item.type.charAt(0) + item.type.slice(1).toLowerCase() }}
                  <template v-if="item.collectionName"> &bull; {{ item.collectionName }}</template>
                </p>
                <div class="media-added">Added {{ formatDate(item.addedAt) }}</div>
              </div>
            </div>

            <!-- Discover More card -->
            <div
              class="media-card media-card--discover"
              @click="router.push({ name: 'Catalog' })"
            >
              <div class="media-poster media-poster--discover">
                <span class="material-symbols-outlined discover-icon">add</span>
              </div>
              <div class="media-info">
                <h4 class="media-title">Discover More</h4>
                <p class="media-meta">Browse Catalog</p>
              </div>
            </div>

          </div>

          <!-- Empty carousel state -->
          <p v-if="stats.recentItems.length === 0" class="empty-hint">
            No items yet. <RouterLink :to="{ name: 'Catalog' }" class="inline-link">Browse the catalog</RouterLink> to get started.
          </p>
        </section>

      </template>
    </main>

    <!-- == Right sidebar: invitations ============================== -->
    <aside class="dash-right">
      <div class="right-header">
        <h2 class="right-title">
          <span class="material-symbols-outlined" style="font-size:20px">mail</span>
          Pending Invitations
        </h2>
      </div>

      <!-- Loading invitations -->
      <div v-if="invitationsStore.isLoading" class="right-status">
        <span class="material-symbols-outlined status-spinner" style="font-size:24px">autorenew</span>
      </div>

      <!-- No invitations -->
      <div v-else-if="invitations.length === 0" class="right-empty">
        <span class="material-symbols-outlined" style="font-size:32px;color:#8d8d8d">mark_email_read</span>
        <p>No pending invitations</p>
      </div>

      <!-- Invitation cards -->
      <div v-else class="invite-list">
        <div
          v-for="inv in invitations"
          :key="inv.id"
          class="invite-card"
        >
          <div class="invite-body">
            <div class="invite-avatar">
              {{ (inv.user?.name ?? inv.user?.email ?? '?')[0].toUpperCase() }}
            </div>
            <div class="invite-text">
              <p class="invite-msg">
                <strong>{{ inv.user?.name ?? inv.user?.email }}</strong>
                invited you to collaborate on
                <em>"{{ inv.collection?.name }}"</em>
              </p>
              <span class="invite-time">{{ formatDate(inv.invitedAt) }}</span>
            </div>
          </div>
          <div class="invite-actions">
            <button
              class="btn-accept"
              :disabled="respondingId === inv.collectionId"
              @click="respond(inv.collectionId, true)"
            >
              Accept
            </button>
            <button
              class="btn-decline"
              :disabled="respondingId === inv.collectionId"
              @click="respond(inv.collectionId, false)"
            >
              Decline
            </button>
          </div>
        </div>

        <div class="right-footer">
          <RouterLink :to="{ name: 'Invitations' }" class="inline-link">
            View all invitations
          </RouterLink>
        </div>
      </div>
    </aside>

  </div>
</template>

<style scoped>
/* == Three-column shell ==================================== */
.dash-layout {
  display: flex;
  min-height: calc(100vh - 48px);
  background-color: #ffffff;
  font-family: 'IBM Plex Sans', sans-serif;
}

/* == Left sidebar ========================================== */
.dash-sidebar {
  width: 240px;
  min-width: 240px;
  border-right: 1px solid #e0e0e0;
  background-color: #f4f4f4;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: calc(100vh - 48px);
  overflow-y: auto;
  overflow-x: hidden;
  transition: width 0.2s ease, min-width 0.2s ease;
}

.dash-sidebar--collapsed {
  width: 48px;
  min-width: 48px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 8px 12px 16px;
  border-bottom: 1px solid #e0e0e0;
  min-height: 56px;
  gap: 8px;
}

.sidebar-header-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  transition: opacity 0.15s ease, width 0.2s ease;
}

.dash-sidebar--collapsed .sidebar-header-text {
  opacity: 0;
  width: 0;
  pointer-events: none;
}

.sidebar-title {
  display: block;
  font-size: 11px;
  font-weight: 500;
  color: #525252;
  letter-spacing: 0.32px;
  text-transform: uppercase;
  margin-bottom: 2px;
  white-space: nowrap;
}

.sidebar-subtitle {
  display: block;
  font-size: 12px;
  color: #8d8d8d;
  letter-spacing: 0.16px;
  white-space: nowrap;
}

/* Toggle button */
.sidebar-toggle {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: #525252;
  border-radius: 0;
  transition: background-color 0.1s, color 0.1s;
  padding: 0;
}

.sidebar-toggle:hover { background-color: #e0e0e0; color: #161616; }
.sidebar-toggle .material-symbols-outlined { font-size: 20px; }

.sidebar-nav {
  flex: 1;
  padding: 8px 0;
  display: flex;
  flex-direction: column;
}

.sidebar-footer {
  border-top: 1px solid #e0e0e0;
  padding: 8px 0;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  color: #525252;
  text-decoration: none;
  letter-spacing: 0.16px;
  border-left: 4px solid transparent;
  transition: background-color 0.1s, color 0.1s;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
}

.sidebar-item:hover { background-color: #e0e0e0; color: #161616; }

.sidebar-item--active {
  background-color: #ffffff;
  border-left-color: #0f62fe;
  color: #161616;
  font-weight: 500;
}

.sidebar-item .material-symbols-outlined { font-size: 20px; flex-shrink: 0; }

/* Hide labels when collapsed */
.sidebar-label {
  transition: opacity 0.15s ease;
  overflow: hidden;
}

.dash-sidebar--collapsed .sidebar-label {
  opacity: 0;
  width: 0;
  pointer-events: none;
}

/* == Main content ========================================== */
.dash-main {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 32px;
  border-right: 1px solid #e0e0e0;
}

/* == Status areas ========================================== */
.status-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 64px 0;
  color: #525252;
  font-size: 14px;
}

.status-spinner { animation: spin 1s linear infinite; }

/* == Page heading ========================================== */
.dash-header { margin-bottom: 32px; }

.dash-title {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 300;
  font-size: 2.5rem;
  line-height: 1.2;
  color: #161616;
  margin: 0;
}

/* == Stats grid ============================================ */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 48px;
}

@media (max-width: 900px) { .stats-grid { grid-template-columns: 1fr; } }

.stat-card {
  border: 1px solid #e0e0e0;
  background-color: #ffffff;
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 16px;
}

.stat-label {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 11px;
  font-weight: 500;
  color: #525252;
  letter-spacing: 0.32px;
  text-transform: uppercase;
  margin: 0;
}

.stat-value {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 300;
  font-size: 3rem;
  line-height: 1;
  color: #161616;
}

.stat-value-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

/* Pulsing red dot */
.ping-dot {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 10px;
  height: 10px;
  margin-bottom: 10px;
}

.ping-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background-color: #da1e28;
  opacity: 0.75;
  animation: ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;
}

.ping-core {
  position: relative;
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #da1e28;
}

@keyframes ping {
  75%, 100% { transform: scale(2); opacity: 0; }
}

/* == Recent section ======================================== */
.section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 8px;
  margin-bottom: 24px;
}

.section-title {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 300;
  font-size: 1.5rem;
  color: #161616;
  margin: 0;
}

.view-all-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #0f62fe;
  font-size: 13px;
  letter-spacing: 0.16px;
  text-decoration: none;
  white-space: nowrap;
}

.view-all-link:hover { text-decoration: underline; color: #0043ce; }

/* == Carousel ============================================== */
.carousel {
  display: flex;
  gap: 20px;
  overflow-x: auto;
  padding-bottom: 12px;
  scroll-snap-type: x mandatory;
  /* hide scrollbar */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.carousel::-webkit-scrollbar { display: none; }

/* == Media card ============================================ */
.media-card {
  min-width: 220px;
  flex-shrink: 0;
  border: 1px solid #e0e0e0;
  background-color: #ffffff;
  scroll-snap-align: start;
  cursor: pointer;
  transition: background-color 0.1s;
}

.media-card:hover { background-color: #f4f4f4; }

.media-card--discover { background-color: #f4f4f4; }
.media-card--discover:hover { background-color: #e0e0e0; }

.media-poster {
  width: 100%;
  aspect-ratio: 2 / 3;
  max-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.media-poster-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  inset: 0;
}

.media-poster--discover { background-color: #e0e0e0; }

.media-poster-icon {
  font-size: 56px;
  color: rgba(255, 255, 255, 0.25);
  user-select: none;
}

.discover-icon {
  font-size: 48px;
  color: #525252;
  transition: color 0.15s;
}

.media-card--discover:hover .discover-icon { color: #0f62fe; }

.media-info { padding: 16px; }

.media-title {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 500;
  font-size: 14px;
  color: #161616;
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.media-meta {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 13px;
  color: #525252;
  margin: 0 0 8px;
  letter-spacing: 0.16px;
}

.media-added {
  font-size: 11px;
  color: #8d8d8d;
  letter-spacing: 0.16px;
}

.empty-hint {
  color: #8d8d8d;
  font-size: 13px;
  letter-spacing: 0.16px;
  margin-top: 16px;
}

/* == Right sidebar ========================================= */
.dash-right {
  width: 320px;
  min-width: 320px;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: calc(100vh - 48px);
  overflow-y: auto;
}

.right-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;
  background-color: #ffffff;
}

.right-title {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 300;
  font-size: 1.25rem;
  color: #161616;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.right-status {
  display: flex;
  justify-content: center;
  padding: 32px;
}

.right-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 48px 24px;
  color: #525252;
  font-size: 13px;
  text-align: center;
}

.invite-list {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* == Invite card =========================================== */
.invite-card {
  border: 1px solid #e0e0e0;
  padding: 16px;
  background-color: #ffffff;
}

.invite-body {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.invite-avatar {
  width: 36px;
  height: 36px;
  min-width: 36px;
  background-color: #e0e0e0;
  color: #525252;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
}

.invite-text { flex: 1; min-width: 0; }

.invite-msg {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 13px;
  color: #161616;
  line-height: 1.5;
  letter-spacing: 0.16px;
  margin: 0 0 4px;
}

.invite-time {
  font-size: 11px;
  color: #8d8d8d;
  letter-spacing: 0.16px;
}

.invite-actions {
  display: flex;
  gap: 8px;
}

.btn-accept {
  flex: 1;
  height: 36px;
  background-color: #0f62fe;
  color: #ffffff;
  border: none;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.16px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.btn-accept:hover:not(:disabled) { background-color: #0043ce; }

.btn-decline {
  flex: 1;
  height: 36px;
  background-color: transparent;
  color: #161616;
  border: 1px solid #e0e0e0;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.16px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.btn-decline:hover:not(:disabled) { background-color: #f4f4f4; }

.btn-accept:disabled,
.btn-decline:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.right-footer {
  text-align: center;
  padding: 8px 0 4px;
}

/* == Shared helpers ======================================== */
.btn-ghost {
  background: transparent;
  border: 1px solid #e0e0e0;
  color: #0f62fe;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 13px;
  padding: 8px 20px;
  cursor: pointer;
}

.btn-ghost:hover { background-color: #f4f4f4; }

.inline-link {
  color: #0f62fe;
  font-size: 13px;
  text-decoration: none;
  letter-spacing: 0.16px;
}

.inline-link:hover { text-decoration: underline; color: #0043ce; }

/* == Responsive: hide sidebars on narrow screens =========== */
@media (max-width: 1024px) { .dash-right  { display: none; } }
@media (max-width: 767px)  { .dash-sidebar { display: none; } }

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
</style>
