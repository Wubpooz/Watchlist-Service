import { onUnmounted } from 'vue';

/**
 * Manages a single AbortController so that only one request is alive at a time.
 *
 * Pattern:
 *   const { getSignal } = useAbortController();
 *
 *   async function fetchData() {
 *     const signal = getSignal();     // cancels the previous request, returns a fresh signal
 *     try {
 *       const res = await fetch(url, { signal });
 *       // handle response...
 *     } catch (err: any) {
 *       if (err?.name === 'AbortError') return; // superseded — do nothing
 *       // handle real errors...
 *     } finally {
 *       if (!signal.aborted) isLoading.value = false; // skip if superseded
 *     }
 *   }
 *
 * Why `signal.aborted` in `finally`:
 *   `finally` always runs, even after AbortError. Without the guard, the
 *   superseded request would set isLoading=false while the replacement is
 *   still in flight, causing a spurious loading-flash in the UI.
 *
 * The controller is aborted automatically when the host component unmounts.
 */
export function useAbortController() {
  let controller: AbortController | null = null;

  /**
   * Abort any in-flight request and return a signal for the next one.
   * Call this at the very top of each fetch function.
   */
  const getSignal = (): AbortSignal => {
    controller?.abort();
    controller = new AbortController();
    return controller.signal;
  };

  /**
   * Cancel the current request immediately (e.g. on user action or unmount).
   */
  const abort = (): void => {
    controller?.abort();
    controller = null;
  };

  // Auto-cancel when the component that called this composable is destroyed.
  onUnmounted(abort);

  return { getSignal, abort };
}
