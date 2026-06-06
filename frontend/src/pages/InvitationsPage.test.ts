import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import InvitationsPage from '@/pages/InvitationsPage.vue';
import { useAuthStore } from '@/stores/auth';

const mockInvitationsData = [
  {
    id: 'inv-1',
    role: 'COLLABORATOR',
    invitedAt: '2026-06-05T10:00:00.000Z',
    accepted: false,
    collectionId: 'col-1',
    userId: 'user-1',
    collection: {
      id: 'col-1',
      name: 'Sci-Fi Picks',
      owner: {
        email: 'jane.doe@example.com'
      }
    }
  }
];

describe('InvitationsPage.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const authStore = useAuthStore();
    authStore.user = { id: 'user-1', email: 'test@example.com' };
    authStore.authToken = 'mock-token';

    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially', async () => {
    (globalThis.fetch as any).mockImplementation(() => new Promise(() => {}));

    const wrapper = mount(InvitationsPage);
    expect(wrapper.text()).toContain('Loading invitations…');
  });

  it('renders empty state when no invitations are found', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const wrapper = mount(InvitationsPage);
    await new Promise(process.nextTick);
    await wrapper.setValue(null as any);

    expect(wrapper.text()).toContain('Your inbox is empty');
  });

  it('renders invitations list', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockInvitationsData,
    });

    const wrapper = mount(InvitationsPage);
    await new Promise(process.nextTick);
    await wrapper.setValue(null as any);

    expect(wrapper.find('.invitations-list').exists()).toBe(true);
    expect(wrapper.find('.inviter-email').text()).toBe('jane.doe@example.com');
    expect(wrapper.find('.collection-link').text()).toBe('"Sci-Fi Picks"');
  });
});
