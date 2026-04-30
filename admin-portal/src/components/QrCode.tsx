import { useState } from 'react';

interface Props {
  /** Conteúdo a codificar no QR (URL completa). */
  data: string;
  /** Largura/altura em px. Default 200. */
  size?: number;
  /** Texto alt. */
  alt?: string;
}

/**
 * QR code via API pública qrserver.com — zero dependências.
 *
 * Útil pra admin gerar QR pra afiliado compartilhar. Pra produção em escala,
 * trocar por geração local (lib qrcode-svg ~5KB) é recomendado.
 */
export function QrCode({ data, size = 200, alt = 'QR code' }: Props) {
  const [copied, setCopied] = useState(false);
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(data)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* no-op */
    }
  }

  function downloadPng() {
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-${Date.now()}.png`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <img
        src={url}
        alt={alt}
        width={size}
        height={size}
        className="rounded-lg border border-navy-100 bg-white p-2"
      />
      <div className="w-full break-all rounded-md bg-navy-50/60 px-2 py-1.5 text-center font-mono text-[10px] text-navy-600">
        {data}
      </div>
      <div className="flex w-full gap-1.5">
        <button
          type="button"
          onClick={() => {
            void copyLink();
          }}
          className="flex-1 rounded-md border border-navy-100 bg-white px-2 py-1.5 text-xs font-medium text-navy-600 hover:border-brand-300 hover:text-brand-700"
        >
          {copied ? '✓ Copiado' : 'Copiar link'}
        </button>
        <button
          type="button"
          onClick={downloadPng}
          className="flex-1 rounded-md border border-navy-100 bg-white px-2 py-1.5 text-xs font-medium text-navy-600 hover:border-brand-300 hover:text-brand-700"
        >
          Download PNG
        </button>
      </div>
    </div>
  );
}
