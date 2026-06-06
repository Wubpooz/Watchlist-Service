<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const authStore = useAuthStore();
defineEmits<{
  logout: [];
}>();

const isDropdownOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

const isActive = (name: string) => route.name === name;

const userInitials = computed(() => {
  const name = authStore.user?.name || authStore.user?.email || 'U';
  return name.charAt(0).toUpperCase();
});

const toggleDropdown = (e: MouseEvent) => {
  e.stopPropagation();
  isDropdownOpen.value = !isDropdownOpen.value;
};

const closeDropdown = (e: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    isDropdownOpen.value = false;
  }
};

onMounted(() => {
  window.addEventListener('click', closeDropdown);
});

onUnmounted(() => {
  window.removeEventListener('click', closeDropdown);
});
</script>

<template>
  <header class="header">
    <div class="header-left">
      <!-- Brand Logo + Service Name -->
      <RouterLink :to="{ name: 'Home' }" class="brand-link">
        <img 
          alt="Watchlist Logo" 
          class="brand-logo" 
          src="/assets/images/logo.png"
        />
        <span class="brand-text">Watchlist <span class="brand-subtext">Service</span></span>
      </RouterLink>

      <!-- Navigation Links -->
      <nav class="nav-menu">
        <RouterLink
          :to="{ name: 'Home' }"
          class="nav-item"
          :class="{ active: isActive('Home') }"
        >
          Dashboard
        </RouterLink>
        <RouterLink
          :to="{ name: 'Collections' }"
          class="nav-item"
          :class="{ active: isActive('Collections') }"
        >
          My Collections
        </RouterLink>
        <RouterLink
          :to="{ name: 'Statistics' }"
          class="nav-item"
          :class="{ active: isActive('Statistics') }"
        >
          Statistics
        </RouterLink>
      </nav>
    </div>

    <!-- User Profile Dropdown Action -->
    <div class="header-right" ref="dropdownRef">
      <button 
        type="button" 
        class="profile-trigger" 
        aria-label="Open user menu"
        :class="{ 'trigger-active': isDropdownOpen }"
        @click="toggleDropdown"
      >
        <div class="avatar-badge">
          {{ userInitials }}
        </div>
      </button>

      <!-- Dropdown Panel -->
      <Transition name="slide-up">
        <div v-if="isDropdownOpen" class="dropdown-menu" @click.stop>
          <div class="dropdown-header">
            <span class="user-name">{{ authStore.user?.name || 'User Account' }}</span>
            <span class="user-email">{{ authStore.user?.email }}</span>
          </div>
          <div class="dropdown-divider"></div>
          <button class="dropdown-item" @click="$emit('logout')">
            <span class="material-symbols-outlined dropdown-icon">logout</span>
            <span>Log out</span>
          </button>
        </div>
      </Transition>
    </div>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 48px;
  background-color: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  padding: 0 0 0 16px;
  position: relative;
  z-index: 1000;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  height: 100%;
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  height: 100%;
  padding-right: 24px;
  border-right: 1px solid #e0e0e0;
}

.brand-logo {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.brand-text {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 600;
  font-size: 14px;
  color: #161616;
  letter-spacing: 0.1px;
}

.brand-subtext {
  font-weight: 300;
  color: #525252;
}

.nav-menu {
  display: flex;
  height: 100%;
}

.nav-item {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 16px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  color: #525252;
  text-decoration: none;
  position: relative;
  transition: background-color 0.15s, color 0.15s;
  border-bottom: 2px solid transparent;
}

.nav-item:hover {
  background-color: #f4f4f4;
  color: #161616;
}

.nav-item.active {
  color: #0f62fe;
  border-bottom: 2px solid #0f62fe;
}

.header-right {
  position: relative;
  height: 100%;
}

.profile-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: none;
  background: none;
  cursor: pointer;
  transition: background-color 0.15s;
  border-left: 1px solid #e0e0e0;
}

.profile-trigger:hover,
.profile-trigger.trigger-active {
  background-color: #f4f4f4;
}

.avatar-badge {
  width: 28px;
  height: 28px;
  background-color: #0f62fe;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 600;
  font-size: 13px;
}

/* Dropdown Menu */
.dropdown-menu {
  position: absolute;
  top: 48px;
  right: 0;
  width: 220px;
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  border-top: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.dropdown-header {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-name {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 600;
  font-size: 14px;
  color: #161616;
}

.user-email {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 12px;
  color: #525252;
  word-break: break-all;
}

.dropdown-divider {
  height: 1px;
  background-color: #e0e0e0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: none;
  text-align: left;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  color: #161616;
  cursor: pointer;
  transition: background-color 0.15s;
}

.dropdown-item:hover {
  background-color: #f4f4f4;
}

.dropdown-icon {
  font-size: 18px;
  color: #525252;
}

/* Animations */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.15s cubic-bezier(0, 0, 0.2, 1), opacity 0.15s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(4px);
  opacity: 0;
}
</style>
