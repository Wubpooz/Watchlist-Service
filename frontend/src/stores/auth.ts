import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface User {
  id: string;
  email: string;
  name?: string;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const authToken = ref<string | null>(localStorage.getItem('authToken') || sessionStorage.getItem('authToken'));
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!authToken.value && !!user.value);

  async function login(email: string, password: string, rememberDevice: boolean = false) {
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
        const errData = await response.json().catch(() => null);
        throw new Error(extractErrorMessage(errData, 'Registration failed'));
      }

      const token = response.headers.get('set-auth-token');
      if (!token) {
        throw new Error('Authentication token missing from login response');
      }

      authToken.value = token;
      if(rememberDevice) {
        localStorage.setItem('authToken', token);
      } else {
        sessionStorage.setItem('authToken', token);
      }

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
        const errData = await response.json().catch(() => null);
        throw new Error(extractErrorMessage(errData, 'Registration failed'));
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
      throw err;
    }
  }

  async function logout() {
    authToken.value = null;
    user.value = null;
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    try {
      await import('./stats').then((m) => m.useStatsStore().clearStats());
    } catch (e) {
      console.error('Failed to clear stats store on logout:', e);
    }
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

  async function forgotPassword(email: string) {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(extractErrorMessage(errData, 'Failed to send reset email'));
      }

      return await response.json();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function resetPassword(token: string, newPassword: string) {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(extractErrorMessage(errData, 'Failed to reset password'));
      }

      return await response.json();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred';
      throw err;
    } finally {
      isLoading.value = false;
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
    forgotPassword,
    resetPassword,
  };
});


const extractErrorMessage = (errData: any, defaultMsg: string): string => {
  if (!errData) return defaultMsg;
  
  if (errData.error) {
    if (Array.isArray(errData.error)) {
      return errData.error[0].message; // Zod validation errors
    }
    if (typeof errData.error === 'object' && errData.error.message) {
      return String(errData.error.message); // Prisma/System errors like your DB crash
    }
    if (typeof errData.error === 'string') {
      return errData.error; // Custom string errors
    }
  }
  return errData.message || defaultMsg;
};