<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const rememberDevice = ref(false);
const isLoading = ref(false);
const error = ref('');

const handleSubmit = async () => {
  error.value = '';
  isLoading.value = true;

  try {
    await authStore.login(email.value, password.value, rememberDevice.value);
    const redirect = route.query.redirect as string || '/';
    router.push(redirect);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'An error occurred';
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="auth-page-container min-h-screen flex flex-col justify-between bg-white text-[#161616]">
    <header class="w-full px-6 flex justify-start items-center select-none h-14 shrink-0">
      <RouterLink class="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-body text-sm tracking-[0.16px]" to="/landing">
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
        <h1 class="text-[32px] font-light leading-tight mb-8 text-[#161616] font-display">Log in to your library</h1>
        
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <div>
            <label class="carbon-label" for="email">Email address</label>
            <input 
              v-model="email"
              autocomplete="email" 
              class="carbon-input" 
              id="email" 
              name="email" 
              required 
              type="email"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label class="carbon-label" for="password">Password</label>
            <input 
              v-model="password"
              autocomplete="current-password" 
              class="carbon-input" 
              id="password" 
              name="password" 
              required 
              type="password"
              placeholder="Enter your password"
            />
          </div>

          <div class="flex items-center justify-between pt-2">
            <label class="flex items-center cursor-pointer group">
              <input 
                v-model="rememberDevice"
                class="carbon-checkbox" 
                name="remember" 
                type="checkbox"
              />
              <span class="text-[14px] text-[#161616]">Remember this device</span>
            </label>
            <RouterLink class="carbon-link" to="/forgot-password">Forgot password?</RouterLink>
          </div>

          <div v-if="error" class="error-message">
            {{ error }}
          </div>

          <div class="pt-4">
            <button 
              class="carbon-btn group" 
              type="submit"
              :disabled="isLoading"
            >
              <span>{{ isLoading ? 'Loading...' : 'Log in' }}</span>
              <span class="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </div>
        </form>

        <div class="mt-6 pt-6 border-t border-[#e0e0e0]">
          <p class="text-[14px] text-[#525252]">
            Don't have an account? 
            <RouterLink class="carbon-link ml-1" to="/signup">Sign up</RouterLink>
          </p>
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

