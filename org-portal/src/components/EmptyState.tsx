import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="ozly-card flex flex-col items-center gap-3 px-6 py-16 text-center">
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-50 text-navy-300">
          {icon}
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-navy-700">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-sm text-navy-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}
