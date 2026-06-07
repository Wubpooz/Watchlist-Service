<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

const name = ref('');
const username = ref('');
const displayUsername = ref('');

const isSaving = ref(false);
const successMessage = ref('');
const errorMessage = ref('');

function initForm() {
  name.value = authStore.user?.name || '';
  username.value = authStore.user?.username || '';
  displayUsername.value = authStore.user?.displayUsername || '';
}

onMounted(async () => {
  if (!authStore.user) {
    try {
      await authStore.fetchUserInfo();
    } catch (err) {
      console.error('Failed to fetch user info:', err);
    }
  }
  initForm();
});

async function handleSave() {
  isSaving.value = true;
  successMessage.value = '';
  errorMessage.value = '';

  try {
    await authStore.updateProfile({
      name: name.value.trim(),
      username: username.value.trim(),
      displayUsername: displayUsername.value.trim()
    });
    successMessage.value = 'Profile settings updated successfully.';
    
    // Clear success message after 5 seconds
    setTimeout(() => {
      successMessage.value = '';
    }, 5000);
  } catch (err: any) {
    errorMessage.value = err?.message || 'Failed to update profile settings.';
  } finally {
    isSaving.value = false;
  }
}

const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const isChangingPassword = ref(false);
const passwordSuccessMessage = ref('');
const passwordErrorMessage = ref('');

async function handleChangePassword() {
  passwordSuccessMessage.value = '';
  passwordErrorMessage.value = '';

  if (newPassword.value !== confirmPassword.value) {
    passwordErrorMessage.value = 'New password and confirmation do not match.';
    return;
  }

  if (newPassword.value.length < 8) {
    passwordErrorMessage.value = 'New password must be at least 8 characters long.';
    return;
  }

  isChangingPassword.value = true;

  try {
    await authStore.changePassword(
      currentPassword.value,
      newPassword.value
    );
    passwordSuccessMessage.value = 'Password updated successfully.';
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';

    setTimeout(() => {
      passwordSuccessMessage.value = '';
    }, 5000);
  } catch (err: any) {
    passwordErrorMessage.value = err?.message || 'Failed to update password.';
  } finally {
    isChangingPassword.value = false;
  }
}
</script>

