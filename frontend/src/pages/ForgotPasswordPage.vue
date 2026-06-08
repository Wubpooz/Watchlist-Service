<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const isLoading = ref(false);
const error = ref('');
const isSubmitted = ref(false);

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
  isLoading.value = true;

  try {
    await authStore.forgotPassword(email.value);
    isSubmitted.value = true;
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

    <main class="grow flex flex-col items-center justify-center px-4 py-8 shrink-0">
      <div class="mb-6 w-20 h-20 select-none flex items-center justify-center shrink-0">
        <img 
          alt="Watchlist Service Logo" 
          class="w-full h-full object-contain" 
          src="../../public/assets/images/logo.png"
        />
      </div>

      <div class="auth-card w-full max-w-md border border-[#e0e0e0] p-8 bg-white flex flex-col">
        <h1 class="text-[32px] font-light leading-tight mb-4 text-[#161616] font-display">Recover credentials</h1>

        <div v-if="isSubmitted" class="bg-[#defbe6] border-l-4 border-[#24a148] p-4 mb-8 flex items-start">
          <span class="material-symbols-outlined text-[#24a148] mr-3 mt-0.5" style="font-variation-settings: 'FILL' 1;">check_circle</span>
          <div>
            <h3 class="text-[#161616] font-semibold text-sm font-body">Reset link sent!</h3>
            <p class="text-[#161616] text-sm mt-1 font-body">If the email exists, we have sent instructions to reset your password.</p>
          </div>
        </div>

        <p v-else class="text-[#525252] text-[14px] leading-relaxed tracking-[0.16px] mb-8 font-body">
          Enter your email address below and we'll send you instructions to reset your password.
        </p>

        <div v-if="error" class="error-message mb-6">
          {{ error }}
        </div>

        <form v-if="!isSubmitted" @submit.prevent="handleSubmit" class="space-y-6">
          <div>
            <label class="carbon-label" for="email">
              Email address
            </label>
            <input 
              v-model="email"
              class="carbon-input" 
              id="email" 
              name="email" 
              placeholder="Enter your email" 
              required 
              type="email"
            />
          </div>

          <div class="pt-4 flex flex-col gap-4">
            <button 
              class="carbon-btn group" 
              type="submit"
              :disabled="isLoading || rateLimitCountdown > 0"
            >
              <span>{{ rateLimitCountdown > 0 ? `Try again in ${rateLimitCountdown}s` : (isLoading ? 'Sending...' : 'Send reset instructions') }}</span>
              <span class="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
            
            <button 
              @click="router.push('/login')"
              class="w-full text-center text-[#0f62fe] font-body text-[14px] tracking-[0.16px] hover:underline bg-transparent border-0 py-2 transition-all duration-200 cursor-pointer" 
              type="button"
            >
              Cancel and return to login
            </button>
          </div>
        </form>

        <div class="pt-4 flex justify-center" v-else>
          <button 
            @click="router.push('/login')"
            class="carbon-btn w-full"
            type="button"
          >
            <span>Go to login</span>
            <span class="material-symbols-outlined text-lg">arrow_forward</span>
          </button>
        </div>
      </div>
    </main>

    <footer class="bg-inverse-surface w-full px-6 py-4 border-t border-[#393939] select-none shrink-0">
      <div class="flex flex-col md:flex-row justify-between items-center w-full max-w-360 mx-auto gap-2">
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

