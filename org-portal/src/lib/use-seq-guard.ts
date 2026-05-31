// useSeqGuard — stale-response race protection.
//
// Many of our list/page components fire async fetches that race when:
//   • the user switches org in the sidebar
//   • the user signs out then back in
//   • the user changes a filter rapidly
//   • React StrictMode double-invokes effects in dev
//
// Without protection, the slower in-flight response for state A lands and
// overwrites state B that was already committed — leaking cross-tenant data
// (most critically, invoice rows from Org A bleeding into Org B's Inbox).
//
// Usage:
//   const seq = useSeqGuard();
//   const load = useCallback(async () => {
//     const token = seq.start();
//     const { data } = await supabase.rpc(...);
//     if (!seq.isCurrent(token)) return;   // bail — newer call already fired
//     setRows(data);
//   }, [seq, ...]);
//
// On unmount the guard auto-invalidates so post-unmount setState is also
// blocked.

import { useEffect, useMemo, useRef } from 'react';

export interface SeqGuard {
  /** Increment the sequence counter and return a token for THIS call. */
  start(): number;
  /** True iff the supplied token is still the latest. */
  isCurrent(token: number): boolean;
  /** Manually invalidate (e.g. on a filter change that should abort in-flight). */
  bump(): void;
}

export function useSeqGuard(): SeqGuard {
  const counterRef = useRef(0);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      // Bump on unmount so any pending check returns false.
      counterRef.current = -1;
    };
  }, []);

  // Stable identity so callers can include in dep arrays without re-renders.
  return useMemo<SeqGuard>(() => ({
    start: () => {
      counterRef.current += 1;
      return counterRef.current;
    },
    isCurrent: (token: number) => aliveRef.current && counterRef.current === token,
    bump: () => { counterRef.current += 1; },
  }), []);
}
