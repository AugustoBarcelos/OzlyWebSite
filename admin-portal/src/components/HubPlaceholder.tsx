import { Link } from 'react-router-dom';
import type { ComponentType, SVGProps } from 'react';
import { ChevronRightIcon, SparklesIcon } from './Icons';

type IconComponent = ComponentType<Omit<SVGProps<SVGSVGElement>, 'children'>>;

export interface HubLink {
  label: string;
  to: string;
  description?: string;
  icon?: IconComponent;
  /** Render badge "Coming W3", "WIP", etc */
  status?: 'live' | 'wip' | 'parte2';
}

interface HubPlaceholderProps {
  title: string;
  subtitle?: string;
  /** ETA on the roadmap, e.g. "Wave 5 — Finance Hub" */
  wave?: string;
  /** Hub icon (optional) */
  icon?: IconComponent;
  /** Sub-pages or related areas */
  links?: ReadonlyArray<HubLink>;
  /** Optional KPI strip slot — caller renders cards */
  children?: React.ReactNode;
}

const STATUS_LABEL: Record<NonNullable<HubLink['status']>, string> = {
  live: '',
  wip: 'WIP',
  parte2: 'Parte 2',
};

const STATUS_BADGE_CLASS: Record<NonNullable<HubLink['status']>, string> = {
  live: '',
  wip: 'bg-amber-50 text-amber-700 border border-amber-200',
  parte2: 'bg-navy-50 text-navy-500 border border-navy-100',
};

/**
 * Reusable hub landing component used across the new IA. Shows title/subtitle,
 * optional KPI strip via children, and a list of clickable sub-pages.
 *
 * The empty state is intentional — when a hub doesn't have full content yet
 * we want it visible in the sidebar but explanatory in the body.
 */
export function HubPlaceholder({
  title,
  subtitle,
  wave,
  icon: Icon,
  links = [],
  children,
}: HubPlaceholderProps) {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-3">
          {Icon && (
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md"
              style={{
                background:
                  'linear-gradient(135deg, var(--color-brand-500), var(--color-lime-400))',
              }}
            >
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">{title}</h1>
            {subtitle && (
              <p className="mt-0.5 text-sm text-navy-400">{subtitle}</p>
            )}
          </div>
        </div>
        {wave && (
          <span className="self-start rounded-full border border-navy-100 bg-navy-50 px-3 py-1 text-[11px] font-medium text-navy-500 md:self-end">
            {wave}
          </span>
        )}
      </header>

      {children && <div>{children}</div>}

      {links.length > 0 && (
        <div>
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-navy-300">
            Sub-pages
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {links.map((link) => {
              const LinkIcon = link.icon;
              const status = link.status ?? 'live';
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className="ozly-card group flex items-start gap-3 bg-white p-4 transition-all hover:border-brand-200 hover:shadow-md"
                >
                  {LinkIcon && (
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100">
                      <LinkIcon className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-navy-700">
                        {link.label}
                      </span>
                      {status !== 'live' && (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_BADGE_CLASS[status]}`}
                        >
                          {STATUS_LABEL[status]}
                        </span>
                      )}
                    </div>
                    {link.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-navy-400">
                        {link.description}
                      </p>
                    )}
                  </div>
                  <ChevronRightIcon className="mt-1 h-4 w-4 shrink-0 text-navy-200 transition-colors group-hover:text-brand-500" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Coming-soon empty state when there are no links yet */}
      {links.length === 0 && !children && (
        <div className="ozly-card flex flex-col items-center gap-3 bg-white p-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <SparklesIcon className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-navy-700">Coming soon</h3>
            <p className="max-w-md text-sm text-navy-400">
              {wave
                ? `Esta seção será habilitada em ${wave}.`
                : 'Esta seção está no roadmap.'}{' '}
              O esqueleto está pronto, falta apenas o conteúdo e/ou integração externa.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
