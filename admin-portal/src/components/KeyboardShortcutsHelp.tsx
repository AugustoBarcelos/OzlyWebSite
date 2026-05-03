import { useEffect, useState } from 'react';
import { CommandIcon, XIcon } from './Icons';

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{ keys: string[]; label: string }>;
}

const GROUPS: ShortcutGroup[] = [
  {
    title: 'Navegação',
    shortcuts: [
      { keys: ['⌘', 'K'], label: 'Abrir command palette (busca + ações)' },
      { keys: ['g', 'c'], label: 'Cockpit' },
      { keys: ['g', 'i'], label: 'Inbox' },
      { keys: ['g', 'g'], label: 'Growth' },
      { keys: ['g', 'm'], label: 'Marketing Studio' },
      { keys: ['g', 'f'], label: 'Finance' },
      { keys: ['g', 'p'], label: 'Product' },
      { keys: ['g', 'u'], label: 'Users' },
      { keys: ['g', 'o'], label: 'Operations' },
      { keys: ['g', 't'], label: 'Tech' },
    ],
  },
  {
    title: 'Engineer mode',
    shortcuts: [
      { keys: ['r'], label: 'Toggle Raw Data panels (mostra RPC payloads)' },
    ],
  },
  {
    title: 'Outros',
    shortcuts: [
      { keys: ['?'], label: 'Mostrar este painel' },
      { keys: ['Esc'], label: 'Fechar palette / drawer / modal' },
    ],
  },
];

export function KeyboardShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onEsc);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-navy-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="ozly-card relative z-10 w-full max-w-lg overflow-hidden bg-white">
        <div className="flex items-center justify-between border-b border-navy-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <CommandIcon className="h-4 w-4 text-brand-600" />
            <h2 className="text-sm font-semibold text-navy-700">Atalhos de teclado</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-navy-300 hover:bg-navy-50 hover:text-navy-500"
            aria-label="Fechar"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-4 py-3">
          {GROUPS.map((group) => (
            <div key={group.title} className="mb-4 last:mb-0">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-navy-300">
                {group.title}
              </h3>
              <ul className="space-y-1.5">
                {group.shortcuts.map((s) => (
                  <li key={s.label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-navy-600">{s.label}</span>
                    <span className="flex items-center gap-1">
                      {s.keys.map((k, i) => (
                        <span key={`${s.label}-${i}`} className="flex items-center gap-1">
                          {i > 0 && <span className="text-[10px] text-navy-300">→</span>}
                          <kbd className="rounded border border-navy-100 bg-navy-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-navy-700">
                            {k}
                          </kbd>
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-navy-50 px-4 py-2 text-[11px] text-navy-400">
          Atalhos de duas teclas (ex: <kbd className="rounded border border-navy-100 px-1 font-mono">g</kbd>{' '}
          <kbd className="rounded border border-navy-100 px-1 font-mono">c</kbd>) precisam ser pressionados em
          sequência rápida (até 800ms).
        </div>
      </div>
    </div>
  );
}

/**
 * Registers `?` shortcut to open the help modal. Mount once in Layout.
 */
export function useKeyboardHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        (target as HTMLElement | null)?.isContentEditable;
      if (isInput) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // `?` is shift+/ on US layout — accept either
      if (e.key === '?') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, []);

  return { open, setOpen };
}
