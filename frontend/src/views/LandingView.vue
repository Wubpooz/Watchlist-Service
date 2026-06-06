<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import AppModal from '@/components/AppModal.vue';

const router = useRouter();

// Modal state for Footer Links
const isModalOpen = ref(false);
const modalTitle = ref('');
const modalBodyType = ref<'privacy' | 'terms' | 'cookies' | null>(null);

const openInfoModal = (type: 'privacy' | 'terms' | 'cookies') => {
  modalBodyType.value = type;
  if (type === 'privacy') {
    modalTitle.value = 'Privacy Policy';
  } else if (type === 'terms') {
    modalTitle.value = 'Terms of Use';
  } else if (type === 'cookies') {
    modalTitle.value = 'Cookie Preferences';
  }
  isModalOpen.value = true;
};

// State for Live Activity Feed
interface Activity {
  id: number;
  user: string;
  action: string;
  target: string;
  time: string;
  isActive: boolean;
}

const activities = ref<Activity[]>([
  { id: 1, user: "Sarah L.", action: "added", target: '"Dune: Part Two"', time: "12 mins ago", isActive: true },
  { id: 2, user: "Mike D.", action: "left a comment on", target: '"The Bear"', time: "1 hour ago", isActive: false },
]);

const users = ref([
  { name: 'Sarah L.', initials: 'SL', role: 'Owner', status: 'Active now', isOwner: true },
  { name: 'Mike D.', initials: 'MD', role: 'Collaborator', status: '12m ago', isOwner: false }
]);

// Scroll target for "View Demo"
const demoSection = ref<HTMLElement | null>(null);
const scrollToDemo = () => {
  demoSection.value?.scrollIntoView({ behavior: 'smooth' });
};

// Simulated Live Updates
let intervalId: any = null;
const possibleActivities = [
  { user: "Emma W.", action: "marked", target: '"Neuromancer" as Completed', time: "Just now" },
  { user: "Sarah L.", action: "created", target: "Sci-Fi Classics", time: "Just now" },
  { user: "Mike D.", action: "invited", target: "John Doe to watch-group", time: "Just now" },
  { user: "Emma W.", action: "added", target: '"Spirited Away" to Anime List', time: "Just now" }
];

const toggleRole = (index: number) => {
  if (users.value[index].isOwner) return;
  users.value[index].role = users.value[index].role === 'Collaborator' ? 'Editor' : 'Collaborator';
};

onMounted(() => {
  // Add live items to the feed to demonstrate "Live sync"
  intervalId = setInterval(() => {
    const randomAct = possibleActivities[Math.floor(Math.random() * possibleActivities.length)];
    const newId = Date.now();
    
    // Add to top of list
    activities.value.unshift({
      id: newId,
      user: randomAct.user,
      action: randomAct.action,
      target: randomAct.target,
      time: randomAct.time,
      isActive: true
    });
    
    // Cap at 4 items
    if (activities.value.length > 4) {
      activities.value.pop();
    }
  }, 7000);
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});
</script>

