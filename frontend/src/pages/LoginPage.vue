<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const isLogin = ref(true);
const email = ref('');
const password = ref('');
const name = ref('');
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
      await authStore.login(email.value, password.value);
    } else {
      await authStore.register(email.value, password.value, name.value);
    }

    // Redirect to the original page or home
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
  <div class="login-container">
    <div class="login-card">
      <h1>{{ isLogin ? 'Login' : 'Register' }}</h1>

      <form @submit.prevent="handleSubmit" class="form">
        <div v-if="!isLogin" class="form-group">
          <label for="name">Name</label>
          <input
            id="name"
            v-model="name"
            type="text"
            placeholder="Your name"
            required
          />
        </div>

        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="your@email.com"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="••••••••"
            required
          />
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <button
          type="submit"
          class="submit-btn"
          :disabled="isLoading"
        >
          {{ isLoading ? 'Loading...' : (isLogin ? 'Login' : 'Register') }}
        </button>
      </form>

      <div class="toggle-mode">
        <p>
          {{ isLogin ? "Don't have an account?" : 'Already have an account?' }}
          <button type="button" @click="toggleMode" class="toggle-btn">
            {{ isLogin ? 'Register' : 'Login' }}
          </button>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: #121212;
  background-image: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
}

.login-card {
  background-color: #1a1a1a;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  width: 100%;
  max-width: 400px;
  border: 1px solid #333333;
}

.login-card h1 {
  margin: 0 0 1.5rem 0;
  font-size: 2rem;
  color: #42b883;
  text-align: center;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  color: #cccccc;
  font-size: 0.9rem;
  font-weight: 500;
}

.form-group input {
  padding: 0.75rem;
  background-color: #2a2a2a;
  border: 1px solid #333333;
  border-radius: 4px;
  color: #ffffff;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.form-group input:focus {
  outline: none;
  border-color: #42b883;
  box-shadow: 0 0 0 3px rgba(66, 184, 131, 0.1);
}

.error-message {
  padding: 0.75rem;
  background-color: #ff6b6b;
  color: white;
  border-radius: 4px;
  font-size: 0.9rem;
  text-align: center;
}

.submit-btn {
  padding: 0.75rem;
  background-color: #42b883;
  color: #121212;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.submit-btn:hover:not(:disabled) {
  background-color: #35a572;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.toggle-mode {
  margin-top: 1.5rem;
  text-align: center;
}

.toggle-mode p {
  margin: 0;
  color: #cccccc;
  font-size: 0.9rem;
}

.toggle-btn {
  background: none;
  border: none;
  color: #42b883;
  cursor: pointer;
  font-weight: 600;
  text-decoration: underline;
  padding: 0;
}

.toggle-btn:hover {
  color: #35a572;
}
</style>
