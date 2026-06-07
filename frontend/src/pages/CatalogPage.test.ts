import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import CatalogPage from '@/pages/CatalogPage.vue';
import { useAuthStore } from '@/stores/auth';

// === Fixtures =================================================================

const FILM_ITEM = {
  id: 'media-1',
  title: 'Dune: Part Two',
  type: 'FILM',
  directorAuthor: 'Denis Villeneuve',
  releaseDate: '2024-03-01T00:00:00.000Z',
  platforms: ['Netflix'],
  tags: ['sci-fi'],
};

const SERIES_ITEM = {
  id: 'media-2',
  title: 'Severance',
  type: 'SERIES',
  directorAuthor: 'Dan Erickson',
  releaseDate: '2022-02-18T00:00:00.000Z',
  platforms: ['Apple TV'],
  tags: ['thriller'],
};

const BOOK_ITEM = {
  id: 'media-3',
  title: 'The Three-Body Problem',
  type: 'BOOK',
  directorAuthor: 'Liu Cixin',
  releaseDate: '2008-01-01T00:00:00.000Z',
  platforms: [],
  tags: ['sci-fi'],
};

function makePage(items: typeof FILM_ITEM[], total = items.length, page = 1) {
  const pages = Math.max(1, Math.ceil(total / 20));
  return {
    data: items,
    page,
    pageSize: 20,
    total,
    pages,
    links: {
      self: `/api/media?page=${page}`,
      next: page < pages ? `/api/media?page=${page + 1}` : null,
      prev: page > 1 ? `/api/media?page=${page - 1}` : null,
    },
    cursor: null,
  };
}

// === Test setup ===============================================================

function mockFetch(page: ReturnType<typeof makePage>) {
  (globalThis.fetch as any).mockResolvedValue({
    ok: true,
    json: async () => page,
  });
}

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: CatalogPage }],
});

async function mountCatalog() {
  const wrapper = mount(CatalogPage, {
    global: {
      plugins: [router],
    },
  });
  // Let the initial fetch resolve.
  await vi.runAllTimersAsync();
  return wrapper;
}

// === Tests ====================================================================

