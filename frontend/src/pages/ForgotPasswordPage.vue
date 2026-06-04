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

const handleSubmit = async () => {
  error.value = '';
  isLoading.value = true;

  try {
    await authStore.forgotPassword(email.value);
    isSubmitted.value = true;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'An error occurred';
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="auth-page-container min-h-screen flex flex-col justify-between bg-white text-[#161616]">
    <!-- Top/Header row with back button -->
    <header class="w-full px-6 flex justify-start items-center select-none h-14 shrink-0">
      <RouterLink class="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-body text-sm tracking-[0.16px]" to="/login">
        <span class="material-symbols-outlined text-lg">arrow_back</span>
        Back
      </RouterLink>
    </header>

    <!-- Main section: Centered container -->
    <main class="grow flex flex-col items-center justify-center px-4 py-8 shrink-0">
      <!-- Logo (same size on all pages) -->
      <div class="mb-6 w-20 h-20 select-none flex items-center justify-center shrink-0">
        <img 
          alt="Watchlist Service Logo" 
          class="w-full h-full object-contain" 
          src="../../public/assets/images/logo.png"
        />
      </div>

      <!-- Recover Credentials Container -->
      <div class="auth-card w-full max-w-md border border-[#e0e0e0] p-8 bg-white flex flex-col">
        <h1 class="text-[32px] font-light leading-tight mb-4 text-[#161616] font-display">Recover credentials</h1>

        <!-- Success Banner -->
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

        <!-- Error Message -->
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
              :disabled="isLoading"
            >
              <span>{{ isLoading ? 'Sending...' : 'Send reset instructions' }}</span>
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

        <div v-else class="pt-4 flex justify-center">
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

    <!-- Footer -->
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

<style scoped>
/* Carbon Design System Form Styles */
.carbon-input {
  background-color: #f4f4f4;
  border: none;
  border-bottom: 1px solid #8d8d8d;
  border-radius: 0 !important;
  padding: 0.875rem 1rem;
  width: 100%;
  font-size: 14px;
  color: #161616;
  transition: background-color 0.15s ease-in-out, border-bottom-color 0.15s ease-in-out;
  outline: none;
}

.carbon-input:focus {
  outline: 2px solid #0f62fe;
  outline-offset: -2px;
  border-bottom-color: transparent;
}

.carbon-input::placeholder {
  color: #a8a8a8;
}

.carbon-label {
  display: block;
  font-size: 12px;
  color: #525252;
  margin-bottom: 0.5rem;
  font-weight: 400;
  font-family: 'IBM Plex Sans', sans-serif;
}

.carbon-btn {
  background-color: #0f62fe;
  color: #ffffff;
  border: none;
  border-radius: 0 !important;
  padding: 15px;
  width: 100%;
  font-size: 14px;
  font-weight: 400;
  cursor: pointer;
  transition: background-color 0.15s ease-in-out;
  display: flex;
  justify-content: space-between;
  align-items: center;
  letter-spacing: 0.16px;
}

.carbon-btn:hover:not(:disabled) {
  background-color: #0050e6;
}

.carbon-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.carbon-btn:focus {
  outline: 2px solid #ffffff;
  outline-offset: -4px;
  box-shadow: 0 0 0 4px #0f62fe;
}

.error-message {
  padding: 12px;
  background-color: #ffd7d8;
  color: #8b0000;
  border-left: 3px solid #da1e28;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  border-radius: 0 !important;
}
</style>
