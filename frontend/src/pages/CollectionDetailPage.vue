<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppModal from '@/components/AppModal.vue';
import { useAuthStore } from '@/stores/auth';
import { useCollectionsStore } from '@/stores/collections';
import type { CollectionDetail } from '@/stores/collections';

type MediaItem = {
  id: string;
  title: string;
  type: string;
  description?: string | null;
  rating?: number | null;
};

type MediaListResponse = {
  data: MediaItem[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  cursor?: string | null;
};

type User = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

type Member = {
  id: string;
  role: string;
  accepted: boolean;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
};

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const collectionsStore = useCollectionsStore();

const collection = computed<CollectionDetail | null>(() => collectionsStore.selectedCollection);
const mediaItems = computed(() => collectionsStore.selectedCollectionMedia);
const owner = ref<User | null>(null);
const members = ref<Member[]>([]);
const loadingMembers = ref(false);

const actionMessage = ref<string | null>(null);
const actionError = ref<string | null>(null);

const toastMessage = ref<string | null>(null);
const toastType = ref<'success' | 'error'>('success');
const toastTimeoutId = ref<any>(null);

function showToast(message: string, type: 'success' | 'error' = 'success'): void {
  toastMessage.value = message;
  toastType.value = type;
  if (toastTimeoutId.value) {
    clearTimeout(toastTimeoutId.value);
  }
  toastTimeoutId.value = setTimeout(() => {
    toastMessage.value = null;
  }, 4000);
}
const editMode = ref(false);
const descriptionDraft = ref('');
const savingDescription = ref(false);
const deletingCollection = ref(false);
const removingMediaIds = ref<string[]>([]);
const addMediaError = ref<string | null>(null);
const addMediaModalOpen = ref(false);
const addableMedia = ref<MediaItem[]>([]);
const mediaSearchQuery = ref('');
const filteredAddableMedia = computed(() => {
  const query = mediaSearchQuery.value.trim().toLowerCase();
  if (!query) return addableMedia.value;
  return addableMedia.value.filter((item) =>
    item.title.toLowerCase().includes(query) ||
    (item.description && item.description.toLowerCase().includes(query)) ||
    item.type.toLowerCase().includes(query)
  );
});
const selectedMediaIds = ref<string[]>([]);
const loadingAddableMedia = ref(false);
const addingMedia = ref(false);

const inviteModalOpen = ref(false);
const inviteEmail = ref('');
const inviteRole = ref<'READER' | 'COLLABORATOR'>('COLLABORATOR');
const invitingMember = ref(false);
const inviteError = ref<string | null>(null);
const inviteSuccess = ref<string | null>(null);

const isDraggable = ref(false);
const draggedIndex = ref<number | null>(null);
const updatingVisibility = ref(false);

const collectionId = computed(() => String(route.params.id ?? ''));
const visibilityLabel = computed(() => (collection.value?.visibility === 'PUBLIC' ? 'Public' : 'Private'));
const selectedMediaCount = computed(() => selectedMediaIds.value.length);
const loading = computed(() => collectionsStore.isLoading);
const loadError = computed(() => collectionsStore.error);
const displayError = computed(() => actionError.value || loadError.value);

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authStore.authToken) {
    headers.Authorization = `Bearer ${authStore.authToken}`;
  }

  return headers;
}

function openAddMediaModal(): void {
  addMediaError.value = null;
  addMediaModalOpen.value = true;
  selectedMediaIds.value = [];
  mediaSearchQuery.value = '';
  void loadAddableMedia();
}

function closeAddMediaModal(): void {
  if (addingMedia.value) {
    return;
  }

  addMediaModalOpen.value = false;
  addMediaError.value = null;
  selectedMediaIds.value = [];
  mediaSearchQuery.value = '';
}

