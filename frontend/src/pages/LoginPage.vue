<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const isLogin = ref(route.query.signup !== 'true');
const email = ref('');
const password = ref('');
const name = ref('');
const rememberDevice = ref(false);
const isLoading = ref(false);
const error = ref('');

const toggleMode = () => {
  isLogin.value = !isLogin.value;
  error.value = '';
};

const handleSubmit = async () => {
  error.value = '';
  isLoading.value = true;

  try {
    if (isLogin.value) {
      await authStore.login(email.value, password.value, rememberDevice.value);
    } else {
      await authStore.register(email.value, password.value, name.value);
    }

    const redirect = route.query.redirect as string || '/';
    router.push(redirect);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'An error occurred';
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="login-page">
    <div class="login-container">
      <h1 class="login-title">{{ isLogin ? 'Log in to your library' : 'Build your media database' }}</h1>

      <form @submit.prevent="handleSubmit" class="login-form">
        <div v-if="!isLogin" class="form-group">
          <label for="name">Username</label>
          <input
            id="name"
            v-model="name"
            type="text"
            placeholder="Enter username"
            required
          />
        </div>

        <div class="form-group">
          <label for="email">Email address</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="Enter email"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="Enter password"
            required
          />
        </div>

        <div v-if="isLogin" class="checkbox-row">
          <input
            id="remember"
            v-model="rememberDevice"
            type="checkbox"
          />
          <label for="remember" class="checkbox-label">Remember this device</label>
          <a href="#" class="forgot-link">Forgot password?</a>
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <button
          type="submit"
          class="primary-button"
          :disabled="isLoading"
        >
          {{ isLoading ? 'Loading...' : (isLogin ? 'Log in' : 'Create account') }}
        </button>
      </form>

      <div class="auth-toggle">
        <span>
          {{ isLogin ? "Don't have an account?" : 'Already have an account?' }}
        </span>
        <button type="button" @click="toggleMode" class="toggle-link">
          {{ isLogin ? 'Sign up' : 'Log in' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: #ffffff;
  padding: 20px;
}

.login-container {
  width: 100%;
  max-width: 360px;
  border: 1px solid #e0e0e0;
  padding: 32px;
  background-color: #ffffff;
}

.login-title {
  margin: 0 0 32px 0;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 32px;
  font-weight: 300;
  color: #161616;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  font-weight: 400;
  color: #161616;
}

.form-group input[type="text"],
.form-group input[type="email"],
.form-group input[type="password"] {
  padding: 10px 12px;
  background-color: #f4f4f4;
  border: none;
  border-bottom: 1px solid #0f62fe;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  color: #161616;
  outline: none;
  border-radius: 0;
}

.form-group input[type="text"]:focus,
.form-group input[type="email"]:focus,
.form-group input[type="password"]:focus {
  background-color: #f4f4f4;
  border-bottom-color: #0f62fe;
  box-shadow: none;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #0f62fe;
}

.checkbox-label {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  color: #161616;
  cursor: pointer;
  flex: 1;
}

.forgot-link {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  color: #0f62fe;
  text-decoration: none;
  cursor: pointer;
}

.forgot-link:hover {
  text-decoration: underline;
}

.error-message {
  padding: 12px;
  background-color: #ffd7d8;
  color: #8b0000;
  border-left: 3px solid #da1e28;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  border-radius: 0;
}

.primary-button {
  padding: 12px 16px;
  background-color: #0f62fe;
  color: #ffffff;
  border: none;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 0;
  width: 100%;
  transition: background-color 0.2s;
}

.primary-button:hover:not(:disabled) {
  background-color: #0050d8;
}

.primary-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.auth-toggle {
  margin-top: 16px;
  text-align: center;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  color: #525252;
}

.toggle-link {
  background: none;
  border: none;
  color: #0f62fe;
  cursor: pointer;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  margin-left: 4px;
  padding: 0;
}

.toggle-link:hover {
  text-decoration: underline;
}
</style>

