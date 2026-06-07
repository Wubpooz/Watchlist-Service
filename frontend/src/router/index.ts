import { createRouter, createWebHistory, RouteRecordRaw, createMemoryHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

// Lazy load pages
const LoginPage = () => import('@/pages/LoginPage.vue');
const SignUpPage = () => import('@/pages/SignUpPage.vue');
const ForgotPasswordPage = () => import('@/pages/ForgotPasswordPage.vue');
const ResetPasswordPage = () => import('@/pages/ResetPasswordPage.vue');
const HomePage = () => import('@/pages/HomePage.vue');
const CatalogPage = () => import('@/pages/CatalogPage.vue');
const AddMediaPage = () => import('@/pages/AddMediaPage.vue');
const CollectionsPage = () => import('@/pages/CollectionsPage.vue');
const CollectionDetailPage = () => import('@/pages/CollectionDetailPage.vue');
const StatisticsPage = () => import('@/pages/StatisticsPage.vue');
const MediaDetailPage = () => import('@/pages/MediaDetailPage.vue');
const InvitationsPage = () => import('@/pages/InvitationsPage.vue');
const LayoutPage = () => import('@/pages/LayoutPage.vue');
const SettingsPage = () => import('@/pages/SettingsPage.vue');
const LandingPage = () => import('@/views/LandingView.vue');
const NotFoundPage = () => import('@/pages/NotFoundPage.vue');

const routes: RouteRecordRaw[] = [
  {
    path: '/landing',
    name: 'Landing',
    component: LandingPage,
    meta: { requiresAuth: false }
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginPage,
    meta: { requiresAuth: false }
  },
  {
    path: '/signup',
    name: 'SignUp',
    component: SignUpPage,
    meta: { requiresAuth: false }
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: ForgotPasswordPage,
    meta: { requiresAuth: false }
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: ResetPasswordPage,
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: LayoutPage,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Home',
        component: HomePage,
        meta: { requiresAuth: true, fullWidth: true }
      },
      {
        path: 'catalog',
        name: 'Catalog',
        component: CatalogPage,
        meta: { requiresAuth: true, fullWidth: true }
      },
      {
        path: 'catalog/new',
        name: 'AddMedia',
        component: AddMediaPage,
        meta: { requiresAuth: true }
      },
      {
        path: 'collections',
        name: 'Collections',
        component: CollectionsPage,
        meta: { requiresAuth: true }
      },
      {
        path: 'collections/:id',
        name: 'CollectionDetail',
        component: CollectionDetailPage,
        meta: { requiresAuth: true }
      },
      {
        path: 'invitations',
        name: 'Invitations',
        component: InvitationsPage,
        meta: { requiresAuth: true }
      },
      {
        path: 'statistics',
        name: 'Statistics',
        component: StatisticsPage,
        meta: { requiresAuth: true }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: SettingsPage,
        meta: { requiresAuth: true }
      },
      {
        path: 'media/:id',
        name: 'MediaDetail',
        component: MediaDetailPage,
        meta: { requiresAuth: true }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFoundPage,
    meta: { requiresAuth: false }
  }
];

const router = createRouter({
  history: globalThis.window === undefined
    ? createMemoryHistory(import.meta.env.BASE_URL) // for prod
    : createWebHistory(import.meta.env.BASE_URL), // for tests
  routes
});

// Navigation guard for authentication
router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  const requiresAuth = to.meta.requiresAuth;

  // If token is present but user profile is not yet loaded, await the auth check
  if (authStore.authToken && !authStore.user) {
    try {
      await authStore.checkAuth();
    } catch (err) {
      console.error('Failed to restore session during routing:', err);
    }
  }

  if (requiresAuth && !authStore.isAuthenticated) {
    // Redirect to landing if route requires auth and user is not authenticated
    return { name: 'Landing', query: { redirect: to.fullPath } };
  }
  
  if (['/landing', '/login', '/signup', '/forgot-password', '/reset-password'].includes(to.path) && authStore.isAuthenticated) {
    // Redirect to home if user is already logged in and tries to visit auth pages
    return { name: 'Home' };
  }
});

export default router;
