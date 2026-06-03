<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();
const goHome = () => {
  router.push('/');
};
</script>

<template>
  <div class="not-found-page bg-background text-on-surface min-h-screen flex items-center justify-center p-6 font-body">
    <div class="not-found-container border border-outline-variant p-12 max-w-md w-full bg-surface-container-low text-center flex flex-col items-center">
      <div class="logo-box mb-8 animate-float select-none">
        <img src="/assets/images/logo.png" alt="Watchlist Service Logo" class="h-12 w-12 object-contain" />
      </div>
      <h1 class="text-7xl font-light text-primary mb-2 select-none">404</h1>
      <h2 class="text-2xl font-light text-on-surface mb-4">Page Not Found</h2>
      <p class="text-sm text-on-surface-variant mb-8 leading-relaxed">
        The requested resource does not exist, or has been relocated to another partition. Please verify the URL or return to home.
      </p>
      <button 
        @click="goHome" 
        class="bg-primary text-on-primary hover:bg-primary-container active:bg-surface-tint transition-all px-6 py-3 cursor-pointer text-sm font-semibold w-full"
      >
        Return to Safety
      </button>
    </div>
  </div>
</template>

<style scoped>
.not-found-page {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

.animate-float {
  animation: float 4s ease-in-out infinite;
}
</style>
