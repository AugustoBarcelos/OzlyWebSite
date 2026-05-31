import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSeqGuard } from './use-seq-guard';

describe('useSeqGuard', () => {
  it('returns true for the latest token', () => {
    const { result } = renderHook(() => useSeqGuard());
    const t1 = result.current.start();
    expect(result.current.isCurrent(t1)).toBe(true);
  });

  it('invalidates prior tokens when a newer start fires', () => {
    const { result } = renderHook(() => useSeqGuard());
    const t1 = result.current.start();
    const t2 = result.current.start();
    expect(result.current.isCurrent(t1)).toBe(false);
    expect(result.current.isCurrent(t2)).toBe(true);
  });

  it('manual bump() invalidates all prior tokens', () => {
    const { result } = renderHook(() => useSeqGuard());
    const t1 = result.current.start();
    act(() => { result.current.bump(); });
    expect(result.current.isCurrent(t1)).toBe(false);
  });

  it('invalidates after unmount so post-unmount setState is blocked', () => {
    const { result, unmount } = renderHook(() => useSeqGuard());
    const t1 = result.current.start();
    expect(result.current.isCurrent(t1)).toBe(true);
    unmount();
    expect(result.current.isCurrent(t1)).toBe(false);
  });

  it('returns stable identity across re-renders (safe for dep arrays)', () => {
    const { result, rerender } = renderHook(() => useSeqGuard());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
