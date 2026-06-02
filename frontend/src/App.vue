<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const handleLogout = () => {
  authStore.logout();
  router.push({ name: 'Login' });
};
</script>

<template>
  <RouterView />
</template>

<style scoped>
</style>
