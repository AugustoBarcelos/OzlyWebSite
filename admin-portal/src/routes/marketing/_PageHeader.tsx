import { Title } from '@tremor/react';

/**
 * Título + descrição padrão para páginas dentro de /marketing, /ads e /messaging.
 * Mantém visual consistente com o que GrowthPage tinha antes do split.
 */
export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <Title className="!text-navy-700">{title}</Title>
      {description && (
        <p className="mt-0.5 text-xs text-navy-300">{description}</p>
      )}
    </div>
  );
}