<template>
  <div class="bg-background text-on-surface antialiased min-h-screen flex flex-col font-body selection:bg-primary selection:text-white">
    <!-- TopNavBar -->
    <nav class="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-14 bg-surface/90 backdrop-blur border-b border-outline-variant">
      <div class="flex items-center gap-8 h-full">
        <a href="#" class="flex items-center gap-2 group">
          <img src="/assets/images/logo.png" alt="Watchlist Service Logo" class="h-6 w-6 object-contain" />
          <span class="text-lg font-headline font-light tracking-tight text-on-surface">Watchlist Service</span>
        </a>
      </div>
      <div class="flex items-center gap-4">
        <button @click="router.push('/login')" class="text-on-surface-variant hover:text-on-surface transition-colors duration-150 cursor-pointer text-sm font-medium px-2 py-1">Log In</button>
        <button @click="router.push({ path: '/signup' })" class="bg-primary text-on-primary hover:bg-primary-container active:bg-surface-tint transition-all duration-150 px-4 py-2 cursor-pointer text-sm font-medium hover:shadow-md active:translate-y-px">Sign Up</button>
      </div>
    </nav>

    <!-- Main Content Canvas -->
    <main class="flex-1 mt-14">
      <!-- Hero Section -->
      <section class="relative w-full min-h-[85vh] flex flex-col justify-center items-start px-6 md:px-12 lg:px-24 bg-surface-container-low overflow-hidden">
        <div class="absolute inset-0 z-0 opacity-20 pointer-events-none" style="background-image: radial-gradient(circle at 75% 50%, #0f62fe 0%, transparent 60%);"></div>
        
        <div class="relative z-10 max-w-4xl space-y-8 animate-fade-in-up">
          <h1 class="font-headline font-light text-5xl md:text-7xl leading-[1.1] text-on-surface tracking-tight text-balance">
            The Ultimate Media <br class="hidden md:inline" />
            <span class="text-primary font-normal">Management Platform</span>
          </h1>
          <p class="text-lg md:text-xl text-on-surface-variant max-w-2xl body-text leading-relaxed">
            The best platform for cataloging, tracking, and discovering media. Engineered for precision, built for scale, and designed to sync across your entire digital shelf.
          </p>
          <div class="flex flex-wrap items-center gap-4 pt-4">
            <button @click="router.push({ path: '/signup' })" class="bg-primary text-on-primary hover:bg-primary-container active:bg-surface-tint transition-all px-6 py-3 cursor-pointer cta-text flex items-center gap-2 group hover:shadow-md">
              Start Curation
              <span class="material-symbols-outlined text-sm transform group-hover:translate-x-1 transition-transform" data-icon="arrow_forward">arrow_forward</span>
            </button>
            <button @click="scrollToDemo" class="bg-transparent border border-outline text-on-surface hover:bg-surface-container-high active:bg-surface-container-highest transition-all px-6 py-3 cursor-pointer cta-text">
              View Demo
            </button>
          </div>
        </div>
      </section>

      <!-- Stats Bar -->
      <section class="w-full bg-inverse-surface text-on-secondary py-12 px-6 md:px-12 lg:px-24 select-none">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-outline">
          <div class="flex flex-col md:pr-8 pt-4 md:pt-0">
            <span class="text-4xl md:text-5xl font-light text-surface-bright mb-2">1.2M+</span>
            <span class="text-xs text-surface-dim font-bold tracking-wider uppercase">Items Tracked</span>
          </div>
          <div class="flex flex-col md:px-8 pt-4 md:pt-0">
            <span class="text-4xl md:text-5xl font-light text-surface-bright mb-2">700K+</span>
            <span class="text-xs text-surface-dim font-bold tracking-wider uppercase">Active Curators</span>
          </div>
          <div class="flex flex-col md:pl-8 pt-4 md:pt-0">
            <span class="text-4xl md:text-5xl font-light text-surface-bright mb-2">99.9%</span>
            <span class="text-xs text-surface-dim font-bold tracking-wider uppercase">Uptime SLA</span>
          </div>
        </div>
      </section>

      <!-- Productivity Section (Bento Grid) -->
      <section ref="demoSection" class="w-full py-24 px-6 md:px-12 lg:px-24 bg-surface">
        <div class="mb-16 max-w-3xl">
          <div class="flex items-center gap-2 text-primary font-medium uppercase tracking-wider text-xs mb-3">
            <span class="material-symbols-outlined text-base">dashboard</span>
            Feature Catalog
          </div>
          <h2 class="text-4xl md:text-5xl font-light text-on-surface mb-6 leading-tight tracking-tight">Productivity Hub</h2>
          <p class="text-lg text-on-surface-variant body-text max-w-2xl leading-relaxed">
            A unified architecture for media management. Connect disparate sources into a single, high-performance catalog.
          </p>
        </div>
        
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <!-- Universal Cataloging -->
          <div class="col-span-1 bg-surface-container-low p-8 flex flex-col justify-between group hover:bg-surface-container-high transition-all duration-300 border border-outline-variant hover:border-outline">
            <div>
              <div class="w-12 h-12 mb-8 transform group-hover:scale-105 transition-transform">
                <img alt="Universal Cataloging Icon" class="w-full h-full object-contain" src="/assets/images/logo.png" />
              </div>
              <h3 class="text-2xl font-light text-on-surface mb-4">Universal Cataloging</h3>
              <p class="text-on-surface-variant body-text mb-8">
                Ingest, normalize, and organize metadata across thousands of media types with zero data loss.
              </p>
            </div>
            <a class="text-primary cta-text flex items-center gap-2 mt-auto group-hover:underline" href="#">
              View Schema 
              <span class="material-symbols-outlined text-sm transform group-hover:translate-x-1 transition-transform" data-icon="arrow_forward">arrow_forward</span>
            </a>
          </div>

          <!-- Cross-Platform Discovery (Large Card) -->
          <div class="col-span-1 lg:col-span-2 bg-surface-container-low flex flex-col md:flex-row group overflow-hidden border border-outline-variant hover:border-outline hover:bg-surface-container-high transition-all duration-300">
            <div class="p-8 flex flex-col justify-between md:w-1/2">
              <div>
                <div class="w-12 h-12 mb-8 transform group-hover:scale-105 transition-transform">
                  <img alt="Cross-Platform Icon" class="w-full h-full object-contain" src="/assets/images/logo.png" />
                </div>
                <h3 class="text-2xl font-light text-on-surface mb-4">Cross-Platform Media Discovery</h3>
                <p class="text-on-surface-variant body-text mb-8">
                  Unified sync across devices. Intelligent algorithms surface relevant content based on deep behavioral analysis.
                </p>
              </div>
              <a class="text-primary cta-text flex items-center gap-2 mt-auto group-hover:underline" href="#">
                Explore Integrations 
                <span class="material-symbols-outlined text-sm transform group-hover:translate-x-1 transition-transform" data-icon="arrow_forward">arrow_forward</span>
              </a>
            </div>
            <div class="md:w-1/2 h-64 md:h-auto relative bg-surface-container-high overflow-hidden">
              <img alt="Cross Platform Screen Mockup" class="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" src="/assets/images/dashboard.png" />
            </div>
          </div>

          <!-- Advanced Analytics -->
          <div class="col-span-1 lg:col-span-3 bg-surface-container-low flex flex-col md:flex-row group overflow-hidden border border-outline-variant hover:border-outline hover:bg-surface-container-high transition-all duration-300">
            <div class="p-8 flex flex-col justify-between md:w-1/3">
              <div>
                <div class="w-12 h-12 mb-8 transform group-hover:scale-105 transition-transform">
                  <img alt="Advanced Analytics Icon" class="w-full h-full object-contain" src="/assets/images/logo.png" />
                </div>
                <h3 class="text-2xl font-light text-on-surface mb-4">Advanced Analytics</h3>
                <p class="text-on-surface-variant body-text mb-8">
                  Real-time telemetry on consumption patterns, completion rates, and genre affinity. Experience high-fidelity data visualization for your entire media ecosystem.
                </p>
              </div>
              <a class="text-primary cta-text flex items-center gap-2 mt-auto group-hover:underline" href="#">
                Explore Insights 
                <span class="material-symbols-outlined text-sm transform group-hover:translate-x-1 transition-transform" data-icon="arrow_forward">arrow_forward</span>
              </a>
            </div>
            <div class="md:w-2/3 h-64 md:h-auto relative bg-surface-container-high overflow-hidden">
              <img alt="Modular Productivity Dashboard" class="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" src="/assets/images/dashboard.png" />
            </div>
          </div>
        </div>
      </section>

      <!-- Collaboration Section -->
      <section class="w-full py-24 px-6 md:px-12 lg:px-24 bg-surface border-t border-outline-variant">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <!-- Left Column: Content -->
          <div class="space-y-8">
            <div class="flex items-center gap-2 text-primary font-medium uppercase tracking-wider text-xs mb-3">
              <span class="material-symbols-outlined text-base">groups</span>
              Collaborative Intelligence
            </div>
            <h2 class="text-4xl md:text-5xl font-light text-on-surface leading-tight tracking-tight">Social Library Sync</h2>
            <p class="text-lg text-on-surface-variant body-text max-w-2xl leading-relaxed">
              Curate together in real-time. Share watchlists with granular role-based access control and monitor updates via the live activity feed.
            </p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              <div class="border-l-2 border-primary pl-4">
                <h4 class="font-medium text-on-surface">Granular RBAC</h4>
                <p class="text-sm text-on-surface-variant mt-1">Assign Owner, Collaborator, or Reader permissions.</p>
              </div>
              <div class="border-l-2 border-primary pl-4">
                <h4 class="font-medium text-on-surface">Live Activity</h4>
                <p class="text-sm text-on-surface-variant mt-1">Real-time WebSocket updates for all list changes.</p>
              </div>
            </div>
          </div>

          <!-- Right Column: UI Card Mockup -->
          <div class="bg-surface border border-outline-variant p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div class="flex justify-between items-center mb-8">
              <h3 class="text-lg font-medium text-on-surface">Collaborators</h3>
              <button class="text-primary text-xs font-semibold hover:underline flex items-center gap-1">
                <span class="material-symbols-outlined text-sm">settings</span> Manage
              </button>
            </div>
            
            <div class="space-y-4 mb-8">
              <div 
                v-for="(user, idx) in users" 
                :key="user.name"
                class="flex items-center justify-between p-3 hover:bg-surface-container-low transition-colors duration-150"
              >
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 bg-primary text-on-primary flex items-center justify-center text-xs font-medium" v-if="user.isOwner">
                    {{ user.initials }}
                  </div>
                  <div class="w-10 h-10 bg-surface-container-highest flex items-center justify-center text-xs font-medium text-on-surface-variant" v-else>
                    {{ user.initials }}
                  </div>
                  <div>
                    <p class="text-sm font-medium text-on-surface">{{ user.name }}</p>
                    <p class="text-xs text-on-surface-variant">{{ user.role }} • {{ user.status }}</p>
                  </div>
                </div>
                <div v-if="user.isOwner">
                  <span class="text-[10px] font-bold bg-surface-container-highest px-3 py-1 text-on-surface-variant uppercase tracking-wider">Admin</span>
                </div>
                <div v-else>
                  <button 
                    @click="toggleRole(idx)"
                    class="text-[10px] font-bold border border-outline-variant px-3 py-1.5 text-primary hover:bg-primary hover:text-on-primary transition-all duration-150 cursor-pointer active:translate-y-px"
                  >
                    Change Access
                  </button>
                </div>
              </div>
            </div>

            <!-- Activity Feed -->
            <div class="border-t border-outline-variant pt-8">
              <div class="flex items-center gap-2 mb-6">
                <span class="material-symbols-outlined text-primary text-base animate-pulse">sensors</span>
                <h3 class="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">Live Activity Feed</h3>
              </div>
              
              <div class="space-y-4 relative overflow-hidden max-h-48">
                <TransitionGroup name="list" tag="div" class="space-y-4">
                  <div 
                    v-for="act in activities" 
                    :key="act.id"
                    class="relative pl-6 border-l-2 border-outline-variant hover:border-primary transition-colors"
                  >
                    <div class="absolute -left-1.25 top-1.5 w-2 h-2 bg-outline group-hover:bg-primary transition-colors" :class="{ 'bg-primary animate-ping': act.isActive }"></div>
                    <p class="text-xs text-on-surface leading-relaxed">
                      <span class="font-semibold">{{ act.user }}</span> {{ act.action }} <span class="italic text-on-surface-variant">{{ act.target }}</span>
                    </p>
                    <p class="text-[10px] text-on-surface-variant mt-1 flex items-center gap-1">
                      <span class="material-symbols-outlined text-[10px]">schedule</span> {{ act.time }}
                    </p>
                  </div>
                </TransitionGroup>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Enterprise / Deploy Section -->
      <section class="w-full py-24 px-6 md:px-12 lg:px-24 bg-surface-container-low">
        <div class="mb-16 max-w-3xl">
          <div class="flex items-center gap-2 text-primary font-medium uppercase tracking-wider text-xs mb-3">
            <span class="material-symbols-outlined text-base">dns</span>
            Enterprise Infrastructure
          </div>
          <h2 class="text-4xl md:text-5xl font-light text-on-surface mb-6 leading-tight tracking-tight">
            Deploy Anywhere with Enterprise Reliability
          </h2>
          <p class="text-lg text-on-surface-variant body-text max-w-2xl leading-relaxed">
            Enterprise-grade infrastructure support for modern development workflows. Scale your media management with precision and control.
          </p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full text-left mb-16">
          <div class="bg-surface border border-outline-variant p-8 flex flex-col justify-between group hover:border-outline transition-all duration-300">
            <div class="mb-8">
              <h3 class="text-2xl font-light text-on-surface mb-4">Self-Hosted Control</h3>
              <p class="text-on-surface-variant body-text">
                Deploy the full stack on your own infrastructure via Docker, ensuring 100% data sovereignty and compliance with internal security standards.
              </p>
            </div>
            <div class="relative w-full h-72 overflow-hidden border border-outline-variant bg-surface-container-high">
              <img src="/assets/images/server_racks.jpg" alt="Enterprise server racks representing self-hosted control" class="w-full h-full object-cover">
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4">
            <div class="bg-surface border border-outline-variant p-8 flex flex-col hover:border-outline transition-all duration-300">
              <div class="flex items-center gap-3 mb-4">
                <span class="material-symbols-outlined text-primary text-xl">hub</span>
                <h3 class="text-lg font-medium text-on-surface">Model Context Protocol (MCP)</h3>
              </div>
              <p class="text-sm text-on-surface-variant body-text leading-relaxed">
                Native support for LLM integrations through our experimental MCP server entrypoint. Connect your catalog directly to AI agents for intelligent discovery.
              </p>
            </div>
            
            <div class="bg-surface border border-outline-variant p-8 flex flex-col hover:border-outline transition-all duration-300">
              <div class="flex items-center gap-3 mb-4">
                <span class="material-symbols-outlined text-primary text-xl">api</span>
                <h3 class="text-lg font-medium text-on-surface">OpenAPI Standards</h3>
              </div>
              <p class="text-sm text-on-surface-variant body-text leading-relaxed">
                High-fidelity API documentation and auto-generated client libraries. Built for rapid custom development and seamless third-party integrations.
              </p>
            </div>

            <div class="bg-surface border border-outline-variant p-8 flex flex-col hover:border-outline transition-all duration-300">
              <div class="flex items-center gap-3 mb-4">
                <span class="material-symbols-outlined text-primary text-xl">verified_user</span>
                <h3 class="text-lg font-medium text-on-surface">Docker Ready</h3>
              </div>
              <p class="text-sm text-on-surface-variant body-text leading-relaxed">
                Pre-configured container images for production-ready deployments. Optimized for performance and security out of the box.
              </p>
            </div>
          </div>
        </div>
      </section>
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
          <a class="font-body font-normal text-[12px] leading-normal text-surface-variant hover:text-white transition-colors cursor-pointer" @click.prevent="openInfoModal('privacy')">Privacy</a>
          <a class="font-body font-normal text-[12px] leading-normal text-surface-variant hover:text-white transition-colors cursor-pointer" @click.prevent="openInfoModal('terms')">Terms of Use</a>
          <a class="font-body font-normal text-[12px] leading-normal text-surface-variant hover:text-white transition-colors cursor-pointer" @click.prevent="openInfoModal('cookies')">Cookie Preferences</a>
        </nav>
      </div>
    </footer>

    <!-- Reusable Info Modal -->
    <AppModal v-model="isModalOpen" :title="modalTitle">
      <div v-if="modalBodyType === 'privacy'" class="space-y-4 text-sm leading-relaxed text-on-surface-variant">
        <p>Your privacy is important to us. This policy explains how we collect, use, and guard your personal data.</p>
        <h4 class="font-semibold text-on-surface text-base">1. Data We Collect</h4>
        <p>We collect only the essential data required to provide our watchlists, collections, and analytics services, including your email and account preference data.</p>
        <h4 class="font-semibold text-on-surface text-base">2. Data Sovereignty</h4>
        <p>If you choose to self-host using our Docker containers, all data remains entirely on your own infrastructure.</p>
      </div>

      <div v-else-if="modalBodyType === 'terms'" class="space-y-4 text-sm leading-relaxed text-on-surface-variant">
        <p>By using the Watchlist Service, you agree to these Terms of Use. Please read them carefully.</p>
        <h4 class="font-semibold text-on-surface text-base">1. Account Terms</h4>
        <p>You must maintain the security of your account credentials. You are responsible for all activity under your account.</p>
        <h4 class="font-semibold text-on-surface text-base">2. Acceptable Use</h4>
        <p>You may not use our service to store or transmit malicious content or violate intellectual property rights.</p>
      </div>

      <div v-else-if="modalBodyType === 'cookies'" class="space-y-4 text-sm leading-relaxed text-on-surface-variant">
        <p>We use cookies to enhance your browsing experience, analyze site traffic, and support user authentication.</p>
        <div class="space-y-3 pt-2">
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked disabled class="rounded border-outline-variant text-primary focus:ring-primary" />
            <div>
              <p class="font-semibold text-on-surface text-sm">Essential Cookies</p>
              <p class="text-xs text-on-surface-variant">Required for system login and secure session management.</p>
            </div>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked class="rounded border-outline-variant text-primary focus:ring-primary" />
            <div>
              <p class="font-semibold text-on-surface text-sm">Analytics Cookies</p>
              <p class="text-xs text-on-surface-variant">Help us understand how curators interact with the landing page.</p>
            </div>
          </label>
        </div>
      </div>
      
      <template #footer>
        <button class="bg-primary text-on-primary hover:bg-primary-container px-4 py-2 text-xs font-semibold cursor-pointer active:translate-y-px transition-all" @click="isModalOpen = false">
          Accept & Close
        </button>
      </template>
    </AppModal>
  </div>
</template>


<style scoped>
/* Keyframes for Hero animation */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

/* List transition animations for Live Feed */
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}
.list-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