describe('CatalogPage — type filter behaviour', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setActivePinia(createPinia());

    const authStore = useAuthStore();
    authStore.user = { id: 'user-1', email: 'test@example.com' } as any;
    authStore.authToken = 'mock-token';

    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // == Initial load ===========================================================

  it('fetches /api/media on mount with no type filter', async () => {
    mockFetch(makePage([FILM_ITEM, SERIES_ITEM]));
    await mountCatalog();

    const [url] = (globalThis.fetch as any).mock.calls[0] as [string];
    expect(url).toContain('/api/media');
    expect(url).not.toContain('type=');
  });

  it('renders a card for each item returned by the API', async () => {
    mockFetch(makePage([FILM_ITEM, SERIES_ITEM]));
    const wrapper = await mountCatalog();

    expect(wrapper.text()).toContain('Dune: Part Two');
    expect(wrapper.text()).toContain('Severance');
  });

  it('shows director/author and release year on each card', async () => {
    mockFetch(makePage([FILM_ITEM]));
    const wrapper = await mountCatalog();

    expect(wrapper.text()).toContain('Denis Villeneuve');
    expect(wrapper.text()).toContain('2024');
  });

  // == Sidebar type filter ====================================================

  it('sends type=FILM when the Movies sidebar item is clicked', async () => {
    mockFetch(makePage([FILM_ITEM, SERIES_ITEM]));
    const wrapper = await mountCatalog();

    // The API is called once on mount; reset the mock before triggering the filter.
    vi.clearAllMocks();
    mockFetch(makePage([FILM_ITEM]));

    const moviesBtn = wrapper.findAll('.sidebar-item')
      .find(b => b.text().includes('Movies'));
    await moviesBtn!.trigger('click');
    await vi.runAllTimersAsync();

    const [url] = (globalThis.fetch as any).mock.calls[0] as [string];
    expect(url).toContain('type=FILM');
  });

  it('sends type=SERIES when the Shows sidebar item is clicked', async () => {
    mockFetch(makePage([FILM_ITEM, SERIES_ITEM]));
    const wrapper = await mountCatalog();

    vi.clearAllMocks();
    mockFetch(makePage([SERIES_ITEM]));

    const showsBtn = wrapper.findAll('.sidebar-item')
      .find(b => b.text().includes('Shows'));
    await showsBtn!.trigger('click');
    await vi.runAllTimersAsync();

    const [url] = (globalThis.fetch as any).mock.calls[0] as [string];
    expect(url).toContain('type=SERIES');
  });

  it('sends type=BOOK when the Books sidebar item is clicked', async () => {
    mockFetch(makePage([FILM_ITEM]));
    const wrapper = await mountCatalog();

    vi.clearAllMocks();
    mockFetch(makePage([BOOK_ITEM]));

    const booksBtn = wrapper.findAll('.sidebar-item')
      .find(b => b.text().includes('Books'));
    await booksBtn!.trigger('click');
    await vi.runAllTimersAsync();

    const [url] = (globalThis.fetch as any).mock.calls[0] as [string];
    expect(url).toContain('type=BOOK');
  });

  it('removes the type param when "All Media" is clicked after a filter was set', async () => {
    mockFetch(makePage([FILM_ITEM]));
    const wrapper = await mountCatalog();

    // Set a filter first.
    vi.clearAllMocks();
    mockFetch(makePage([FILM_ITEM]));
    const moviesBtn = wrapper.findAll('.sidebar-item')
      .find(b => b.text().includes('Movies'));
    await moviesBtn!.trigger('click');
    await vi.runAllTimersAsync();

    // Now clear it.
    vi.clearAllMocks();
    mockFetch(makePage([FILM_ITEM, SERIES_ITEM]));
    const allBtn = wrapper.findAll('.sidebar-item')
      .find(b => b.text().includes('All Media'));
    await allBtn!.trigger('click');
    await vi.runAllTimersAsync();

    const [url] = (globalThis.fetch as any).mock.calls[0] as [string];
    expect(url).not.toContain('type=');
  });

  // == Filter chips (toolbar) =================================================

  it('sends type=FILM when the Movies filter chip in the toolbar is clicked', async () => {
    mockFetch(makePage([FILM_ITEM, SERIES_ITEM]));
    const wrapper = await mountCatalog();

    vi.clearAllMocks();
    mockFetch(makePage([FILM_ITEM]));

    const chip = wrapper.findAll('.filter-chip')
      .find(c => c.text() === 'Movies');
    await chip!.trigger('click');
    await vi.runAllTimersAsync();

    const [url] = (globalThis.fetch as any).mock.calls[0] as [string];
    expect(url).toContain('type=FILM');
  });

  it('marks the active filter chip with the --active modifier class', async () => {
    mockFetch(makePage([FILM_ITEM]));
    const wrapper = await mountCatalog();

    const chip = wrapper.findAll('.filter-chip')
      .find(c => c.text() === 'Movies');
    await chip!.trigger('click');
    await vi.runAllTimersAsync();

    expect(chip!.classes()).toContain('filter-chip--active');
  });

  it('marks the "All" chip as active when no filter is set', async () => {
    mockFetch(makePage([FILM_ITEM]));
    const wrapper = await mountCatalog();

    const allChip = wrapper.findAll('.filter-chip').find(c => c.text() === 'All');
    expect(allChip!.classes()).toContain('filter-chip--active');
  });

  // == Page reset on filter change ============================================

  it('resets to page=1 when the type filter changes', async () => {
    // Simulate being on page 2 by providing enough items.
    const manyItems = Array.from({ length: 20 }, (_, i) => ({ ...FILM_ITEM, id: `m-${i}` }));
    mockFetch(makePage(manyItems, 60)); // 60 total → 3 pages
    const wrapper = await mountCatalog();

    // Navigate to page 2 via the pagination.
    vi.clearAllMocks();
    mockFetch(makePage(manyItems, 60));
    const nextBtn = wrapper.find('[aria-label="Next page"]');
    await nextBtn.trigger('click');
    await vi.runAllTimersAsync();

    // Confirm page 2 was requested.
    const [pageUrl] = (globalThis.fetch as any).mock.calls[0] as [string];
    expect(pageUrl).toContain('page=2');

    // Now change the filter — should request page=1.
    vi.clearAllMocks();
    mockFetch(makePage([SERIES_ITEM], 1));
    const showsBtn = wrapper.findAll('.sidebar-item')
      .find(b => b.text().includes('Shows'));
    await showsBtn!.trigger('click');
    await vi.runAllTimersAsync();

    const [filterUrl] = (globalThis.fetch as any).mock.calls[0] as [string];
    expect(filterUrl).toContain('page=1');
  });

  // == Empty & error states ===================================================

  it('shows the empty state message when the API returns no items', async () => {
    mockFetch(makePage([]));
    const wrapper = await mountCatalog();

    expect(wrapper.text()).toContain('No media found');
  });

  it('shows an error banner when the API returns a non-ok response', async () => {
    (globalThis.fetch as any).mockResolvedValue({ ok: false, status: 500 });
    const wrapper = await mountCatalog();

    expect(wrapper.find('.error-banner').exists()).toBe(true);
  });
});

