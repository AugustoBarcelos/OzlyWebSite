import { ExternalLinkIcon } from '@/components/Icons';
import { Collapsible } from '@/components/Collapsible';

export interface IntegrationStubProps {
  title: string;
  description: string;
  steps: string[];
  ctaLabel: string;
  ctaHref: string;
  envVars?: string[];
  icon?: string;
}

/**
 * Reusable card for a not-yet-wired marketing integration. Tells the admin
 * exactly what credentials we need and where to get them — so when they're
 * ready, they paste a token, we plug the wire, and the placeholder turns
 * into real charts.
 *
 * Collapsed by default — the steps + env vars are useful when you're actually
 * wiring an integration, not while skimming the page.
 */
export function IntegrationStub({
  title,
  description,
  steps,
  ctaLabel,
  ctaHref,
  envVars,
  icon,
}: IntegrationStubProps) {
  return (
    <Collapsible
      icon={icon}
      title={title}
      subtitle={description}
      meta={
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
          Pending
        </span>
      }
    >
      <ol className="space-y-1.5 text-xs text-navy-600">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2">
            <span className="font-mono text-navy-300">{i + 1}.</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      {envVars && envVars.length > 0 && (
        <div className="mt-4 rounded-md bg-navy-50 p-2.5">
          <div className="text-[10px] font-medium uppercase tracking-wide text-navy-400">
            Env vars expected
          </div>
          <div className="mt-1 space-y-0.5">
            {envVars.map((v) => (
              <code key={v} className="block font-mono text-[11px] text-navy-700">
                {v}
              </code>
            ))}
          </div>
        </div>
      )}
      <a
        href={ctaHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-700"
      >
        {ctaLabel}
        <ExternalLinkIcon className="h-3 w-3" />
      </a>
    </Collapsible>
  );
}
