<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

type MediaType = 'FILM' | 'SERIES' | 'BOOK' | 'ARTICLE' | 'OTHER';

// === Form state ===============================================================

const title = ref('');
const mediaType = ref<MediaType | ''>('');
const directorAuthor = ref('');
const releaseYear = ref('');
const url = ref('');
const description = ref('');
const tagInput = ref('');
const tags = ref<string[]>([]);
const platforms = ref<string[]>([]);

const isSubmitting = ref(false);
const submitError = ref('');

// === Options ==================================================================

const TYPE_OPTIONS: { value: MediaType; label: string; icon: string }[] = [
  { value: 'FILM',    label: 'Movie',     icon: 'movie' },
  { value: 'SERIES',  label: 'TV Series', icon: 'tv' },
  { value: 'BOOK',    label: 'Book',      icon: 'menu_book' },
  { value: 'ARTICLE', label: 'Article',   icon: 'article' },
  { value: 'OTHER',   label: 'Other',     icon: 'category' },
];

const PLATFORM_OPTIONS = ['Netflix', 'Amazon Prime', 'Apple TV+', 'Spotify'];

// === Tag handling =============================================================

const commitTag = () => {
  const trimmed = tagInput.value.trim().replace(/,+$/, '');
  if (trimmed && !tags.value.includes(trimmed)) {
    tags.value.push(trimmed);
  }
  tagInput.value = '';
};

const onTagKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    commitTag();
  }
  if (e.key === 'Backspace' && !tagInput.value && tags.value.length > 0) {
    tags.value.pop();
  }
};

const removeTag = (tag: string) => {
  tags.value = tags.value.filter(t => t !== tag);
};

// === Platform handling ========================================================

const togglePlatform = (platform: string) => {
  const idx = platforms.value.indexOf(platform);
  if (idx === -1) platforms.value.push(platform);
  else platforms.value.splice(idx, 1);
};

// === Validation ===============================================================

const isValid = computed(() => title.value.trim().length > 0 && mediaType.value !== '');

// === Submit ===================================================================

