import { Card, Text } from '@tremor/react';

/**
 * Placeholder card para rotas em construção (v0). Mostra título + descrição
 * + bullets do que está vindo, sem prometer prazo.
 */
export function FeaturePlaceholder({
  emoji,
  what,
  bullets,
}: {
  emoji: string;
  what: string;
  bullets: ReadonlyArray<string>;
}) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{emoji}</span>
        <div className="min-w-0 flex-1">
          <Text className="font-medium text-navy-700">{what}</Text>
          <Text className="mt-1 text-xs text-navy-400">
            Em construção — área reservada na navegação. Funcionalidade chega quando o backend de posts for plugado.
          </Text>
          <ul className="mt-3 space-y-1.5 text-xs text-navy-500">
            {bullets.map((b) => (
              <li key={b} className="flex gap-2">
                <span className="mt-0.5 text-navy-300">•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