async function loadAddableMedia(): Promise<void> {
  if (!collection.value) {
    return;
  }

  const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';
  loadingAddableMedia.value = true;
  addMediaError.value = null;

  try {
    const pageSize = 100;
    let page = 1;
    let totalPages = 1;
    const allMedia: MediaItem[] = [];

    while (page <= totalPages) {
      const response = await fetch(`${apiBaseUrl}/api/media?page=${page}&pageSize=${pageSize}&sort=title&order=asc`, {
        headers: buildHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to load media catalog (${response.status})`);
      }

      const payload = await response.json() as MediaListResponse;
      allMedia.push(...payload.data);
      totalPages = payload.pages || 1;
      page += 1;
    }

    const existingMediaIds = new Set(mediaItems.value.map((item) => item.media.id));
    addableMedia.value = allMedia.filter((media) => !existingMediaIds.has(media.id));
  } catch (err) {
    addMediaError.value = err instanceof Error ? err.message : 'Failed to load media catalog';
  } finally {
    loadingAddableMedia.value = false;
  }
}

async function addSelectedMedia(): Promise<void> {
  if (!collection.value) {
    return;
  }

  if (selectedMediaIds.value.length === 0) {
    addMediaError.value = 'Select at least one media item.';
    return;
  }

  const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';
  const nextPosition = mediaItems.value.reduce((maxPosition, item) => Math.max(maxPosition, item.position), -1) + 1;

  addingMedia.value = true;
  addMediaError.value = null;

  try {
    const responses = await Promise.all(
      selectedMediaIds.value.map((mediaId, index) => {
        return fetch(`${apiBaseUrl}/api/collections/${collection.value!.id}/media`, {
          method: 'POST',
          headers: buildHeaders(),
          credentials: 'include',
          body: JSON.stringify({
            mediaId,
            position: nextPosition + index,
          }),
        });
      })
    );

    for (const response of responses) {
      if (!response.ok) {
        throw new Error('Failed to add selected media');
      }
    }

    addMediaModalOpen.value = false;
    selectedMediaIds.value = [];
    showToast('Selected media added to collection.');
    await loadCollectionDetail();
  } catch (err) {
    addMediaError.value = err instanceof Error ? err.message : 'Failed to add selected media';
  } finally {
    addingMedia.value = false;
  }
}


function formatDateLong(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatDateTimeLong(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }
  return date.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function formatMediaType(type: string): string {
  return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase());
}

function formatRole(role: string): string {
  if (role === 'OWNER') return 'Owner';
  if (role === 'COLLABORATOR') return 'Collaborator';
  if (role === 'READER') return 'Reader';
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

function isRemovingMedia(collectionMediaId: string): boolean {
  return removingMediaIds.value.includes(collectionMediaId);
}

function formatDateTable(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function onDragStart(event: DragEvent, index: number): void {
  draggedIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', index.toString());
  }
}

async function onDrop(event: DragEvent, targetIndex: number): Promise<void> {
  const sourceIndex = draggedIndex.value !== null ? draggedIndex.value : Number(event.dataTransfer?.getData('text/plain'));
  draggedIndex.value = null;
  if (sourceIndex === null || Number.isNaN(sourceIndex) || sourceIndex === targetIndex) {
    return;
  }

  const items = [...collectionsStore.selectedCollectionMedia];
  const [draggedItem] = items.splice(sourceIndex, 1);
  items.splice(targetIndex, 0, draggedItem);

  const updatedItems = items.map((item, idx) => ({
    ...item,
    position: idx,
  }));

  collectionsStore.selectedCollectionMedia = updatedItems;

  const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';
  try {
    await Promise.all(
      updatedItems.map((item) => {
        return fetch(`${apiBaseUrl}/api/collections/${collectionId.value}/media/${item.id}`, {
          method: 'PATCH',
          headers: buildHeaders(),
          credentials: 'include',
          body: JSON.stringify({ position: item.position }),
        });
      })
    );
  } catch (err) {
    console.error('Failed to update media positions on backend:', err);
    void loadCollectionDetail(true);
  }
}

async function onVisibilityChange(event: Event): Promise<void> {
  const target = event.target as HTMLSelectElement;
  const nextVisibility = target.value as 'PUBLIC' | 'PRIVATE';
  if (!collection.value || updatingVisibility.value || nextVisibility === collection.value.visibility) {
    return;
  }

  const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';
  updatingVisibility.value = true;
  actionError.value = null;
  actionMessage.value = null;

  try {
    const res = await fetch(`${apiBaseUrl}/api/collections/${collection.value.id}`, {
      method: 'PATCH',
      headers: buildHeaders(),
      credentials: 'include',
      body: JSON.stringify({ visibility: nextVisibility }),
    });

    if (!res.ok) {
      throw new Error('Failed to update collection visibility');
    }

    const updated = await res.json() as CollectionDetail;
    collectionsStore.selectedCollection = {
      ...collection.value,
      ...updated,
    };
    showToast(`Collection visibility updated to ${nextVisibility.toLowerCase()}.`);
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Failed to update collection visibility';
    target.value = collection.value.visibility;
  } finally {
    updatingVisibility.value = false;
  }
}

async function loadCollectionDetail(force = false): Promise<void> {
  if (!collectionId.value) {
    actionError.value = 'Collection id is missing from the route.';
    return;
  }

  actionError.value = null;
  actionMessage.value = null;

  if (!collection.value || collection.value.id !== collectionId.value || force) {
    owner.value = null;
    descriptionDraft.value = '';
  }

  try {
    await collectionsStore.fetchCollectionDetail(collectionId.value, force);
    if (!collection.value) {
      throw new Error('Collection details were not returned by the store');
    }

    descriptionDraft.value = collection.value.description ?? '';
    const ownerId = collection.value.ownerId;
    const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';

    const [ownerRes, membersRes] = await Promise.all([
      fetch(`${apiBaseUrl}/api/users/${ownerId}`, {
        method: 'GET',
        headers: buildHeaders(),
        credentials: 'include',
      }),
      fetch(`${apiBaseUrl}/api/collections/${collectionId.value}/members`, {
        method: 'GET',
        headers: buildHeaders(),
        credentials: 'include',
      })
    ]);

    if (!ownerRes.ok) {
      throw new Error(`Failed to load owner information (${ownerRes.status})`);
    }

    const ownerData = await ownerRes.json();
    owner.value = ownerData.user || ownerData;

    if (membersRes.ok) {
      members.value = await membersRes.json();
    }
  } catch (err) {
    actionError.value = collectionsStore.error || (err instanceof Error ? err.message : 'Failed to load collection details');
  }
}

function startEditDescription(): void {
  if (!collection.value) {
    return;
  }

  descriptionDraft.value = collection.value.description ?? '';
  actionError.value = null;
  actionMessage.value = null;
  editMode.value = true;
}

function cancelEditDescription(): void {
  if (!collection.value) {
    return;
  }

  descriptionDraft.value = collection.value.description ?? '';
  editMode.value = false;
}

async function saveDescription(): Promise<void> {
  if (!collection.value) {
    return;
  }

  const nextDescription = descriptionDraft.value.trim();
  const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';
  savingDescription.value = true;
  actionError.value = null;
  actionMessage.value = null;

  try {
    const res = await fetch(`${apiBaseUrl}/api/collections/${collection.value.id}`, {
      method: 'PATCH',
      headers: buildHeaders(),
      credentials: 'include',
      body: JSON.stringify({ description: nextDescription }),
    });

    if (!res.ok) {
      throw new Error('Failed to update collection description');
    }

    const updated = await res.json() as CollectionDetail;
    collectionsStore.selectedCollection = {
      ...collection.value,
      ...updated,
    };
    descriptionDraft.value = updated.description ?? '';
    editMode.value = false;
    showToast('Collection description updated.');
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Failed to update collection description';
  } finally {
    savingDescription.value = false;
  }
}

async function removeMedia(collectionMediaId: string, mediaTitle: string): Promise<void> {
  if (!collection.value) {
    return;
  }

  const confirmed = globalThis.confirm(`Remove ${mediaTitle} from this collection?`);
  if (!confirmed) {
    return;
  }

  const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';
  actionError.value = null;
  actionMessage.value = null;
  removingMediaIds.value = [...removingMediaIds.value, collectionMediaId];

  try {
    const res = await fetch(`${apiBaseUrl}/api/collections/${collection.value.id}/media/${collectionMediaId}`, {
      method: 'DELETE',
      headers: buildHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error('Failed to remove media from collection');
    }

    collectionsStore.selectedCollectionMedia = collectionsStore.selectedCollectionMedia.filter((item) => item.id !== collectionMediaId);
    showToast(`${mediaTitle} removed from collection.`);
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Failed to remove media from collection';
  } finally {
    removingMediaIds.value = removingMediaIds.value.filter((id) => id !== collectionMediaId);
  }
}

async function deleteCollection(): Promise<void> {
  if (!collection.value) {
    return;
  }

  const confirmed = globalThis.confirm(`Delete the collection "${collection.value.name}"? This action cannot be undone.`);
  if (!confirmed) {
    return;
  }

  const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';
  deletingCollection.value = true;
  actionError.value = null;
  actionMessage.value = null;

  try {
    const res = await fetch(`${apiBaseUrl}/api/collections/${collection.value.id}`, {
      method: 'DELETE',
      headers: buildHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error('Failed to delete collection');
    }

    collectionsStore.removeCollection(collection.value.id);
    await router.push('/collections');
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Failed to delete collection';
  } finally {
    deletingCollection.value = false;
  }
}

function openInviteModal(): void {
  inviteModalOpen.value = true;
  inviteEmail.value = '';
  inviteRole.value = 'COLLABORATOR';
  inviteError.value = null;
  inviteSuccess.value = null;
}

function closeInviteModal(): void {
  if (invitingMember.value) return;
  inviteModalOpen.value = false;
}

async function sendInvitation(): Promise<void> {
  const email = inviteEmail.value.trim();
  if (!email) {
    inviteError.value = 'Please enter an email address.';
    return;
  }

  invitingMember.value = true;
  inviteError.value = null;
  inviteSuccess.value = null;

  const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';

  try {
    const userRes = await fetch(`${apiBaseUrl}/api/users/email/${encodeURIComponent(email)}`, {
      headers: buildHeaders(),
      credentials: 'include',
    });

    if (!userRes.ok) {
      if (userRes.status === 404) {
        throw new Error(`User with email "${email}" not found.`);
      }
      throw new Error('Failed to verify user email.');
    }

    const userData = await userRes.json();
    const userId = userData.user.id;

    const isAlreadyMember = members.value.some((m) => m.userId === userId) || collection.value?.ownerId === userId;
    if (isAlreadyMember) {
      throw new Error('User is already a member or owner of this collection.');
    }

    const inviteRes = await fetch(`${apiBaseUrl}/api/collections/${collection.value!.id}/members`, {
      method: 'POST',
      headers: buildHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        userId,
        role: inviteRole.value,
      }),
    });

    if (!inviteRes.ok) {
      const errorBody = await inviteRes.json().catch(() => null);
      throw new Error(errorBody?.error || errorBody?.message || 'Failed to send invitation.');
    }

    inviteSuccess.value = `Invitation sent to ${email} successfully.`;
    inviteEmail.value = '';
    
    const membersRes = await fetch(`${apiBaseUrl}/api/collections/${collection.value!.id}/members`, {
      method: 'GET',
      headers: buildHeaders(),
      credentials: 'include',
    });
    if (membersRes.ok) {
      members.value = await membersRes.json();
    }
  } catch (err) {
    inviteError.value = err instanceof Error ? err.message : 'An error occurred while inviting user.';
  } finally {
    invitingMember.value = false;
  }
}

async function removeMember(memberId: string, memberEmail: string): Promise<void> {
  if (!collection.value) return;
  const confirmed = globalThis.confirm(`Remove ${memberEmail} from this collection?`);
  if (!confirmed) return;

  const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';
  try {
    const res = await fetch(`${apiBaseUrl}/api/collections/${collection.value.id}/members/${memberId}`, {
      method: 'DELETE',
      headers: buildHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error('Failed to remove member.');
    }

    const membersRes = await fetch(`${apiBaseUrl}/api/collections/${collection.value.id}/members`, {
      method: 'GET',
      headers: buildHeaders(),
      credentials: 'include',
    });
    if (membersRes.ok) {
      members.value = await membersRes.json();
    }
    showToast(`Removed member ${memberEmail}.`);
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Failed to remove member.';
  }
}

function getInitials(name: string | undefined): string {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

function getAvatarClass(index: number): string {
  const classes = [
    'bg-secondary-container text-on-secondary-fixed-variant',
    'bg-tertiary-fixed-dim text-on-tertiary-fixed-variant',
    'bg-primary-fixed-dim text-on-primary-fixed-variant',
  ];
  return classes[index % classes.length];
}

watch(collectionId, () => {
  void loadCollectionDetail(true);
}, { immediate: true });
</script>

<template>
  <div class="collection-detail-page">
    <div v-if="loading" class="p-4 bg-surface-container border border-outline-variant text-on-surface">
      Loading collection details...
    </div>

    <div v-else-if="displayError && !collection" class="p-4 bg-error-container border-l-4 border-error text-on-error-container">
      {{ displayError }}
    </div>

    <div v-else-if="collection" class="bg-white">
      <div class="flex items-center text-xs text-on-surface-variant mb-4 font-body tracking-wider">
        <RouterLink to="/collections" class="hover:text-primary-container hover:underline">Collections</RouterLink>
        <span class="mx-2">/</span>
        <span class="text-on-surface">{{ collection.name }}</span>
      </div>

      <header class="mb-10">
        <div class="flex items-center gap-4 mb-3">
          <h1 class="font-headline font-light text-[42px] leading-none tracking-tight text-on-surface">
            {{ collection.name }}
          </h1>
          <span class="bg-surface-container-low border border-outline-variant text-on-surface-variant text-[11px] uppercase tracking-widest px-2 py-1 flex items-center mt-2">
            {{ visibilityLabel }}
          </span>
        </div>

        <div class="flex items-center gap-6 mt-6">
          <button
            v-if="collection.ownerId === authStore.user?.id"
            class="text-sm font-normal text-primary-container hover:underline flex items-center gap-1.5 bg-transparent border-none p-0 cursor-pointer"
            type="button"
            @click="openInviteModal"
          >
            <span class="material-symbols-outlined text-[16px]">person_add</span>
            Invite collaborator
          </button>

          <button
            v-if="collection.ownerId === authStore.user?.id"
            class="text-sm font-normal text-error hover:underline flex items-center gap-1.5 bg-transparent border-none p-0 cursor-pointer"
            type="button"
            :disabled="deletingCollection"
            @click="deleteCollection"
          >
            <span class="material-symbols-outlined text-[16px]">delete</span>
            {{ deletingCollection ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </header>

      <div class="mb-8 max-w-3xl">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Description</h2>
        
        <div class="flex items-start gap-4">
          <div class="flex-1">
            <div v-if="editMode" class="bg-surface-container-low border border-outline-variant p-4">
              <textarea
                v-model="descriptionDraft"
                rows="3"
                maxlength="1000"
                class="w-full bg-white border border-outline p-2 text-sm text-on-surface focus:outline-2 focus:outline-primary"
                placeholder="Describe this collection"
              ></textarea>
              <div class="flex justify-end gap-2 mt-3">
                <button
                  type="button"
                  class="bg-white border border-outline px-3 py-1.5 text-xs font-medium text-on-surface hover:bg-surface-container-low transition-colors"
                  :disabled="savingDescription"
                  @click="cancelEditDescription"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="bg-primary-container text-white px-3 py-1.5 text-xs font-medium hover:bg-[#054ada] transition-colors"
                  :disabled="savingDescription"
                  @click="saveDescription"
                >
                  {{ savingDescription ? 'Saving...' : 'Save Description' }}
                </button>
              </div>
            </div>
            <p v-else-if="collection.description" class="text-sm text-on-surface-variant leading-relaxed">
              {{ collection.description }}
            </p>
            <p v-else class="text-sm text-on-surface-variant italic">
              No description yet.
            </p>
          </div>

          <button
            v-if="!editMode && collection.ownerId === authStore.user?.id"
            class="text-[#0f62fe] hover:text-[#0353e9] bg-transparent border-none p-0 cursor-pointer flex items-center justify-center transition-colors mt-1"
            type="button"
            title="Edit Description"
            @click="startEditDescription"
          >
            <span class="material-symbols-outlined text-[16px]">edit</span>
          </button>
        </div>
      </div>

      <p v-if="actionError" class="p-3 text-xs bg-error-container text-on-error-container border-l-4 border-error mb-4">
        {{ actionError }}
      </p>

      <div class="grid grid-cols-12 gap-0 border-t border-outline-variant pt-8">
        <div class="col-span-8 pr-12">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-base font-semibold text-on-surface">Collection Items ({{ mediaItems.length }})</h3>
            <button
              class="bg-primary-container hover:bg-[#054ada] text-white px-4 py-2 text-sm transition-colors border border-transparent focus:border-on-surface focus:outline-none cursor-pointer"
              type="button"
              @click="openAddMediaModal"
            >
              + Add Media
            </button>
          </div>

          <div class="flex items-start">
            <!-- Line Numbers Column on the Left -->
            <div class="flex flex-col text-on-surface-variant font-mono text-xs select-none pr-3 text-right pt-10">
              <div
                v-for="(item, idx) in mediaItems"
                :key="'line-' + item.id"
                class="h-13 flex items-center justify-end"
              >
                {{ idx + 1 }}
              </div>
            </div>

            <!-- Table Container -->
            <div class="flex-1 border border-outline-variant bg-surface-container-lowest overflow-hidden">
              <div class="grid grid-cols-[40px_minmax(0,1fr)_120px_120px_140px_80px] bg-surface-container-low border-b border-outline-variant text-xs font-semibold text-on-surface-variant uppercase tracking-wider h-10 items-center">
                <div class="p-3"></div>
                <div class="p-3">Title</div>
                <div class="p-3">Type</div>
                <div class="p-3">Rating</div>
                <div class="p-3">Date Added</div>
                <div class="p-3 text-center">Actions</div>
              </div>

              <div v-if="mediaItems.length === 0" class="p-8 text-center text-sm text-on-surface-variant italic">
                No media in this collection yet.
              </div>

              <div
                v-for="(item, index) in mediaItems"
                :key="item.id"
                class="grid grid-cols-[40px_minmax(0,1fr)_120px_120px_140px_80px] border-b last:border-b-0 border-outline-variant hover:bg-surface-container-low transition-colors group items-center text-sm text-on-surface h-13"
                :draggable="isDraggable"
                @dragstart="onDragStart($event, index)"
                @dragover.prevent
                @drop="onDrop($event, index)"
              >
                <div
                  class="p-3 text-center text-outline group-hover:text-on-surface transition-colors cursor-grab"
                  @mousedown="isDraggable = true"
                  @mouseup="isDraggable = false"
                  @mouseleave="isDraggable = false"
                >
                  <span class="material-symbols-outlined text-[18px]">drag_indicator</span>
                </div>
                <div class="p-3 font-semibold truncate">
                  <RouterLink :to="`/media/${item.media.id}`" class="hover:underline hover:text-primary-container text-on-surface block truncate">
                    {{ item.media.title }}
                  </RouterLink>
                </div>
                <div class="p-3 text-on-surface-variant truncate">
                  {{ formatMediaType(item.media.type) }}
                </div>
                <div class="p-3 text-on-surface-variant flex items-center gap-0.5">
                  <template v-if="item.media.rating">
                    <span
                      v-for="star in 5"
                      :key="star"
                      class="material-symbols-outlined text-sm"
                      :class="star <= item.media.rating ? 'star-filled' : 'star-empty'"
                      style="font-size: 16px;"
                    >
                      star
                    </span>
                  </template>
                  <span v-else class="text-outline text-xs">—</span>
                </div>
                <div class="p-3 text-on-surface-variant">
                  {{ formatDateTable(item.addedAt) }}
                </div>
                <div class="p-3 flex items-center justify-center">
                  <button
                    class="text-outline hover:text-error transition-colors p-1 bg-transparent border-none cursor-pointer flex items-center justify-center"
                    type="button"
                    :disabled="isRemovingMedia(item.id)"
                    @click="removeMedia(item.id, item.media.title)"
                  >
                    <span class="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-span-4 border-l border-outline-variant pl-8 pb-12">
          <h3 class="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-6 border-b border-outline-variant pb-2">
            Properties
          </h3>
          <div class="space-y-6">
            <div>
              <span class="block text-xs text-on-surface-variant mb-1">Owner</span>
              <div class="flex items-center gap-2 text-sm">
                <img
                  v-if="owner?.image"
                  :src="owner.image"
                  alt="Owner Avatar"
                  class="w-6 h-6 object-cover border border-outline-variant"
                >
                <div v-else class="w-6 h-6 bg-[#0f62fe] text-white flex items-center justify-center border text-[10px] font-bold border-outline-variant">
                  {{ getInitials(owner?.name || owner?.email) }}
                </div>
                <span class="text-on-surface">{{ owner?.name || 'Loading...' }} ({{ owner?.email }})</span>
              </div>
            </div>

            <div>
              <span class="block text-xs text-on-surface-variant mb-1">Visibility</span>
              <div class="flex items-center gap-2 text-sm text-on-surface">
                <span class="material-symbols-outlined text-[18px] text-outline">
                  {{ collection.visibility === 'PUBLIC' ? 'public' : 'lock' }}
                </span>
                
                <div v-if="collection.ownerId === authStore.user?.id" class="relative flex items-center">
                  <select
                    :value="collection.visibility"
                    class="bg-transparent hover:bg-surface-container-low border-none pr-6 pl-1 py-0.5 text-sm font-semibold text-on-surface cursor-pointer appearance-none focus:outline-none focus:ring-1 focus:ring-primary"
                    :disabled="updatingVisibility"
                    @change="onVisibilityChange($event)"
                  >
                    <option value="PUBLIC">Public</option>
                    <option value="PRIVATE">Private</option>
                  </select>
                  <span class="material-symbols-outlined text-[18px] text-[#0f62fe] absolute right-0.5 pointer-events-none">
                    arrow_drop_down
                  </span>
                </div>
                <span v-else>{{ visibilityLabel }}</span>
              </div>
            </div>

            <div>
              <span class="block text-xs text-on-surface-variant mb-2">Collaborators</span>
              <div v-if="loadingMembers" class="text-xs text-on-surface-variant">Loading members...</div>
              <ul v-else-if="members.length > 0" class="space-y-2 text-sm text-on-surface list-none p-0 m-0">
                <li v-for="(member, idx) in members" :key="member.id" class="flex items-center gap-2">
                  <img
                    v-if="member.user?.image"
                    :src="member.user.image"
                    alt="Collaborator Avatar"
                    class="w-6 h-6 object-cover border border-outline-variant"
                  >
                  <div v-else :class="['w-6 h-6 flex items-center justify-center border text-[10px] font-bold', getAvatarClass(idx)]">
                    {{ getInitials(member.user?.name || member.user?.email) }}
                  </div>
                  <span>{{ member.user?.name || member.user?.email }}</span>
                  <span class="text-xs text-on-surface-variant bg-surface-container-low px-1.5 py-0.5 ml-auto border border-outline-variant">
                    {{ formatRole(member.role) }}
                  </span>
                </li>
              </ul>
              <p v-else class="text-xs text-on-surface-variant italic">No collaborators invited yet.</p>
              
              <button
                v-if="collection.ownerId === authStore.user?.id"
                class="inline-block mt-4 text-sm text-primary-container hover:underline font-medium bg-transparent border-none p-0 cursor-pointer"
                type="button"
                @click="openInviteModal"
              >
                Manage Members →
              </button>
            </div>

            <div class="pt-6 border-t border-outline-variant">
              <span class="block text-xs text-on-surface-variant mb-1">Created</span>
              <span class="text-sm text-on-surface">{{ formatDateLong(collection.createdAt) }}</span>
              <span class="block text-xs text-on-surface-variant mb-1 mt-4">Last Modified</span>
              <span class="text-sm text-on-surface">{{ formatDateTimeLong(collection.updatedAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <AppModal v-model="addMediaModalOpen" title="Add media to collection" @close="closeAddMediaModal">
      <div class="add-media-modal-body">
        <p class="modal-copy">
          Choose one or more media items to add to this collection.
        </p>

        <!-- Search Bar -->
        <div v-if="addableMedia.length > 0" class="mb-2">
          <input
            v-model="mediaSearchQuery"
            type="text"
            class="w-full bg-[#f4f4f4] border-b border-[#8d8d8d] focus:border-[#0f62fe] h-10 px-3 text-sm text-on-surface outline-none"
            placeholder="Search media by title or type..."
          />
        </div>

        <p v-if="addMediaError" class="modal-error">
          {{ addMediaError }}
        </p>

        <div v-else-if="loadingAddableMedia" class="modal-state">
          Loading media catalog...
        </div>

        <div v-else-if="addableMedia.length === 0" class="modal-state">
          No additional media is available to add.
        </div>

        <div v-else-if="filteredAddableMedia.length === 0" class="modal-state italic text-center">
          No media items match your search.
        </div>

        <menu v-else class="media-picker-list" aria-label="Available media">
          <label v-for="media in filteredAddableMedia" :key="media.id" class="media-picker-item">
            <input
              v-model="selectedMediaIds"
              type="checkbox"
              :value="media.id"
              class="carbon-checkbox"
            >
            <span class="media-picker-copy">
              <span class="media-picker-title">{{ media.title }}</span>
              <span class="media-picker-type">{{ formatMediaType(media.type) }}</span>
            </span>
          </label>
        </menu>
      </div>

      <template #footer>
        <button type="button" class="secondary-btn" :disabled="addingMedia" @click="closeAddMediaModal">
          Cancel
        </button>
        <button
          type="button"
          class="primary-btn"
          :disabled="addingMedia || selectedMediaCount === 0 || loadingAddableMedia || addableMedia.length === 0"
          @click="addSelectedMedia"
        >
          {{ addingMedia ? 'Adding...' : `Add selected (${selectedMediaCount})` }}
        </button>
      </template>
    </AppModal>

    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="inviteModalOpen" class="fixed inset-0 z-60 flex items-center justify-center bg-black/50" @click="closeInviteModal">
          <div class="bg-white w-full max-w-lg border border-[#e0e0e0] shadow-xl p-8 max-h-[90vh] overflow-y-auto" @click.stop>
            <h2 class="font-headline font-light text-[24px] text-on-surface mb-8">Invite Collaborators</h2>
            
            <form @submit.prevent="sendInvitation" class="space-y-6 mb-8">
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-medium text-on-surface-variant">User email</label>
                <input
                  v-model="inviteEmail"
                  class="w-full bg-[#f4f4f4] border-0 focus:ring-1 focus:ring-primary h-10 px-3 text-sm text-on-surface outline-none"
                  placeholder="e.g. name@company.com"
                  type="email"
                  required
                  :disabled="invitingMember"
                >
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-medium text-on-surface-variant">Role</label>
                <select
                  v-model="inviteRole"
                  class="w-full bg-[#f4f4f4] border-0 focus:ring-1 focus:ring-primary h-10 px-3 text-sm text-on-surface appearance-none outline-none"
                  :disabled="invitingMember"
                >
                  <option value="COLLABORATOR">Collaborator (Can view and edit)</option>
                  <option value="READER">Reader (Can view only)</option>
                </select>
              </div>
              <button
                type="submit"
                class="w-full bg-[#0f62fe] hover:bg-[#054ada] text-white py-3 text-sm font-medium transition-colors border-none cursor-pointer"
                :disabled="invitingMember"
              >
                {{ invitingMember ? 'Sending...' : 'Send invitation' }}
              </button>
            </form>

            <p v-if="inviteError" class="p-3 text-xs bg-error-container text-on-error-container border-l-4 border-error mb-4">
              {{ inviteError }}
            </p>
            <p v-if="inviteSuccess" class="p-3 text-xs bg-[#d9f2e8] text-[#0e6027] border-l-4 border-[#0e6027] mb-4">
              {{ inviteSuccess }}
            </p>

            <div class="mt-10">
              <h3 class="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-4">Existing Members</h3>
              <div class="overflow-x-auto">
                <table class="w-full text-sm text-left border-collapse">
                  <thead class="text-xs text-on-surface-variant bg-surface-container-low">
                    <tr>
                      <th class="p-2 font-medium border-b border-outline-variant">Email</th>
                      <th class="p-2 font-medium border-b border-outline-variant">Role</th>
                      <th class="p-2 font-medium text-right border-b border-outline-variant">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-outline-variant">
                    <tr class="align-middle">
                      <td class="p-2 text-on-surface font-semibold">{{ owner?.email }}</td>
                      <td class="p-2 text-on-surface-variant">Owner</td>
                      <td class="p-2 text-right"></td>
                    </tr>
                    <tr v-for="member in members" :key="member.id" class="align-middle">
                      <td class="p-2 text-on-surface">{{ member.user?.email }}</td>
                      <td class="p-2">
                        <span
                          :class="[
                            'text-[10px] uppercase tracking-tighter px-1.5 py-0.5 border border-outline-variant',
                            member.role === 'COLLABORATOR'
                              ? 'bg-secondary-fixed text-on-secondary-fixed-variant'
                              : 'bg-surface-container-low text-on-surface-variant'
                          ]"
                        >
                          {{ formatRole(member.role) }}
                        </span>
                      </td>
                      <td class="p-2 text-right">
                        <button
                          v-if="collection?.ownerId === authStore.user?.id"
                          class="text-error hover:underline text-xs bg-transparent border-none cursor-pointer"
                          type="button"
                          @click="removeMember(member.id, member.user?.email)"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                    <tr v-if="members.length === 0">
                      <td colspan="3" class="p-2 text-center text-xs text-on-surface-variant italic">No other members.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="mt-8 flex justify-end">
              <button
                class="text-sm text-on-surface-variant hover:text-on-surface transition-colors bg-transparent border-none cursor-pointer"
                type="button"
                @click="closeInviteModal"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Floating Toast Notification -->
    <Teleport to="body">
      <Transition name="toast-fade">
        <div
          v-if="toastMessage"
          class="fixed bottom-6 right-6 z-100 flex items-center gap-3 px-4 py-3 bg-[#161616] border border-[#393939] shadow-2xl text-white text-sm max-w-sm rounded-none"
        >
          <span
            class="material-symbols-outlined text-[18px]"
            :class="toastType === 'success' ? 'text-[#24a148]' : 'text-error'"
          >
            {{ toastType === 'success' ? 'check_circle' : 'error' }}
          </span>
          <span class="font-body pr-4">{{ toastMessage }}</span>
          <button
            type="button"
            class="text-[#8d8d8d] hover:text-white bg-transparent border-none cursor-pointer p-0 ml-auto flex items-center"
            @click="toastMessage = null"
          >
            <span class="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.collection-detail-page {
  max-width: 1200px;
  margin: 0 auto;
}

.add-media-button {
  padding: 12px 18px;
  border: 1px solid #0f62fe;
  background: linear-gradient(135deg, #0f62fe 0%, #2563eb 100%);
  color: #ffffff;
  font-weight: 700;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

.add-media-button:hover {
  transform: translateY(-1px);
}

.add-media-button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
  transform: none;
}

.add-media-modal-body {
  display: grid;
  gap: 14px;
}

.modal-copy {
  margin: 0;
  color: #525252;
  line-height: 1.5;
}

.modal-error {
  margin: 0;
  padding: 10px 12px;
  border-left: 3px solid #da1e28;
  background: #ffd7d9;
  color: #8b0000;
}

.modal-state {
  padding: 14px 12px;
  border: 1px solid #e0e0e0;
  background: #f4f4f4;
  color: #525252;
}

.media-picker-list {
  display: grid;
  gap: 10px;
  max-height: 360px;
  overflow-y: auto;
  padding-right: 4px;
}

.media-picker-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #e0e0e0;
  background: #ffffff;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.media-picker-item:hover {
  background: #f4f4f4;
  border-color: #c6c6c6;
}

.media-picker-copy {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.media-picker-title {
  color: #161616;
  font-weight: 600;
}

.media-picker-type {
  color: #525252;
  font-size: 13px;
}

.primary-btn,
.secondary-btn {
  border: 1px solid transparent;
  font-size: 14px;
  padding: 8px 12px;
  cursor: pointer;
}

.primary-btn {
  background: #0f62fe;
  color: #ffffff;
}

.primary-btn:hover {
  background: #0353e9;
}

.secondary-btn {
  background: #ffffff;
  border-color: #8d8d8d;
  color: #161616;
}

.secondary-btn:hover {
  background: #f4f4f4;
}

.primary-btn:disabled,
.secondary-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active > div,
.modal-fade-leave-active > div {
  transition: transform 0.25s cubic-bezier(0, 0, 0.2, 1);
}

.modal-fade-enter-from > div,
.modal-fade-leave-to > div {
  transform: scale(0.97) translateY(8px);
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: transform 0.25s cubic-bezier(0, 0, 0.2, 1), opacity 0.25s ease;
}

.toast-fade-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
