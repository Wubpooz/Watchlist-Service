import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useAuthStore } from './auth';

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  visibility: string;
  ownerId: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface Invitation {
  id: string;
  role: string;
  invitedAt: string;
  accepted: boolean;
  collectionId: string;
  userId: string;
  collection: Collection;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export const useInvitationsStore = defineStore('invitations', () => {
  const invitations = ref<Invitation[] | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const authStore = useAuthStore();

  const invitationCount = computed(() => invitations.value?.length ?? 0);

  async function fetchInvitations() {
    isLoading.value = true;
    error.value = null;
    try {
      const token = authStore.authToken;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/collections/invitations`, { 
        headers, 
        credentials: 'include' 
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      invitations.value = await res.json() as Invitation[];
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load invitations';
    } finally {
      isLoading.value = false;
    }
  }

  async function respondToInvitation(collectionId: string, accept: boolean) {
    error.value = null;
    try {
      const token = authStore.authToken;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/collections/${collectionId}/invitations/respond`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ accept }),
        credentials: 'include'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      // Remove from local list
      if (invitations.value) {
        invitations.value = invitations.value.filter(inv => inv.collectionId !== collectionId);
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to respond to invitation';
      throw e;
    }
  }

  return {
    invitations,
    isLoading,
    error,
    invitationCount,
    fetchInvitations,
    respondToInvitation,
  };
});