// === Tests: search debounce integration =======================================

describe('CatalogPage — search bar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setActivePinia(createPinia());
    const authStore = useAuthStore();
    authStore.user = { id: 'user-1', email: 'test@example.com' } as any;
    authStore.authToken = 'mock-token';
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does NOT send a new request immediately when the user starts typing', async () => {
    mockFetch(makePage([FILM_ITEM]));
    const wrapper = await mountCatalog();

    vi.clearAllMocks();
    mockFetch(makePage([FILM_ITEM]));

    const input = wrapper.find('.catalog-search-input');
    await input.setValue('dune');
    // No timers advanced — debounce has not fired.

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('sends the search query after 300 ms of silence', async () => {
    mockFetch(makePage([FILM_ITEM]));
    const wrapper = await mountCatalog();

    vi.clearAllMocks();
    mockFetch(makePage([FILM_ITEM]));

    const input = wrapper.find('.catalog-search-input');
    await input.setValue('dune');
    vi.advanceTimersByTime(300);
    await vi.runAllTimersAsync();

    const [url] = (globalThis.fetch as any).mock.calls[0] as [string];
    expect(url).toContain('q=dune');
  });

  it('sends only the final query when typing quickly', async () => {
    mockFetch(makePage([FILM_ITEM]));
    const wrapper = await mountCatalog();

    vi.clearAllMocks();
    mockFetch(makePage([FILM_ITEM]));

    const input = wrapper.find('.catalog-search-input');
    await input.setValue('d');
    vi.advanceTimersByTime(100);
    await input.setValue('du');
    vi.advanceTimersByTime(100);
    await input.setValue('dune');
    vi.advanceTimersByTime(300);
    await vi.runAllTimersAsync();

    // Only one fetch should have fired (for 'dune', the last value).
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url] = (globalThis.fetch as any).mock.calls[0] as [string];
    expect(url).toContain('q=dune');
    expect(url).not.toContain('q=d&');
  });

  it('shows the clear button when there is text in the search field', async () => {
    mockFetch(makePage([FILM_ITEM]));
    const wrapper = await mountCatalog();

    expect(wrapper.find('.search-clear-btn').exists()).toBe(false);

    const input = wrapper.find('.catalog-search-input');
    await input.setValue('dune');

    expect(wrapper.find('.search-clear-btn').exists()).toBe(true);
  });

  it('clears the search immediately and fires a new request when × is clicked', async () => {
    mockFetch(makePage([FILM_ITEM]));
    const wrapper = await mountCatalog();

    const input = wrapper.find('.catalog-search-input');
    await input.setValue('dune');
    vi.advanceTimersByTime(300);
    await vi.runAllTimersAsync();

    vi.clearAllMocks();
    mockFetch(makePage([FILM_ITEM, SERIES_ITEM]));

    await wrapper.find('.search-clear-btn').trigger('click');
    // Empty string fires immediately — no timer needed.
    await vi.runAllTimersAsync();

    expect(wrapper.find('.search-clear-btn').exists()).toBe(false);
    const [url] = (globalThis.fetch as any).mock.calls[0] as [string];
    expect(url).not.toContain('q=');
  });
});
