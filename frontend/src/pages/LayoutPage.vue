<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import Navigation from '@/components/Navigation.vue';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const handleLogout = () => {
  authStore.logout();
  router.push({ name: 'Login' });
};
</script>

<template>
  <div class="layout">
    <Navigation @logout="handleLogout" />
    <main :class="['main-content', { 'main-content--full': route.meta.fullWidth }]">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #ffffff;
}

.main-content {
  flex: 1;
  padding: 32px 20px;
  overflow-y: auto;
}

.main-content--full {
  padding: 0;
  overflow: visible;
}
</style>

