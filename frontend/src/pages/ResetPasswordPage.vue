<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const token = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const isLoading = ref(false);
const error = ref('');
const isSuccess = ref(false);

onMounted(() => {
  const queryToken = route.query.token;
  if (typeof queryToken === 'string' && queryToken.length > 0) {
    token.value = queryToken;
  }
});

const rateLimitCountdown = ref(0);
let countdownInterval: any = null;

const startRateLimitCountdown = (seconds: number) => {
  rateLimitCountdown.value = seconds;
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    rateLimitCountdown.value--;
    if (rateLimitCountdown.value <= 0) {
      clearInterval(countdownInterval);
    }
  }, 1000);
};

const handleSubmit = async () => {
  error.value = '';

  if (!token.value) {
    error.value = 'Invalid or missing password reset token. Please request a new reset email.';
    return;
  }

  if (newPassword.value.length < 8) {
    error.value = 'Password must be at least 8 characters long.';
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Passwords do not match.';
    return;
  }

  isLoading.value = true;

  try {
    await authStore.resetPassword(token.value, newPassword.value);
    isSuccess.value = true;
    // Redirect to login after 2.5 seconds
    setTimeout(() => {
      router.push('/login');
    }, 2500);
  } catch (err: any) {
    error.value = err instanceof Error ? err.message : 'An error occurred';
    // Check if error is a rate limit error
    const match = error.value.match(/\b(\d+)\s+seconds\b/);
    if (match && error.value.toLowerCase().includes('too many requests')) {
      const seconds = parseInt(match[1], 10);
      startRateLimitCountdown(seconds);
    }
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="auth-page-container min-h-screen flex flex-col justify-between bg-white text-[#161616]">
    <header class="w-full px-6 flex justify-start items-center select-none h-14 shrink-0">
      <RouterLink class="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-body text-sm tracking-[0.16px]" to="/login">
        <span class="material-symbols-outlined text-lg">arrow_back</span>
        Back
      </RouterLink>
    </header>

    <main class="flex-grow flex flex-col items-center justify-center px-4 py-8 shrink-0">
      <div class="mb-6 w-20 h-20 select-none flex items-center justify-center shrink-0">
        <img 
          alt="Watchlist Service Logo" 
          class="w-full h-full object-contain" 
          src="../../public/assets/images/logo.png"
        />
      </div>

      <div class="auth-card w-full max-w-md border border-[#e0e0e0] p-8 bg-white flex flex-col">
        <h1 class="text-[32px] font-light leading-tight mb-8 text-[#161616] font-display">Reset password</h1>

        <div v-if="isSuccess" class="bg-[#defbe6] border-l-4 border-[#24a148] p-4 mb-8 flex items-start">
          <span class="material-symbols-outlined text-[#24a148] mr-3 mt-0.5" style="font-variation-settings: 'FILL' 1;">check_circle</span>
          <div>
            <h3 class="text-[#161616] font-semibold text-sm font-body">Password updated successfully!</h3>
            <p class="text-[#161616] text-sm mt-1 font-body">Redirecting you to the login screen...</p>
          </div>
        </div>

        <div v-else-if="token" class="bg-[#defbe6] border-l-4 border-[#24a148] p-4 mb-8 flex items-start">
          <span class="material-symbols-outlined text-[#24a148] mr-3 mt-0.5" style="font-variation-settings: 'FILL' 1;">check_circle</span>
          <div>
            <h3 class="text-[#161616] font-semibold text-sm font-body">Token validated successfully.</h3>
            <p class="text-[#161616] text-sm mt-1 font-body">Please enter your new password below.</p>
          </div>
        </div>

        <div v-else class="bg-[#ffd7d8] border-l-4 border-[#da1e28] p-4 mb-8 flex items-start">
          <span class="material-symbols-outlined text-[#da1e28] mr-3 mt-0.5" style="font-variation-settings: 'FILL' 1;">error</span>
          <div>
            <h3 class="text-[#8b0000] font-semibold text-sm font-body">Invalid or missing reset token</h3>
            <p class="text-[#8b0000] text-sm mt-1 font-body">A password reset token is required in the URL parameters. Please use the link sent to your email.</p>
          </div>
        </div>

        <div v-if="error" class="error-message mb-6">
          {{ error }}
        </div>

        <form v-if="!isSuccess" @submit.prevent="handleSubmit" class="space-y-6">
          <div>
            <label class="carbon-label" for="new_password">New password</label>
            <input 
              v-model="newPassword"
              class="carbon-input" 
              id="new_password" 
              name="new_password" 
              placeholder="••••••••" 
              required 
              type="password"
              :disabled="!token || isLoading"
            />
          </div>
          
          <div>
            <label class="carbon-label" for="confirm_password">Confirm password</label>
            <input 
              v-model="confirmPassword"
              class="carbon-input" 
              id="confirm_password" 
              name="confirm_password" 
              placeholder="••••••••" 
              required 
              type="password"
              :disabled="!token || isLoading"
            />
          </div>

          <div class="pt-4">
            <button 
              class="carbon-btn group" 
              type="submit"
              :disabled="!token || isLoading || rateLimitCountdown > 0"
            >
              <span>{{ rateLimitCountdown > 0 ? `Try again in ${rateLimitCountdown}s` : (isLoading ? 'Updating...' : 'Update password') }}</span>
              <span class="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </div>
        </form>

        <div v-if="!token" class="pt-4 flex justify-center">
          <RouterLink 
            class="text-[#0f62fe] font-body text-[14px] tracking-[0.16px] hover:underline"
            to="/forgot-password"
          >
            Request new reset link
          </RouterLink>
        </div>
      </div>
    </main>

    <footer class="bg-inverse-surface w-full px-6 py-4 border-t border-[#393939] select-none shrink-0">
      <div class="flex flex-col md:flex-row justify-between items-center w-full max-w-[1440px] mx-auto gap-2">
        <div class="select-none">
          <span class="font-body font-normal text-[12px] leading-normal text-surface-variant">
            © 2026 Watchlist Service. All rights reserved.
          </span>
        </div>
        <nav class="flex space-x-6">
          <a class="font-body font-normal text-[12px] leading-normal text-surface-variant hover:text-white transition-colors cursor-pointer" href="#">Privacy</a>
          <a class="font-body font-normal text-[12px] leading-normal text-surface-variant hover:text-white transition-colors cursor-pointer" href="#">Terms of Use</a>
          <a class="font-body font-normal text-[12px] leading-normal text-surface-variant hover:text-white transition-colors cursor-pointer" href="#">Cookie Preferences</a>
        </nav>
      </div>
    </footer>
  </div>
</template>

