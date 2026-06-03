import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import { useAuthStore } from './stores/auth';
import App from './App.vue';
import './index.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// Check authentication on app load
const authStore = useAuthStore();
authStore.checkAuth().then(() => {
  app.mount('#app');
});
