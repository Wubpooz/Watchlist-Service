import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import StatisticsPage from '@/pages/StatisticsPage.vue';
import { useAuthStore } from '@/stores/auth';

const mockStatsData = {
  totalMedia: 10,
  byType: [
    { type: 'FILM', count: 5 },
    { type: 'SERIES', count: 3 },
    { type: 'BOOK', count: 2 },
  ],
  topTags: [
    { tag: 'sci-fi', count: 4 },
    { tag: 'drama', count: 2 },
  ],
  topPlatforms: [
    { platform: 'Netflix', count: 6 },
    { platform: 'Prime', count: 4 },
  ],
  collectionsOwned: 2,
  collectionsShared: 1,
  avgMediaPerCollection: 5.0,
  recentItems: [
    {
      mediaId: 'media-1',
      title: 'Inception',
      type: 'FILM',
      addedAt: '2026-03-10T10:00:00.000Z',
      collectionName: 'Favorites',
    }
  ],
};

describe('StatisticsPage.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // Provide a mocked authStore
    const authStore = useAuthStore();
    authStore.user = { id: 'user-1', email: 'test@example.com' };
    authStore.authToken = 'mock-token';

    // Mock global fetch
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially', async () => {
    // Return a promise that does not resolve immediately
    (globalThis.fetch as any).mockImplementation(() => new Promise(() => {}));

    const wrapper = mount(StatisticsPage);
    expect(wrapper.find('.stats-loading').exists()).toBe(true);
    expect(wrapper.text()).toContain('Loading your statistics…');
    expect(wrapper.find('.stats-error').exists()).toBe(false);
    expect(wrapper.find('.stats-grid').exists()).toBe(false);
  });

  it('renders error state on API failure', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => null,
    });

    const wrapper = mount(StatisticsPage);
    
    // Wait for async operations (onMounted fetch) to complete
    await new Promise(process.nextTick);
    await wrapper.setValue(null as any); // trigger tick

    expect(wrapper.find('.stats-loading').exists()).toBe(false);
    expect(wrapper.find('.stats-error').exists()).toBe(true);
    expect(wrapper.find('.stats-error').text()).toContain('HTTP 500');
  });

  it('renders empty state when totalMedia is 0', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        totalMedia: 0,
        byType: [],
        topTags: [],
        topPlatforms: [],
        collectionsOwned: 0,
        collectionsShared: 0,
        avgMediaPerCollection: 0,
        recentItems: [],
      }),
    });

    const wrapper = mount(StatisticsPage);
    await new Promise(process.nextTick);
    await wrapper.setValue(null as any); // trigger tick

    expect(wrapper.find('.stats-loading').exists()).toBe(false);
    expect(wrapper.find('.stats-empty').exists()).toBe(true);
    expect(wrapper.text()).toContain('No media yet');
  });

  it('renders analytics dashboard with correct computed metrics', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockStatsData,
    });

    const wrapper = mount(StatisticsPage);
    await new Promise(process.nextTick);
    await wrapper.setValue(null as any); // trigger tick

    // Verify loading spinner is gone and grid is visible
    expect(wrapper.find('.stats-loading').exists()).toBe(false);
    expect(wrapper.find('.stats-grid').exists()).toBe(true);

    // Check big stats
    expect(wrapper.find('.donut-total').text()).toBe('10');
    expect(wrapper.find('.collection-big-number').text()).toBe('5');

    // Check legend items count
    const legendItems = wrapper.findAll('.legend-item');
    expect(legendItems).toHaveLength(3);
    expect(legendItems[0].text()).toContain('Films (50%)');
    expect(legendItems[1].text()).toContain('Series (30%)');
    expect(legendItems[2].text()).toContain('Books (20%)');

    // Check top tags display
    const barItems = wrapper.findAll('.bar-item');
    expect(barItems).toHaveLength(2);
    expect(barItems[0].find('.bar-label').text()).toBe('sci-fi');
    expect(barItems[0].find('.bar-count').text()).toBe('4');

    // Check recent items
    const recentItems = wrapper.findAll('.recent-item');
    expect(recentItems).toHaveLength(1);
    expect(recentItems[0].find('.recent-title').text()).toBe('Inception');
    expect(recentItems[0].find('.recent-type').text()).toBe('Films');
  });

  it('opens details modal when a recent item is clicked', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockStatsData,
    });

    const wrapper = mount(StatisticsPage);
    await new Promise(process.nextTick);
    await wrapper.setValue(null as any); // trigger tick

    const recentItem = wrapper.find('.recent-item');
    expect(recentItem.exists()).toBe(true);

    // Trigger click on recent item to open modal
    await recentItem.trigger('click');

    // Since AppModal is teleported to body, let's inspect document.body
    const modalOverlay = document.querySelector('.modal-overlay');
    expect(modalOverlay).not.toBeNull();
    
    // Check if title (Inception) and detail fields are in document.body
    expect(modalOverlay?.querySelector('.modal-title')?.textContent).toBe('Inception');
    expect(modalOverlay?.querySelector('.modal-detail-content')?.textContent).toContain('Favorites');
    
    // Clicking close button should close modal
    const closeBtn = modalOverlay?.querySelector('.modal-close-btn');
    expect(closeBtn).not.toBeNull();
    await (closeBtn as HTMLButtonElement).click();
    
    // Modal overlay should be removed/hidden (wait for Vue transition or v-if)
    await wrapper.setValue(null as any);
    expect(document.querySelector('.modal-overlay')).toBeNull();
  });
});
