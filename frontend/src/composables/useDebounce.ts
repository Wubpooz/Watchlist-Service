import { ref, watch, onUnmounted, type Ref } from 'vue';

/**
 * Debounces a reactive ref value.
 *
 * Returns:
 *  - `debouncedValue`: updated only after `delay` ms of silence
 *  - `isPending`:      true while the timer is running (user typed, network call not yet triggered)
 *  - `cancel`:         manually cancel the pending timer (e.g. on unmount or explicit reset)
 *
 * Usage:
 *   const { debouncedValue, isPending } = useDebounce(searchQuery, 300);
 *   watch(debouncedValue, () => fetchResults());
 */
export function useDebounce<T>(source: Ref<T>, delay = 300) {
  const debouncedValue = ref(source.value) as Ref<T>;
  const isPending = ref(false);
  let timer: ReturnType<typeof setTimeout> | null = null;

  const cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    isPending.value = false;
  };

  const flush = () => {
    cancel();
    debouncedValue.value = source.value;
  };

  watch(source, (newVal) => {
    cancel();

    // Empty string → reset immediately, no delay needed.
    if (typeof newVal === 'string' && !newVal.trim()) {
      debouncedValue.value = newVal;
      return;
    }

    isPending.value = true;
    timer = setTimeout(() => {
      debouncedValue.value = newVal;
      isPending.value = false;
      timer = null;
    }, delay);
  }, { flush: 'sync' });

  onUnmounted(cancel);

  return { debouncedValue, isPending, cancel, flush };
}
