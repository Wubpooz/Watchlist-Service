import { describe, it, expect, beforeEach } from 'bun:test';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import router from '@/router';

// Mock localStorage for tests
class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value.toString();
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

(globalThis as any).localStorage = new LocalStorageMock();
(globalThis as any).sessionStorage = new LocalStorageMock();

describe('Authentication Validation', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Authentication State', () => {
    it('should be unauthenticated when no token exists', () => {
      const authStore = useAuthStore();
      expect(authStore.isAuthenticated).toBe(false);
      expect(authStore.user).toBeNull();
      expect(authStore.authToken).toBeNull();
    });

    it('should be authenticated when user and token exist', () => {
      const authStore = useAuthStore();
      authStore.user = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User'
      };
      authStore.authToken = 'test-token';
      
      expect(authStore.isAuthenticated).toBe(true);
    });

    it('should not be authenticated with only token but no user', () => {
      const authStore = useAuthStore();
      authStore.authToken = 'test-token';
      
      expect(authStore.isAuthenticated).toBe(false);
    });

    it('should not be authenticated with only user but no token', () => {
      const authStore = useAuthStore();
      authStore.user = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User'
      };
      
      expect(authStore.isAuthenticated).toBe(false);
    });
  });

  describe('Logout', () => {
    it('should clear user data on logout', () => {
      const authStore = useAuthStore();
      authStore.user = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User'
      };
      authStore.authToken = 'test-token';
      localStorage.setItem('authToken', 'test-token');
      
      expect(authStore.isAuthenticated).toBe(true);
      
      authStore.logout();
      
      expect(authStore.isAuthenticated).toBe(false);
      expect(authStore.user).toBeNull();
      expect(authStore.authToken).toBeNull();
      expect(localStorage.getItem('authToken')).toBeNull();
    });
  });

  describe('Token Persistence', () => {
    it('should store token in localStorage', () => {
      const authStore = useAuthStore();
      const token = 'test-token-123';
      authStore.authToken = token;
      localStorage.setItem('authToken', token);
      
      expect(localStorage.getItem('authToken')).toBe(token);
    });

    it('should retrieve token from localStorage on initialization', () => {
      const token = 'persisted-token';
      localStorage.setItem('authToken', token);
      
      const authStore = useAuthStore();
      
      expect(authStore.authToken).toBe(token);
    });

    it('should remove token from localStorage on logout', () => {
      const authStore = useAuthStore();
      localStorage.setItem('authToken', 'test-token');
      
      authStore.logout();
      
      expect(localStorage.getItem('authToken')).toBeNull();
    });
  });
});

describe('Router Navigation Guards', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    sessionStorage.clear();
  });
  
  describe('Protected Route Access', () => {
    it('should block unauthenticated users from accessing Collections route', () => {
      const authStore = useAuthStore();
      router.push('/collections');
      
      // Collections route requires auth
      expect(authStore.isAuthenticated).toBe(false);
      expect(router.currentRoute.value.path).toBe('/login');
    });

    it('should block unauthenticated users from accessing Statistics route', () => {
      const authStore = useAuthStore();
      router.push('/statistics');
      
      // Statistics route requires auth
      expect(authStore.isAuthenticated).toBe(false);
      expect(router.currentRoute.value.path).toBe('/login');
    });

    it('should block unauthenticated users from accessing Home route', () => {
      const authStore = useAuthStore();
      router.push('/home');
      
      // Home route requires auth
      expect(authStore.isAuthenticated).toBe(false);
      expect(router.currentRoute.value.path).toBe('/login');
    });

    it('should block unauthenticated users from accessing MediaDetail route', () => {
      const authStore = useAuthStore();
      router.push('/media/1');
      
      // Media detail route requires auth
      expect(authStore.isAuthenticated).toBe(false);
      expect(router.currentRoute.value.path).toBe('/login');
    });

    it('should allow authenticated users to access protected routes', () => {
      const authStore = useAuthStore();
      authStore.user = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User'
      };
      authStore.authToken = 'test-token';
      router.push('/collections');
      
      expect(authStore.isAuthenticated).toBe(true);
      expect(router.currentRoute.value.path).toBe('/collections');
    });
  });

  describe('Login Page Access', () => {
    it('should allow unauthenticated users to access Login route', () => {
      const authStore = useAuthStore();
      router.push('/login');
      
      // Login route does not require auth
      expect(authStore.isAuthenticated).toBe(false);
      expect(router.currentRoute.value.path).toBe('/login');
    });

    it('should redirect authenticated users away from Login route', () => {
      const authStore = useAuthStore();
      authStore.user = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User'
      };
      authStore.authToken = 'test-token';
      router.push('/login');

      // Authenticated users should be redirected from login
      expect(authStore.isAuthenticated).toBe(true);
      expect(router.currentRoute.value.path).toBe('/home');
    });
  });

  describe('Authentication Flow', () => {
    it('should maintain authentication after user and token are set', () => {
      const authStore = useAuthStore();
      
      // Set user
      authStore.user = {
        id: '1',
        email: 'test@example.com'
      };
      
      // Verify not authenticated yet
      expect(authStore.isAuthenticated).toBe(false);
      
      // Set token
      authStore.authToken = 'test-token';
      
      // Now should be authenticated
      expect(authStore.isAuthenticated).toBe(true);
    });

    it('should become unauthenticated when user is cleared', () => {
      const authStore = useAuthStore();
      authStore.user = {
        id: '1',
        email: 'test@example.com'
      };
      authStore.authToken = 'test-token';
      
      expect(authStore.isAuthenticated).toBe(true);
      
      authStore.user = null;
      
      expect(authStore.isAuthenticated).toBe(false);
    });

    it('should become unauthenticated when token is cleared', () => {
      const authStore = useAuthStore();
      authStore.user = {
        id: '1',
        email: 'test@example.com'
      };
      authStore.authToken = 'test-token';
      
      expect(authStore.isAuthenticated).toBe(true);
      
      authStore.authToken = null;
      
      expect(authStore.isAuthenticated).toBe(false);
    });

    it('should redirect to login and clear authentication after logout', () => {
      const authStore = useAuthStore();
      authStore.user = {
        id: '1',
        email: 'test@example.com'
      };
      authStore.authToken = 'test-token';
      router.push('/home');

      // Simulate logout
      authStore.user = null;
      authStore.authToken = null;

      expect(authStore.isAuthenticated).toBe(false);
      expect(router.currentRoute.value.path).toBe('/login');
    });
  });
});