<template>
  <div class="settings-page">
    <header class="page-header">
      <h1 class="page-title">Account Settings</h1>
      <p class="page-subtitle">Manage your profile details and security options.</p>
    </header>

    <!-- Success message -->
    <div v-if="successMessage" class="success-message" role="alert">
      <span class="material-symbols-outlined">check_circle</span>
      <span>{{ successMessage }}</span>
    </div>

    <!-- Error message -->
    <div v-if="errorMessage" class="error-message mb-6" role="alert">
      <span class="material-symbols-outlined">error</span>
      <span>{{ errorMessage }}</span>
    </div>

    <form @submit.prevent="handleSave" class="settings-form">
      <!-- Read-only Email Field -->
      <div class="form-group">
        <label for="email" class="carbon-label">Email Address</label>
        <div class="email-input-wrapper">
          <input 
            id="email" 
            type="email" 
            class="carbon-input readonly-input" 
            :value="authStore.user?.email" 
            disabled 
            aria-disabled="true"
          />
          <span class="material-symbols-outlined lock-icon" title="Email address cannot be changed">lock</span>
        </div>
        <p class="form-helper">Your registered email address is used for authentication and password recovery.</p>
      </div>

      <!-- Editable Name Field -->
      <div class="form-group">
        <label for="name" class="carbon-label">Full Name</label>
        <input 
          id="name" 
          type="text" 
          v-model="name"
          class="carbon-input" 
          placeholder="Enter your full name"
          required
          maxlength="200"
        />
      </div>

      <!-- Editable Username Field -->
      <div class="form-group">
        <label for="username" class="carbon-label">Username</label>
        <input 
          id="username" 
          type="text" 
          v-model="username"
          class="carbon-input" 
          placeholder="Enter username"
          maxlength="40"
        />
        <p class="form-helper">A unique username to identify you in shared watchlists (min 2 characters).</p>
      </div>

      <!-- Editable Display Username Field -->
      <div class="form-group">
        <label for="displayUsername" class="carbon-label">Display Username</label>
        <input 
          id="displayUsername" 
          type="text" 
          v-model="displayUsername"
          class="carbon-input" 
          placeholder="Enter display username"
          maxlength="60"
        />
        <p class="form-helper">The friendly username displayed to other collaborators.</p>
      </div>

      <!-- Security / Better Auth Info Section -->
      <div class="security-info-section">
        <h2 class="section-heading">Security Features</h2>
        <div class="security-feature-item">
          <span class="material-symbols-outlined security-icon">shield</span>
          <div class="feature-text">
            <strong>Password Breach Detection Active</strong>
            <p>Your password is automatically checked against known data leaks using Better-Auth integration.</p>
          </div>
        </div>
      </div>

      <!-- Submit Button -->
      <button 
        type="submit" 
        class="carbon-btn submit-btn" 
        :disabled="isSaving"
      >
        <span>{{ isSaving ? 'Saving changes...' : 'Save settings' }}</span>
        <span class="material-symbols-outlined">save</span>
      </button>
    </form>

    <!-- Change Password Form -->
    <form @submit.prevent="handleChangePassword" class="settings-form change-password-section pt-6 border-t mt-6">
      <h2 class="section-heading">Change Password</h2>

      <!-- Password Change Success message -->
      <div v-if="passwordSuccessMessage" class="success-message" role="alert">
        <span class="material-symbols-outlined">check_circle</span>
        <span>{{ passwordSuccessMessage }}</span>
      </div>

      <!-- Password Change Error message -->
      <div v-if="passwordErrorMessage" class="error-message" role="alert">
        <span class="material-symbols-outlined">error</span>
        <span>{{ passwordErrorMessage }}</span>
      </div>

      <div class="form-group">
        <label for="currentPassword" class="carbon-label">Current Password</label>
        <input 
          id="currentPassword" 
          type="password" 
          v-model="currentPassword"
          class="carbon-input" 
          placeholder="Enter current password"
          required
          minlength="8"
        />
      </div>

      <div class="form-group">
        <label for="newPassword" class="carbon-label">New Password</label>
        <input 
          id="newPassword" 
          type="password" 
          v-model="newPassword"
          class="carbon-input" 
          placeholder="Enter new password (minimum 8 characters)"
          required
          minlength="8"
        />
      </div>

      <div class="form-group">
        <label for="confirmPassword" class="carbon-label">Confirm New Password</label>
        <input 
          id="confirmPassword" 
          type="password" 
          v-model="confirmPassword"
          class="carbon-input" 
          placeholder="Confirm new password"
          required
          minlength="8"
        />
      </div>

      <button 
        type="submit" 
        class="carbon-btn change-password-btn" 
        :disabled="isChangingPassword"
      >
        <span>{{ isChangingPassword ? 'Updating password...' : 'Update password' }}</span>
        <span class="material-symbols-outlined">lock_reset</span>
      </button>
    </form>
  </div>
</template>

<style scoped>
.settings-page {
  max-width: 650px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
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

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.email-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.readonly-input {
  background-color: #f4f4f4;
  border-bottom: 1px solid #c6c6c6;
  color: #525252;
  cursor: not-allowed;
  padding-right: 2.5rem;
}

.lock-icon {
  position: absolute;
  right: 12px;
  font-size: 18px;
  color: #8d8d8d;
  pointer-events: none;
}

.form-helper {
  font-size: 12px;
  color: #8d8d8d;
  margin-top: 4px;
}

.mb-6 {
  margin-bottom: 1.5rem;
}

.success-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background-color: #def8e9;
  color: #198038;
  border-left: 3px solid #198038;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  margin-bottom: 1.5rem;
  border-radius: 0 !important;
}

.success-message .material-symbols-outlined {
  font-size: 20px;
}

.security-info-section {
  background-color: #f4f4f4;
  padding: 1.25rem;
  border-left: 3px solid #0f62fe;
  margin-top: 0.5rem;
}

.section-heading {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 600;
  font-size: 14px;
  color: #161616;
  margin: 0 0 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.security-feature-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.security-icon {
  color: #0f62fe;
  font-size: 20px;
  margin-top: 2px;
}

.feature-text {
  font-size: 13px;
  line-height: 1.4;
}

.feature-text strong {
  display: block;
  color: #161616;
  font-weight: 600;
}

.feature-text p {
  margin: 2px 0 0;
  color: #525252;
}

.submit-btn {
  margin-top: 1rem;
  height: 48px;
}

.pt-6 {
  padding-top: 1.5rem;
}

.border-t {
  border-top: 1px solid #e0e0e0;
}

.mt-6 {
  margin-top: 1.5rem;
}

.change-password-btn {
  background-color: #161616;
  color: #ffffff;
  margin-top: 1rem;
  height: 48px;
}

.change-password-btn:hover {
  background-color: #393939;
}
</style>
