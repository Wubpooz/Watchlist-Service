<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useInvitationsStore } from '@/stores/invitations';

const invitationsStore = useInvitationsStore();

onMounted(() => {
  invitationsStore.fetchInvitations();
});

const invitations = computed(() => invitationsStore.invitations ?? []);
const isLoading = computed(() => invitationsStore.isLoading || (invitationsStore.invitations === null && !invitationsStore.error));
const error = computed(() => invitationsStore.error);

async function handleAccept(collectionId: string) {
  try {
    await invitationsStore.respondToInvitation(collectionId, true);
  } catch (err) {
    console.error('Failed to accept invitation:', err);
  }
}

async function handleDecline(collectionId: string) {
  try {
    await invitationsStore.respondToInvitation(collectionId, false);
  } catch (err) {
    console.error('Failed to decline invitation:', err);
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 1) {
    return 'Received Yesterday';
  } else if (diffDays <= 7) {
    return `Received ${diffDays} days ago`;
  }
  return `Received ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}
</script>

<template>
  <div class="invitations-page">
    <header class="page-header">
      <h1 class="page-title">Pending Invitations</h1>
      <p class="page-subtitle">Manage invitations to collaborate on shared media collections.</p>
    </header>

    <!-- Loading state -->
    <div v-if="isLoading" class="state-container">
      <div class="loading-spinner"></div>
      <span>Loading invitations…</span>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="state-container error-state">
      <span class="material-symbols-outlined">error</span>
      <p>{{ error }}</p>
    </div>

    <!-- Empty state -->
    <div v-else-if="invitations.length === 0" class="state-container empty-state">
      <span class="material-symbols-outlined empty-icon">mail_outline</span>
      <h2>Your inbox is empty</h2>
      <p>You don't have any pending collection invitations at the moment.</p>
    </div>

    <!-- Invitations list -->
    <div v-else class="invitations-list">
      <div 
        v-for="inv in invitations" 
        :key="inv.id" 
        class="invitation-row group"
      >
        <div class="invitation-details">
          <div class="invitation-subject">
            <span class="inviter-email">{{ inv.collection.owner?.email || 'Someone' }}</span>
            <span class="invite-text">invited you to</span>
            <span class="collection-link">"{{ inv.collection.name }}"</span>
          </div>
          <div class="invitation-meta">
            <span class="role-chip">{{ inv.role }}</span>
            <span class="received-time">{{ formatDate(inv.invitedAt) }}</span>
          </div>
        </div>

        <div class="invitation-actions">
          <button 
            class="action-btn btn-secondary"
            @click="handleDecline(inv.collectionId)"
          >
            Decline
          </button>
          <button 
            class="action-btn btn-primary"
            @click="handleAccept(inv.collectionId)"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.invitations-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  margin-bottom: 2.5rem;
}

.page-title {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 300;
  font-size: 2.5rem;
  color: #161616;
  margin: 0 0 0.5rem;
}

.page-subtitle {
  font-size: 14px;
  color: #525252;
  margin: 0;
}

/* State Containers */
.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  min-height: 300px;
  color: #525252;
  font-size: 14px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e0e0e0;
  border-top-color: #0f62fe;
  border-radius: 50% !important;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.error-state {
  color: #da1e28;
}

.error-state .material-symbols-outlined {
  font-size: 2rem;
}

.empty-icon {
  font-size: 3rem;
  color: #c6c6c6;
}

.empty-state h2 {
  font-weight: 300;
  font-size: 1.5rem;
  margin: 0;
  color: #161616;
}

.empty-state p {
  font-size: 14px;
  margin: 0;
}

/* Invitations List */
.invitations-list {
  display: flex;
  flex-direction: column;
}

.invitation-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 0.5rem;
  border-bottom: 1px solid #e0e0e0;
  transition: background-color 0.15s ease-in-out;
}

.invitation-row:hover {
  background-color: #f4f4f4;
}

.invitation-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.invitation-subject {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 14px;
}

.inviter-email {
  font-weight: 600;
  color: #161616;
}

.invite-text {
  color: #525252;
}

.collection-link {
  color: #0f62fe;
  font-weight: 500;
}

.invitation-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}

.role-chip {
  font-size: 10px;
  font-weight: 600;
  background-color: #e0e0e0;
  color: #161616;
  padding: 2px 6px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.received-time {
  font-size: 12px;
  color: #525252;
}

.invitation-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  opacity: 0;
  transition: opacity 0.15s ease-in-out;
}

.invitation-row:hover .invitation-actions {
  opacity: 1;
}

@media (max-width: 768px) {
  .invitation-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  .invitation-actions {
    opacity: 1;
    width: 100%;
    justify-content: flex-end;
  }
}

.action-btn {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  border: none;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: background-color 0.15s ease-in-out;
}

.btn-primary {
  background-color: #0f62fe;
  color: #ffffff;
}

.btn-primary:hover {
  background-color: #0353e9;
}

.btn-secondary {
  background-color: #393939;
  color: #ffffff;
}

.btn-secondary:hover {
  background-color: #4c4c4c;
}
</style>
