<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const mediaId = computed(() => route.params.id as string);
</script>

<template>
  <div class="page-container">
    <h1>Media Details</h1>
    <p>Media ID: {{ mediaId }}</p>
    <div class="placeholder">
      <p>📺 Media detail page coming soon...</p>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  max-width: 1200px;
  margin: 0 auto;
}

.page-container h1 {
  color: #42b883;
  margin-bottom: 1rem;
}

.placeholder {
  padding: 2rem;
  background-color: #1a1a1a;
  border: 1px dashed #333333;
  border-radius: 8px;
  text-align: center;
  color: #888888;
}
</style>
