import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from './auth';

export interface MediaTypeCount { type: string; count: number }
export interface TagCount { tag: string; count: number }
export interface PlatformCount { platform: string; count: number }
export interface RecentItem { mediaId: string; title: string; type: string; addedAt: string; collectionName: string }

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
  const authStore = useAuthStore();

  async function fetchStats(force = false) {
    // If stats already exist, load in background without showing the loading spinner
    if (!stats.value || force) {
      isLoading.value = true;
    }
    error.value = null;

    try {
      const token = authStore.authToken;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/stats`, { 
        headers, 
        credentials: 'include' 
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      stats.value = await res.json() as UserStats;
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
    fetchStats,
    clearStats,
  };
});
