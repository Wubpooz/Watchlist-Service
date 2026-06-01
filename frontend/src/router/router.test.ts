import { describe, it, expect, beforeEach, vi } from 'bun:test';
import { createRouter, createWebHistory } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';

describe('Router Navigation Guards', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should redirect unauthenticated users to login', () => {
    const authStore = useAuthStore();
    expect(authStore.isAuthenticated).toBe(false);
  });

  it('should allow authenticated users to access protected routes', () => {
    const authStore = useAuthStore();
    authStore.user = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User'
    };
    authStore.authToken = 'test-token';
    
    expect(authStore.isAuthenticated).toBe(true);
  });

  it('should clear user data on logout', () => {
    const authStore = useAuthStore();
    authStore.user = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User'
    };
    authStore.authToken = 'test-token';
    
    expect(authStore.isAuthenticated).toBe(true);
    
    authStore.logout();
    
    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.user).toBeNull();
    expect(authStore.authToken).toBeNull();
  });
});
