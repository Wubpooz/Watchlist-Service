import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiFetch } from '@/lib/api';

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

  const invitationCount = computed(() => invitations.value?.length ?? 0);

  async function fetchInvitations() {
    isLoading.value = true;
    error.value = null;
    try {
      invitations.value = await apiFetch('/api/collections/invitations').then(r => r.json<Invitation[]>());
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load invitations';
    } finally {
      isLoading.value = false;
    }
  }

  async function respondToInvitation(collectionId: string, accept: boolean) {
    error.value = null;
    try {
      const res = await apiFetch(`/api/collections/${collectionId}/invitations/respond`, {
        method: 'POST',
        body: JSON.stringify({ accept }),
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
