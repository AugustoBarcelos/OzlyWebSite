import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

interface Props {
  /** Conteúdo a codificar no QR (URL completa). */
  data: string;
  /** Largura/altura em px. Default 200. */
  size?: number;
  /** Texto alt. */
  alt?: string;
}

/**
 * QR code renderizado localmente via lib `qrcode` (~6KB).
 * Sem dependência de API externa — funciona offline e respeita CSP estrito.
 */
export function QrCode({ data, size = 200, alt = 'QR code' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, data, {
      width: size,
      margin: 2,
      color: { dark: '#0F172A', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    })
      .then(() => {
        if (!alive || !canvasRef.current) return;
        setDataUrl(canvasRef.current.toDataURL('image/png'));
        setErr(null);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : 'QR render failed');
      });
    return () => {
      alive = false;
    };
  }, [data, size]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — silent */
    }
  }

  function downloadPng() {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qr-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        aria-label={alt}
        className="rounded-lg border border-navy-100 bg-white p-2"
        width={size}
        height={size}
      />
      {err && (
        <div className="text-xs text-rose-600">QR error: {err}</div>
      )}
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
          disabled={!dataUrl}
          className="flex-1 rounded-md border border-navy-100 bg-white px-2 py-1.5 text-xs font-medium text-navy-600 hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
        >
          Download PNG
        </button>
      </div>
    </div>
  );
}