const handleSubmit = async () => {
  if (!isValid.value) return;
  isSubmitting.value = true;
  submitError.value = '';

  try {
    const token = authStore.authToken;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const body: Record<string, unknown> = {
      title: title.value.trim(),
      type: mediaType.value,
    };
    if (directorAuthor.value.trim())  body.directorAuthor = directorAuthor.value.trim();
    if (description.value.trim())     body.description = description.value.trim();
    if (releaseYear.value)            body.releaseDate = `${releaseYear.value}-01-01T00:00:00.000Z`;
    if (tags.value.length)            body.tags = tags.value;
    if (platforms.value.length)       body.platforms = platforms.value;
    if (url.value.trim())             body.url = url.value.trim();

    const res = await fetch(
      `${import.meta.env.VITE_API_URL ?? ''}/api/media`,
      { method: 'POST', headers, credentials: 'include', body: JSON.stringify(body) }
    );

    if (res.ok || res.status === 201) {
      router.push({ name: 'Catalog' });
    } else {
      const data = await res.json().catch(() => ({}));
      submitError.value = (data as { message?: string })?.message ?? 'Failed to create media item.';
    }
  } catch {
    submitError.value = 'Network error. Please try again.';
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="add-media-page">

    <!-- == Page header ============================================ -->
    <div class="page-header">
      <button class="back-link" type="button" @click="router.push({ name: 'Catalog' })">
        <span class="material-symbols-outlined">arrow_back</span>
        Media Catalog
      </button>
      <h1 class="page-title">Add new media to catalog</h1>
      <p class="page-subtitle">
        Enter the details below to register a new title into the enterprise watchlist.
      </p>
    </div>

    <!-- == Form card ============================================== -->
    <div class="form-card">
      <form novalidate @submit.prevent="handleSubmit">

        <!-- Error banner -->
        <div v-if="submitError" class="error-banner">
          <span class="material-symbols-outlined" style="font-size:18px">error</span>
          <span>{{ submitError }}</span>
          <button class="banner-close" type="button" aria-label="Dismiss" @click="submitError = ''">
            <span class="material-symbols-outlined" style="font-size:16px">close</span>
          </button>
        </div>

        <!-- == Two-column top fields ================================ -->
        <div class="form-grid">

          <!-- Title -->
          <div class="field">
            <label class="field-label" for="media-title">
              Title <span class="field-required">*</span>
            </label>
            <input
              id="media-title"
              v-model="title"
              type="text"
              class="field-input"
              placeholder="e.g., The Matrix"
              maxlength="300"
              required
            />
          </div>

          <!-- Type -->
          <div class="field">
            <label class="field-label" for="media-type">
              Type <span class="field-required">*</span>
            </label>
            <div class="select-wrapper">
              <select
                id="media-type"
                v-model="mediaType"
                class="field-input field-select"
                required
              >
                <option value="" disabled hidden>Select media type</option>
                <option v-for="opt in TYPE_OPTIONS" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <span class="material-symbols-outlined select-arrow">expand_more</span>
            </div>
          </div>

          <!-- Author / Director -->
          <div class="field">
            <label class="field-label" for="media-creator">Author / Director</label>
            <input
              id="media-creator"
              v-model="directorAuthor"
              type="text"
              class="field-input"
              placeholder="e.g., Lana Wachowski"
              maxlength="200"
            />
          </div>

          <!-- Release Year -->
          <div class="field">
            <label class="field-label" for="media-year">Release Year</label>
            <input
              id="media-year"
              v-model="releaseYear"
              type="number"
              class="field-input"
              placeholder="YYYY"
              min="1800"
              max="2100"
            />
          </div>

        </div>

        <!-- == Cover Image URL ====================================== -->
        <div class="field">
          <label class="field-label" for="media-url">Cover Image URL</label>
          <input
            id="media-url"
            v-model="url"
            type="text"
            class="field-input"
            placeholder="e.g., https://example.com/poster.jpg"
            maxlength="1000"
          />
        </div>

        <!-- == Description ========================================== -->
        <div class="field">
          <label class="field-label" for="media-description">Description</label>
          <textarea
            id="media-description"
            v-model="description"
            class="field-input field-textarea"
            placeholder="Brief synopsis or notes…"
            rows="3"
            maxlength="1000"
          />
          <p class="field-hint">{{ description.length }}&thinsp;/&thinsp;1000</p>
        </div>

        <!-- == Tags ================================================= -->
        <div class="field">
          <label class="field-label" for="tags-input">Genres / Tags</label>
          <div class="tag-field">
            <span v-for="tag in tags" :key="tag" class="tag-token">
              {{ tag }}
              <span class="material-symbols-outlined tag-remove" @click="removeTag(tag)">close</span>
            </span>
            <input
              id="tags-input"
              v-model="tagInput"
              type="text"
              class="tag-input"
              placeholder="Type and press Enter…"
              @keydown="onTagKeydown"
              @blur="commitTag"
            />
          </div>
          <p class="field-hint">Separate multiple tags with commas or the Enter key.</p>
        </div>

        <!-- == Platforms ============================================ -->
        <div class="field">
          <fieldset class="platform-fieldset">
            <legend class="field-label">Availability / Platform</legend>
            <div class="platform-grid">
              <label
                v-for="platform in PLATFORM_OPTIONS"
                :key="platform"
                class="platform-option"
              >
                <input
                  type="checkbox"
                  class="platform-checkbox"
                  :value="platform"
                  :checked="platforms.includes(platform)"
                  @change="togglePlatform(platform)"
                />
                {{ platform }}
              </label>
            </div>
          </fieldset>
        </div>

        <!-- == Divider + actions ==================================== -->
        <hr class="form-divider" />

        <div class="form-actions">
          <button
            type="button"
            class="btn-ghost"
            @click="router.push({ name: 'Catalog' })"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="btn-primary"
            :disabled="isSubmitting || !isValid"
          >
            <span v-if="isSubmitting" class="material-symbols-outlined btn-spinner">autorenew</span>
            {{ isSubmitting ? 'Creating…' : 'Create media item' }}
            <span v-if="!isSubmitting" class="material-symbols-outlined btn-icon">add</span>
          </button>
        </div>

      </form>
    </div>
  </div>
</template>

<style scoped>
/* == Page wrapper ========================================== */
.add-media-page {
  max-width: 860px;
  margin: 0 auto;
  padding: 32px 0 64px;
  font-family: 'IBM Plex Sans', sans-serif;
}

/* == Back link + header ==================================== */
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: #0f62fe;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 13px;
  letter-spacing: 0.16px;
  cursor: pointer;
  padding: 0;
  margin-bottom: 20px;
}

.back-link:hover { color: #0043ce; }

.back-link .material-symbols-outlined { font-size: 18px; }

.page-title {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 300;
  font-size: 2.25rem;
  line-height: 1.2;
  color: #161616;
  letter-spacing: -0.01em;
  margin: 0 0 8px;
}

.page-subtitle {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 13px;
  color: #525252;
  letter-spacing: 0.16px;
  margin: 0 0 32px;
}

/* == Form card ============================================= */
.form-card {
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  padding: 32px;
}

/* == Two-column grid ======================================= */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

@media (max-width: 640px) {
  .form-grid { grid-template-columns: 1fr; }
}

/* == Field ================================================= */
.field {
  display: flex;
  flex-direction: column;
  margin-bottom: 24px;
}

.field-label {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 12px;
  font-weight: 400;
  color: #525252;
  letter-spacing: 0.16px;
  margin-bottom: 4px;
}

.field-required {
  color: #da1e28;
  margin-left: 2px;
}

.field-hint {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 12px;
  color: #525252;
  letter-spacing: 0.16px;
  margin-top: 4px;
}

/* == Carbon-style input ==================================== */
.field-input {
  background-color: #f4f4f4;
  border: none;
  border-bottom: 1px solid #737687;
  border-radius: 0;
  padding: 12px 16px;
  width: 100%;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  color: #161616;
  letter-spacing: 0.16px;
  box-sizing: border-box;
  transition: outline 0.1s, border-bottom-color 0.1s;
  outline: 2px solid transparent;
  outline-offset: -2px;
}

.field-input:focus {
  outline-color: #0f62fe;
  border-bottom-color: transparent;
}

.field-input::placeholder { color: #a8a8a8; }

/* Remove number spinner arrows */
.field-input[type='number'] { appearance: textfield; }
.field-input[type='number']::-webkit-outer-spin-button,
.field-input[type='number']::-webkit-inner-spin-button { display: none; }

.field-textarea {
  resize: vertical;
  min-height: 88px;
  line-height: 1.5;
}

/* == Select wrapper ======================================== */
.select-wrapper {
  position: relative;
}

.field-select {
  appearance: none;
  padding-right: 40px;
  cursor: pointer;
}

.select-arrow {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 20px;
  color: #161616;
  pointer-events: none;
}

/* == Tag field ============================================= */
.tag-field {
  background-color: #f4f4f4;
  border-bottom: 1px solid #737687;
  padding: 8px 12px;
  min-height: 44px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  cursor: text;
  transition: outline 0.1s, border-bottom-color 0.1s;
  outline: 2px solid transparent;
  outline-offset: -2px;
}

.tag-field:focus-within {
  outline-color: #0f62fe;
  border-bottom-color: transparent;
}

.tag-token {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background-color: #e0e0e0;
  color: #161616;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 12px;
  letter-spacing: 0.16px;
  padding: 3px 8px;
  white-space: nowrap;
}

.tag-remove {
  font-size: 14px;
  color: #525252;
  cursor: pointer;
  line-height: 1;
}

.tag-remove:hover { color: #161616; }

.tag-input {
  background: transparent;
  border: none;
  outline: none;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  color: #161616;
  flex: 1;
  min-width: 120px;
  padding: 2px 0;
}

.tag-input::placeholder { color: #a8a8a8; }

/* == Platform checkboxes =================================== */
.platform-fieldset {
  border: none;
  padding: 0;
  margin: 0;
}

.platform-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-top: 8px;
}

@media (max-width: 640px) {
  .platform-grid { grid-template-columns: repeat(2, 1fr); }
}

.platform-option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  color: #161616;
  letter-spacing: 0.16px;
  cursor: pointer;
  user-select: none;
}

.platform-checkbox {
  appearance: none;
  width: 16px;
  height: 16px;
  min-width: 16px;
  border: 1px solid #161616;
  background-color: transparent;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
}

.platform-checkbox:checked {
  background-color: #161616;
}

.platform-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 5px;
  height: 9px;
  border: solid #ffffff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.platform-checkbox:focus {
  outline: 2px solid #0f62fe;
  outline-offset: 1px;
}

/* == Error banner ========================================== */
.error-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background-color: #ffd7d9;
  border-left: 3px solid #da1e28;
  color: #750000;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 13px;
  margin-bottom: 24px;
}

.banner-close {
  background: none;
  border: none;
  color: #750000;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0;
  margin-left: auto;
}

/* == Divider + actions ===================================== */
.form-divider {
  border: none;
  border-top: 1px solid #e0e0e0;
  margin: 8px 0 24px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}

/* == Buttons =============================================== */
.btn-ghost {
  background-color: transparent;
  color: #0f62fe;
  border: none;
  padding: 14px 16px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  font-weight: 400;
  letter-spacing: 0.16px;
  min-height: 48px;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.btn-ghost:hover {
  background-color: #e5e2e1;
  color: #0043ce;
}

.btn-primary {
  background-color: #0f62fe;
  color: #ffffff;
  border: none;
  padding: 14px 16px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  font-weight: 400;
  letter-spacing: 0.16px;
  min-height: 48px;
  min-width: 180px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
  transition: background-color 0.15s;
}

.btn-primary:hover:not(:disabled) { background-color: #0043ce; }

.btn-primary:disabled {
  background-color: #c6c6c6;
  color: #8d8d8d;
  cursor: not-allowed;
}

.btn-icon { font-size: 18px; }

.btn-spinner {
  font-size: 18px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
</style>
