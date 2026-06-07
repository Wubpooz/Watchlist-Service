import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref, defineComponent, type Ref } from 'vue';
import { mount } from '@vue/test-utils';
import { useDebounce } from '@/composables/useDebounce';

// ─── Test helper ──────────────────────────────────────────────────────────────
//
// useDebounce registers an onUnmounted hook, so it must run inside a Vue
// component context. This helper mounts a minimal wrapper component, exposes
// the composable return value and the source ref to the test.

function setupDebounce(initial: string, delay = 300) {
  const source = ref(initial);
  let composable: ReturnType<typeof useDebounce<string>>;

  const Wrapper = defineComponent({
    setup() {
      composable = useDebounce<string>(source as Ref<string>, delay);
      return {};
    },
    template: '<div />',
  });

  const wrapper = mount(Wrapper);
  return {
    source,
    c: () => composable,   // accessor so tests always read the live object
    wrapper,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  it('exposes the source value immediately as debouncedValue', () => {
    const { c } = setupDebounce('hello');
    expect(c().debouncedValue.value).toBe('hello');
  });

  it('starts with isPending = false', () => {
    const { c } = setupDebounce('hello');
    expect(c().isPending.value).toBe(false);
  });

  // ── Delay behaviour ────────────────────────────────────────────────────────

  it('does not update debouncedValue synchronously when the source changes', () => {
    const { source, c } = setupDebounce('');
    source.value = 'vue';
    // No timers advanced yet — debouncedValue must still be the old value.
    expect(c().debouncedValue.value).toBe('');
  });

  it('updates debouncedValue after the full delay has elapsed', () => {
    const { source, c } = setupDebounce('', 300);
    source.value = 'vue';
    vi.advanceTimersByTime(300);
    expect(c().debouncedValue.value).toBe('vue');
  });

  it('does not update before the delay has fully elapsed', () => {
    const { source, c } = setupDebounce('', 300);
    source.value = 'vue';
    vi.advanceTimersByTime(299);
    expect(c().debouncedValue.value).toBe('');
  });

  // ── Rapid-keystroke behaviour ──────────────────────────────────────────────

  it('discards intermediate values — only the last one fires', () => {
    const { source, c } = setupDebounce('', 300);

    source.value = 'a';
    vi.advanceTimersByTime(100);  // still within the first debounce window

    source.value = 'ab';
    vi.advanceTimersByTime(100);  // restarts the timer

    source.value = 'abc';
    vi.advanceTimersByTime(300);  // the final timer expires

    expect(c().debouncedValue.value).toBe('abc');
  });

  it('does not fire for intermediate values at all', () => {
    const { source, c } = setupDebounce('', 300);

    source.value = 'a';
    vi.advanceTimersByTime(100);
    source.value = 'ab';
    vi.advanceTimersByTime(299); // just before the SECOND timer fires

    expect(c().debouncedValue.value).toBe(''); // still the original
  });

  // ── Empty / whitespace fast-path ───────────────────────────────────────────

  it('fires immediately (no delay) when the source is cleared to an empty string', () => {
    const { source, c } = setupDebounce('vue');
    source.value = '';
    // Zero timers advanced — the value should already be updated.
    expect(c().debouncedValue.value).toBe('');
  });

  it('fires immediately for a whitespace-only string (treated as empty)', () => {
    const { source, c } = setupDebounce('vue');
    source.value = '   ';
    expect(c().debouncedValue.value).toBe('   ');
  });

  // ── isPending ──────────────────────────────────────────────────────────────

  it('sets isPending = true immediately after a keystroke', () => {
    const { source, c } = setupDebounce('');
    source.value = 'x';
    expect(c().isPending.value).toBe(true);
  });

  it('sets isPending = false once the delay expires', () => {
    const { source, c } = setupDebounce('');
    source.value = 'x';
    vi.advanceTimersByTime(300);
    expect(c().isPending.value).toBe(false);
  });

  it('keeps isPending = true if a new keystroke arrives before the delay', () => {
    const { source, c } = setupDebounce('');
    source.value = 'a';
    vi.advanceTimersByTime(150);
    source.value = 'ab';          // resets the timer
    vi.advanceTimersByTime(150);  // only 150 ms into the new window
    expect(c().isPending.value).toBe(true);
  });

  it('does NOT set isPending = true for an empty-string change (fires immediately)', () => {
    const { source, c } = setupDebounce('vue');
    source.value = '';
    // Immediate path: no timer, no pending state.
    expect(c().isPending.value).toBe(false);
  });

  // ── cancel() ──────────────────────────────────────────────────────────────

  it('cancel() stops the pending timer without updating debouncedValue', () => {
    const { source, c } = setupDebounce('');
    source.value = 'vue';
    c().cancel();
    vi.advanceTimersByTime(500); // far past the delay
    expect(c().debouncedValue.value).toBe(''); // unchanged
    expect(c().isPending.value).toBe(false);
  });

  // ── flush() ───────────────────────────────────────────────────────────────

  it('flush() applies the current source value immediately without waiting', () => {
    const { source, c } = setupDebounce('');
    source.value = 'vue';
    c().flush();
    expect(c().debouncedValue.value).toBe('vue');
    expect(c().isPending.value).toBe(false);
  });

  // ── Unmount cleanup ───────────────────────────────────────────────────────

  it('does not update debouncedValue after the component is unmounted', () => {
    const { source, c, wrapper } = setupDebounce('');
    source.value = 'vue';      // starts a 300 ms timer
    wrapper.unmount();         // onUnmounted fires → cancel() called
    vi.advanceTimersByTime(500);
    // The timer was cleared on unmount; debouncedValue must stay at ''
    expect(c().debouncedValue.value).toBe('');
  });

  it('clears isPending on unmount', () => {
    const { source, c, wrapper } = setupDebounce('');
    source.value = 'vue';
    wrapper.unmount();
    expect(c().isPending.value).toBe(false);
  });
});
