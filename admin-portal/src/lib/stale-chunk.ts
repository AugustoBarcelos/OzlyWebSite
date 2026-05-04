// Recovers from stale Vite chunks after a redeploy: when a lazy route fails
// to fetch its JS module, the user has the old index.html cached but the
// referenced hashed chunk no longer exists on the server. We force a single
// reload so they pick up the fresh index.html. The session flag prevents an
// infinite reload loop if the chunk is genuinely missing post-reload.

const RELOAD_FLAG = 'admin_portal_stale_chunk_reloaded';

const STALE_CHUNK_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /Unable to preload CSS/i,
];

function isStaleChunkError(message: unknown): boolean {
  if (typeof message !== 'string') return false;
  return STALE_CHUNK_PATTERNS.some((p) => p.test(message));
}

function reloadOnce(): void {
  if (sessionStorage.getItem(RELOAD_FLAG) === '1') return;
  sessionStorage.setItem(RELOAD_FLAG, '1');
  window.location.reload();
}

export function clearStaleChunkFlag(): void {
  sessionStorage.removeItem(RELOAD_FLAG);
}

export function installStaleChunkHandler(): void {
  window.addEventListener('error', (event) => {
    if (isStaleChunkError(event.message)) reloadOnce();
  });
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    if (isStaleChunkError(message)) reloadOnce();
  });
}
