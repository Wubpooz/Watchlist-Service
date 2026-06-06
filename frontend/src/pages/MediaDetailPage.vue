<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const mediaId = computed(() => route.params.id as string);

type Media = {
  id: string;
  title: string;
  description?: string | null;
  type?: string | null;
  releaseDate?: string | null;
  directorAuthor?: string | null;
  tags?: string[];
  platforms?: string[];
  scores?: Record<string, number> | null;
  url?: string | null;
};

const media = ref<Media | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

async function loadMedia(id: string) {
  loading.value = true;
  error.value = null;
  try {
    const res = await fetch(`/api/media/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`Failed to fetch media (${res.status})`);
    const data = await res.json();
    // API may return the media directly or wrapped, handle both
    media.value = data.media ?? data;
  } catch (err: any) {
    error.value = err?.message ?? 'Unknown error';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (mediaId.value) loadMedia(mediaId.value);
});
</script>

<!-- <template>
  <div class="page-container">
    <h1>Media Details</h1>

    <div v-if="loading" class="placeholder">Loading...</div>
    <div v-else-if="error" class="placeholder">Error: {{ error }}</div>
    <div v-else-if="media">
      <h2>{{ media.title }}</h2>
      <p v-if="media.description">{{ media.description }}</p>

      <ul class="meta-list">
        <li><strong>Type:</strong> {{ media.type ?? '—' }}</li>
        <li><strong>Release Date:</strong> {{ media.releaseDate ? new Date(media.releaseDate).toLocaleDateString() : '—' }}</li>
        <li><strong>Director / Author:</strong> {{ media.directorAuthor ?? '—' }}</li>
        <li v-if="media.url"><strong>URL:</strong> <a :href="media.url" target="_blank" rel="noreferrer">Open</a></li>
      </ul>

      <div class="chips">
        <div v-if="media.tags && media.tags.length">
          <strong>Tags:</strong>
          <span class="chip" v-for="tag in media.tags" :key="tag">{{ tag }}</span>
        </div>

        <div v-if="media.platforms && media.platforms.length" style="margin-top:8px">
          <strong>Platforms:</strong>
          <span class="chip" v-for="p in media.platforms" :key="p">{{ p }}</span>
        </div>
      </div>

      <div v-if="media.scores && Object.keys(media.scores).length" class="scores">
        <h3>Review Scores</h3>
        <ul>
          <li v-for="(score, source) in media.scores as Record<string, number>" :key="source">
            <strong>{{ source }}:</strong> {{ score }}
          </li>
        </ul>
      </div>
    </div>
    <div v-else class="placeholder">No media found.</div>
  </div>
</template> -->

<template>
  <div class="page-container">
    <!-- left side : cover image if we ever have those -->
    <div v-if="media?.url" class="cover-image">
      <img v-if="media?.url" :src="media.url" alt="Media Cover" class="cover-img" />
    </div>
    <!-- right side : name, author, type, description, release, tags, platforms, add to collection button, collections that have it -->
    <div class="media-details">
      <h1 v-if="media?.description" class="media-title">{{ media.title }}</h1>
      <div class="author-type-row">
        <span v-if="media?.directorAuthor" class="author-text">{{ media.directorAuthor }}</span>
        <span v-if="media?.type" class="visibility-chip">{{ media.type }}</span>
      </div>
      <p v-if="media?.description" class="media-description">{{ media.description }}</p>
      <ul class="data-list">
        <li v-if="media?.releaseDate"><strong>Release Date:</strong> {{ media.releaseDate ? new Date(media.releaseDate).toLocaleDateString(undefined, { year: 'numeric' }) : '—' }}</li>
        <li v-if="media?.tags && media.tags.length">
          <strong>Tags: </strong>
          <!-- tag1, tag2, tag3 -->
          <span class="detail-list-item" v-for="(tag, index) in media.tags" :key="tag">
            {{ tag }}<span v-if="index < media.tags.length - 1">, </span>
          </span>
        </li>
        <li v-if="media?.platforms && media.platforms.length">
          <strong>Platforms: </strong>
          <!-- platform1, platform2, platform3 -->
          <span class="detail-list-item" v-for="(platform, index) in media.platforms" :key="platform">
            {{ platform }}<span v-if="index < media.platforms.length - 1">, </span>
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  max-width: 1800px;
  height: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: row;
  gap: 24px;
}

/* .page-container h1 {
  color: #42b883;
  margin-bottom: 1rem;
}

.placeholder {
  padding: 1.5rem;
  background-color: #1a1a1a;
  border: 1px dashed #333333;
  border-radius: 8px;
  text-align: center;
  color: #888888;
}

.meta-list {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 1rem 0;
}

.meta-list li { margin: 6px 0 }

.scores ul { padding-left: 1rem } */


.cover-image {
  /* background-color: #e0e0e0; */
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  overflow: hidden;
}

.media-details {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.media-title {
  margin: 0;
  font-size: clamp(2rem, 4vw, 2.75rem);
  line-height: 1;
  font-weight: 300;
  color: #161616;
}

.author-type-row {
  display: flex;
  gap: 12px;
  padding: 0;
  margin: 0.5rem 0 1rem 0;
}

.author-text {
  color: #525252;
}

.visibility-chip {
  font-size: 12px;
  color: #161616;
  background: #f3f3f3;
  padding: 4px 8px;
  border: 1px solid #dedede;
}

.media-description,
.data-list {
  padding-top: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e0e0e0;
}

.detail-list-item {
  text-transform: capitalize;
}

</style>
