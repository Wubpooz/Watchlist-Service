import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface User {
  id: string;
  email: string;
  name?: string;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const authToken = ref<string | null>(localStorage.getItem('authToken'));
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!authToken.value && !!user.value);

  async function login(email: string, password: string) {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      // Get auth token from response headers
      const token = response.headers.get('set-auth-token');
      if (token) {
        authToken.value = token;
        localStorage.setItem('authToken', token);
      }

      // Fetch user info
      await fetchUserInfo();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function register(email: string, password: string, name: string) {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        throw new Error('Registration failed');
      }

      // Auto-login after registration
      await login(email, password);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchUserInfo() {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${authToken.value}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }

      const data = await response.json();
      user.value = data;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred';
      logout();
    }
  }

  function logout() {
    authToken.value = null;
    user.value = null;
    localStorage.removeItem('authToken');
  }

  // Check if user is still authenticated on app load
  async function checkAuth() {
    if (authToken.value) {
      try {
        await fetchUserInfo();
      } catch {
        logout();
      }
    }
  }

  return {
    user,
    authToken,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    checkAuth,
    fetchUserInfo,
  };
});
