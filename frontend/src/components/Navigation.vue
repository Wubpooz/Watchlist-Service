<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useInvitationsStore } from '@/stores/invitations';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const invitationsStore = useInvitationsStore();

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

// Search state
const searchQuery = ref('');
const searchResultsMedia = ref<any[]>([]);
const searchResultsCollections = ref<any[]>([]);
const isSearching = ref(false);
const isSearchFocused = ref(false);
const searchContainerRef = ref<HTMLElement | null>(null);

// Debounce timer
let searchDebounceTimer: any = null;

const performSearch = async (query: string) => {
  if (!query.trim()) {
    searchResultsMedia.value = [];
    searchResultsCollections.value = [];
    return;
  }

  isSearching.value = true;
  try {
    const token = authStore.authToken;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const [mediaRes, collectionsRes] = await Promise.all([
      fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/media?q=${encodeURIComponent(query)}&pageSize=5`, { headers, credentials: 'include' }),
      fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/collections?q=${encodeURIComponent(query)}&pageSize=5`, { headers, credentials: 'include' })
    ]);

    if (mediaRes.ok) {
      const mediaData = await mediaRes.json();
      searchResultsMedia.value = mediaData.items ?? [];
    }
    if (collectionsRes.ok) {
      const collectionsData = await collectionsRes.json();
      searchResultsCollections.value = collectionsData.data ?? [];
    }
  } catch (err) {
    console.error('Search error:', err);
  } finally {
    isSearching.value = false;
  }
};

watch(searchQuery, (newQuery) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    performSearch(newQuery);
  }, 300);
});

const closeSearchDropdown = (e: MouseEvent) => {
  if (searchContainerRef.value && !searchContainerRef.value.contains(e.target as Node)) {
    isSearchFocused.value = false;
  }
};

onMounted(() => {
  invitationsStore.fetchInvitations();
  window.addEventListener('click', closeDropdown);
  window.addEventListener('click', closeSearchDropdown);
});

onUnmounted(() => {
  window.removeEventListener('click', closeDropdown);
  window.removeEventListener('click', closeSearchDropdown);
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
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

    <!-- Search Bar & Notification Bell -->
    <div class="header-middle">
      <div class="search-container" ref="searchContainerRef">
        <div class="search-input-wrapper">
          <span class="material-symbols-outlined search-icon">search</span>
          <input 
            v-model="searchQuery"
            type="text" 
            class="search-input" 
            placeholder="Search media or collections..."
            @focus="isSearchFocused = true"
          />
        </div>
        
        <!-- Search Results Dropdown -->
        <Transition name="slide-up">
          <div v-if="isSearchFocused && searchQuery.trim()" class="search-dropdown">
            <div v-if="isSearching" class="search-status">Searching…</div>
            <div v-else-if="searchResultsMedia.length === 0 && searchResultsCollections.length === 0" class="search-status">No results found</div>
            
            <div v-else class="search-results">
              <!-- Media Results -->
              <div v-if="searchResultsMedia.length > 0" class="search-section">
                <div class="search-section-header">Media</div>
                <button
                  v-for="item in searchResultsMedia"
                  :key="item.id"
                  class="search-item"
                  @click="router.push({ name: 'MediaDetail', params: { id: item.id } }); isSearchFocused = false; searchQuery = ''"
                >
                  <span class="material-symbols-outlined item-icon">movie</span>
                  <div class="item-text">
                    <span class="item-title">{{ item.title }}</span>
                    <span class="item-subtitle">{{ item.type }}</span>
                  </div>
                </button>
              </div>

              <!-- Collections Results -->
              <div v-if="searchResultsCollections.length > 0" class="search-section">
                <div class="search-section-header">Collections</div>
                <button
                  v-for="item in searchResultsCollections"
                  :key="item.id"
                  class="search-item"
                  @click="router.push({ name: 'Collections' }); isSearchFocused = false; searchQuery = ''"
                >
                  <span class="material-symbols-outlined item-icon">folder</span>
                  <div class="item-text">
                    <span class="item-title">{{ item.name }}</span>
                    <span class="item-subtitle">{{ item.visibility }}</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Notification Bell -->
      <RouterLink 
        :to="{ name: 'Invitations' }" 
        class="nav-bell" 
        :class="{ active: isActive('Invitations') }"
        aria-label="Inbox invitations"
      >
        <span class="material-symbols-outlined">notifications</span>
        <span v-if="invitationsStore.invitationCount > 0" class="bell-badge">
          {{ invitationsStore.invitationCount }}
        </span>
      </RouterLink>
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

/* Middle Header: Search & Bell */
.header-middle {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-left: auto;
  margin-right: 16px;
}

/* Search Bar styling */
.search-container {
  position: relative;
  width: 260px;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: #525252;
  font-size: 18px;
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 32px;
  background-color: #f4f4f4;
  border: none;
  border-bottom: 1px solid #8d8d8d;
  padding: 0 10px 0 34px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 13px;
  color: #161616;
  outline: none;
  transition: background-color 0.15s, border-bottom-color 0.15s;
}

.search-input:focus {
  background-color: #e5e5e5;
  border-bottom-color: #0f62fe;
}

/* Search Dropdown */
.search-dropdown {
  position: absolute;
  top: 36px;
  right: 0;
  width: 300px;
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-height: 350px;
  overflow-y: auto;
  z-index: 1010;
}

.search-status {
  padding: 16px;
  font-size: 13px;
  color: #525252;
  text-align: center;
}

.search-results {
  display: flex;
  flex-direction: column;
}

.search-section {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid #f4f4f4;
}

.search-section:last-child {
  border-bottom: none;
}

.search-section-header {
  padding: 8px 16px 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: #8d8d8d;
  letter-spacing: 0.5px;
  background-color: #fafafa;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  width: 100%;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s;
}

.search-item:hover {
  background-color: #f4f4f4;
}

.item-icon {
  font-size: 18px;
  color: #525252;
}

.item-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.item-title {
  font-size: 13px;
  font-weight: 500;
  color: #161616;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-subtitle {
  font-size: 11px;
  color: #525252;
}

/* Notification Bell Styling */
.nav-bell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: #525252;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.nav-bell:hover {
  background-color: #f4f4f4;
  color: #161616;
}

.nav-bell.active {
  color: #0f62fe;
}

.bell-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  background-color: #da1e28;
  color: #ffffff;
  font-size: 9px;
  font-weight: 700;
  width: 15px;
  height: 15px;
  border-radius: 50% !important;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
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
