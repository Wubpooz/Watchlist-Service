<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const username = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const isLoading = ref(false);
const error = ref('');

const handleSubmit = async () => {
  error.value = '';

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match';
    return;
  }

  isLoading.value = true;

  try {
    await authStore.register(email.value, password.value, username.value);
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
    <!-- Top/Header row with back button -->
    <header class="w-full px-6 flex justify-start items-center select-none h-14 shrink-0">
      <RouterLink class="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-body text-sm tracking-[0.16px]" to="/landing">
        <span class="material-symbols-outlined text-lg">arrow_back</span>
        Back
      </RouterLink>
    </header>

    <!-- Main section: Centered container -->
    <main class="flex-grow flex flex-col items-center justify-center px-4 py-8 shrink-0">
      <!-- Logo (same size on all pages) -->
      <div class="mb-6 w-20 h-20 select-none flex items-center justify-center shrink-0">
        <img 
          alt="Watchlist Service Logo" 
          class="w-full h-full object-contain" 
          src="../../public/assets/images/logo.png"
        />
      </div>

      <!-- Signup Container -->
      <div class="auth-card w-full max-w-md border border-[#e0e0e0] p-8 bg-white flex flex-col">
        <h1 class="text-[32px] font-light leading-tight mb-8 text-[#161616] font-display">Sign up</h1>
        
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- Username Input -->
          <div>
            <label class="carbon-label" for="username">Username</label>
            <input 
              v-model="username"
              class="carbon-input" 
              id="username" 
              name="username" 
              required 
              type="text"
              placeholder="Enter your username"
            />
          </div>

          <!-- Email Input -->
          <div>
            <label class="carbon-label" for="email">Email address</label>
            <input 
              v-model="email"
              class="carbon-input" 
              id="email" 
              name="email" 
              required 
              type="email"
              placeholder="Enter your email address"
            />
          </div>

          <!-- Password Input -->
          <div>
            <label class="carbon-label" for="password">Password</label>
            <div class="relative">
              <input 
                v-model="password"
                class="carbon-input pr-10" 
                id="password" 
                name="password" 
                required 
                :type="showPassword ? 'text' : 'password'"
                placeholder="Enter your password"
              />
              <button 
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface focus:outline-none cursor-pointer" 
                type="button"
              >
                <span class="material-symbols-outlined text-lg">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
              </button>
            </div>
          </div>

          <!-- Confirm Password Input -->
          <div>
            <label class="carbon-label" for="confirm_password">Confirm password</label>
            <div class="relative">
              <input 
                v-model="confirmPassword"
                class="carbon-input pr-10" 
                id="confirm_password" 
                name="confirm_password" 
                required 
                :type="showConfirmPassword ? 'text' : 'password'"
                placeholder="Confirm your password"
              />
              <button 
                @click="showConfirmPassword = !showConfirmPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface focus:outline-none cursor-pointer" 
                type="button"
              >
                <span class="material-symbols-outlined text-lg">{{ showConfirmPassword ? 'visibility_off' : 'visibility' }}</span>
              </button>
            </div>
          </div>

          <!-- Error message if present -->
          <div v-if="error" class="error-message">
            {{ error }}
          </div>

          <!-- Submit Button -->
          <div class="pt-4">
            <button 
              class="carbon-btn group" 
              type="submit"
              :disabled="isLoading"
            >
              <span>{{ isLoading ? 'Creating account...' : 'Create account' }}</span>
              <span class="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </div>
        </form>

        <div class="mt-6 pt-6 border-t border-[#e0e0e0]">
          <p class="text-[14px] text-[#525252]">
            Already have an account? 
            <RouterLink class="carbon-link ml-1" to="/login">Log in</RouterLink>
          </p>
        </div>
      </div>
    </main>

    <!-- Footer -->
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

.carbon-link {
  color: #0f62fe;
  text-decoration: none;
  font-size: 14px;
  transition: text-decoration 0.15s ease-in-out;
}

.carbon-link:hover {
  text-decoration: underline;
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
