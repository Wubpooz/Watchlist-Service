<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';

interface Props {
  modelValue: boolean;
  title?: string;
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  closeOnOverlayClick: true,
  showCloseButton: true,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'close'): void;
}>();

const close = () => {
  emit('update:modelValue', false);
  emit('close');
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.modelValue) {
    close();
  }
};

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}, { immediate: true });

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="modelValue"
        class="modal-overlay"
        role="dialog"
        aria-modal="true"
        @click="closeOnOverlayClick && close()"
      >
        <div class="modal-container" @click.stop>
          <!-- Header -->
          <header class="modal-header">
            <slot name="header">
              <h2 class="modal-title">{{ title || 'Modal' }}</h2>
            </slot>
            <button
              v-if="showCloseButton"
              type="button"
              class="modal-close-btn"
              aria-label="Close modal"
              @click="close"
            >
              <span class="material-symbols-outlined">close</span>
            </button>
          </header>

          <!-- Body -->
          <main class="modal-body">
            <slot></slot>
          </main>

          <!-- Footer -->
          <footer v-if="$slots.footer" class="modal-footer">
            <slot name="footer"></slot>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1.5rem;
  backdrop-filter: blur(1px);
}

.modal-container {
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  width: 100%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: calc(100vh - 3rem);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e0e0e0;
  background-color: #f4f4f4;
}

.modal-title {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 600;
  font-size: 1.125rem;
  color: #161616;
  margin: 0;
}

.modal-close-btn {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  color: #525252;
  transition: background-color 0.2s, color 0.2s;
}

.modal-close-btn:hover {
  background-color: #e5e5e5;
  color: #161616;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  font-size: 14px;
  color: #525252;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e0e0e0;
  background-color: #f4f4f4;
}

/* Animations */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-active .modal-container,
.modal-fade-leave-active .modal-container {
  transition: transform 0.2s cubic-bezier(0, 0, 0.2, 1);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .modal-container {
  transform: scale(0.98) translateY(8px);
}

.modal-fade-leave-to .modal-container {
  transform: scale(0.98) translateY(8px);
}
</style>
