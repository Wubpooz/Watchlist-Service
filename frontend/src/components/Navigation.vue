<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

defineEmits<{
  logout: [];
}>();

const isActive = (name: string) => route.name === name;
</script>

<template>
  <nav class="navigation">
    <div class="nav-brand">
      <h1>📺 Media Collections</h1>
    </div>

    <div class="nav-links">
      <RouterLink
        :to="{ name: 'Home' }"
        class="nav-link"
        :class="{ active: isActive('Home') }"
      >
        🏠 Home
      </RouterLink>

      <RouterLink
        :to="{ name: 'Collections' }"
        class="nav-link"
        :class="{ active: isActive('Collections') }"
      >
        📚 My Collections
      </RouterLink>

      <RouterLink
        :to="{ name: 'Statistics' }"
        class="nav-link"
        :class="{ active: isActive('Statistics') }"
      >
        📊 Statistics
      </RouterLink>
    </div>

    <div class="nav-user">
      <span v-if="authStore.user" class="user-info">
        👤 {{ authStore.user.name || authStore.user.email }}
      </span>
      <button class="logout-btn" @click="$emit('logout')">
        Logout
      </button>
    </div>
  </nav>
</template>

<style scoped>
.navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background-color: #1a1a1a;
  border-bottom: 1px solid #333333;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.nav-brand h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #42b883;
}

.nav-links {
  display: flex;
  gap: 2rem;
  flex: 1;
  margin-left: 3rem;
}

.nav-link {
  color: #ffffff;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: background-color 0.3s ease;
}

.nav-link:hover {
  background-color: #333333;
}

.nav-link.active {
  background-color: #42b883;
  color: #121212;
}

.nav-user {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-info {
  color: #cccccc;
  font-size: 0.9rem;
}

.logout-btn {
  padding: 0.5rem 1rem;
  background-color: #ff6b6b;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.logout-btn:hover {
  background-color: #ee5a52;
}
</style>
