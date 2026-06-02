<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

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
      <span class="logo">📚</span>
      <span class="logo-text">Watchlist</span>
    </div>

    <div class="nav-links">
      <RouterLink
        :to="{ name: 'Home' }"
        class="nav-link"
        :class="{ active: isActive('Home') }"
      >
        Dashboard
      </RouterLink>

      <RouterLink
        :to="{ name: 'Collections' }"
        class="nav-link"
        :class="{ active: isActive('Collections') }"
      >
        My Collections
      </RouterLink>

      <RouterLink
        :to="{ name: 'Statistics' }"
        class="nav-link"
        :class="{ active: isActive('Statistics') }"
      >
        Statistics
      </RouterLink>
    </div>

    <div class="nav-actions">
      <div v-if="authStore.user" class="user-display">
        {{ authStore.user.name || authStore.user.email }}
      </div>
      <button class="logout-btn" @click="$emit('logout')">
        Log out
      </button>
    </div>
  </nav>
</template>

<style scoped>
.navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background-color: #ffffff;
  border-bottom: 1px solid #e0e0e0;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 600;
}

.logo {
  font-size: 20px;
}

.logo-text {
  font-size: 18px;
  color: #161616;
}

.nav-links {
  display: flex;
  gap: 20px;
  margin-left: 40px;
  flex: 1;
}

.nav-link {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  color: #525252;
  text-decoration: none;
  padding: 8px 0;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  cursor: pointer;
}

.nav-link:hover {
  color: #161616;
}

.nav-link.active {
  color: #0f62fe;
  border-bottom-color: #0f62fe;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-display {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  color: #525252;
}

.logout-btn {
  padding: 8px 16px;
  background-color: #ffffff;
  color: #161616;
  border: 1px solid #161616;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  cursor: pointer;
  border-radius: 0;
  transition: all 0.2s;
}

.logout-btn:hover {
  background-color: #f4f4f4;
}
</style>

