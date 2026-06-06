import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SettingsPage from '@/pages/SettingsPage.vue';
import { useAuthStore } from '@/stores/auth';

describe('SettingsPage.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const authStore = useAuthStore();
    authStore.user = { 
      id: 'user-1', 
      email: 'test@example.com',
      name: 'John Doe',
      username: 'johndoe',
      displayUsername: 'John D.'
    };
    authStore.authToken = 'mock-token';

    // Mock updateProfile action
    authStore.updateProfile = vi.fn().mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Jane Doe',
      username: 'janedoe',
      displayUsername: 'Jane D.'
    });

    // Mock fetchUserInfo action
    authStore.fetchUserInfo = vi.fn().mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders settings form and populates inputs with store user data', async () => {
    const wrapper = mount(SettingsPage);
    await wrapper.vm.$nextTick();

    const emailInput = wrapper.find('#email').element as HTMLInputElement;
    const nameInput = wrapper.find('#name').element as HTMLInputElement;
    const usernameInput = wrapper.find('#username').element as HTMLInputElement;
    const displayUsernameInput = wrapper.find('#displayUsername').element as HTMLInputElement;

    expect(emailInput.value).toBe('test@example.com');
    expect(nameInput.value).toBe('John Doe');
    expect(usernameInput.value).toBe('johndoe');
    expect(displayUsernameInput.value).toBe('John D.');
  });

  it('renders the email input as disabled/read-only', () => {
    const wrapper = mount(SettingsPage);
    const emailInput = wrapper.find('#email');

    expect(emailInput.attributes('disabled')).toBeDefined();
    expect(emailInput.classes()).toContain('readonly-input');
  });

  it('calls authStore.updateProfile when form is submitted', async () => {
    const wrapper = mount(SettingsPage);
    const authStore = useAuthStore();

    // Modify inputs
    await wrapper.find('#name').setValue('Jane Doe');
    await wrapper.find('#username').setValue('janedoe');
    await wrapper.find('#displayUsername').setValue('Jane D.');

    // Submit form
    await wrapper.find('form').trigger('submit.prevent');

    expect(authStore.updateProfile).toHaveBeenCalledWith({
      name: 'Jane Doe',
      username: 'janedoe',
      displayUsername: 'Jane D.'
    });
  });

  it('displays a success message when update succeeds', async () => {
    const wrapper = mount(SettingsPage);

    // Submit form
    await wrapper.find('form').trigger('submit.prevent');
    await new Promise(process.nextTick);

    const successMsg = wrapper.find('.success-message');
    expect(successMsg.exists()).toBe(true);
    expect(successMsg.text()).toContain('Profile settings updated successfully.');
  });

  it('displays an error message when update fails', async () => {
    const wrapper = mount(SettingsPage);
    const authStore = useAuthStore();
    
    // Mock failure
    authStore.updateProfile = vi.fn().mockRejectedValue(new Error('Username is already taken'));

    // Submit form
    await wrapper.find('form').trigger('submit.prevent');
    await new Promise(process.nextTick);

    const errorMsg = wrapper.find('.error-message');
    expect(errorMsg.exists()).toBe(true);
    expect(errorMsg.text()).toContain('Username is already taken');
  });
});
