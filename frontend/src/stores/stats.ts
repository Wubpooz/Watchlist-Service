import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiFetch } from '@/lib/api';

export interface MediaTypeCount { type: string; count: number }
export interface TagCount { tag: string; count: number }
export interface PlatformCount { platform: string; count: number }
export interface RecentItem {
  mediaId: string;
  title: string;
  type: string;
  addedAt: string;
  collectionName: string;
  url?: string | null;
}

export interface UserStats {
  totalMedia: number;
  byType: MediaTypeCount[];
  topTags: TagCount[];
  topPlatforms: PlatformCount[];
  collectionsOwned: number;
  collectionsShared: number;
  avgMediaPerCollection: number;
  recentItems: RecentItem[];
}

export const useStatsStore = defineStore('stats', () => {
  const stats = ref<UserStats | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Getters/Computed properties derived from state
  const totalMedia = computed(() => stats.value?.totalMedia ?? 0);
  const avgMediaPerCollection = computed(() => stats.value?.avgMediaPerCollection ?? 0);
  const collectionsOwned = computed(() => stats.value?.collectionsOwned ?? 0);
  const collectionsShared = computed(() => stats.value?.collectionsShared ?? 0);
  const recentItems = computed(() => stats.value?.recentItems ?? []);
  const topTags = computed(() => stats.value?.topTags ?? []);
  const topPlatforms = computed(() => stats.value?.topPlatforms ?? []);
  const byType = computed(() => stats.value?.byType ?? []);

  // Total collections is a derived metric (owned + shared)
  const totalCollections = computed(() => (stats.value?.collectionsOwned ?? 0) + (stats.value?.collectionsShared ?? 0));

  async function fetchStats(force = false) {
    // If stats already exist, refresh in background without showing the loading spinner
    if (!stats.value || force) {
      isLoading.value = true;
    }
    error.value = null;

    try {
      stats.value = await apiFetch('/api/stats').then(r => r.json<UserStats>());
    } catch (e) {
      if (stats.value) {
        console.error('Background stats refresh failed:', e);
      } else {
        error.value = e instanceof Error ? e.message : 'Failed to load statistics';
      }
    } finally {
      isLoading.value = false;
    }
  }

  function clearStats() {
    stats.value = null;
    error.value = null;
  }

  return {
    stats,
    isLoading,
    error,
    totalMedia,
    avgMediaPerCollection,
    collectionsOwned,
    collectionsShared,
    recentItems,
    topTags,
    topPlatforms,
    byType,
    totalCollections,
    fetchStats,
    clearStats,
  };
});
