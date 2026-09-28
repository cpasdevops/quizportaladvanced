import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, Download, ExternalLink, QrCode as QrIcon } from 'lucide-react';

interface QRCodeDisplayProps {
  value: string;
  code: string;
  title?: string;
  size?: number;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  code,
  title = 'Scan to Join Quiz',
  size = 240,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        value,
        {
          width: size,
          margin: 2,
          color: {
            dark: '#1e1b4b', // deep indigo
            light: '#ffffff',
          },
        },
        (error) => {
          if (!error && canvasRef.current) {
            setDataUrl(canvasRef.current.toDataURL('image/png'));
          }
        }
      );
    }
  }, [value, size]);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `quiz-${code}-qr.png`;
    a.click();
  };

  return (
    <div className="flex flex-col items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold mb-3 text-sm uppercase tracking-wider">
        <QrIcon className="w-4 h-4" />
        {title}
      </div>

      <div className="p-3 bg-white rounded-xl shadow-inner border border-slate-200">
        <canvas ref={canvasRef} className="rounded-lg" />
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Session Code</p>
        <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-4 py-2 rounded-xl">
          <span className="font-mono text-2xl font-black text-indigo-700 dark:text-indigo-300 tracking-widest">
            {code}
          </span>
          <button
            onClick={copyCode}
            title="Copy code"
            className="p-1.5 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded-lg text-indigo-600 dark:text-indigo-400 transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="mt-4 flex gap-2 w-full">
        <button
          onClick={copyCode}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy Code'}
        </button>

        <button
          onClick={downloadQR}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-lg transition"
        >
          <Download className="w-3.5 h-3.5" />
          Save QR
        </button>
      </div>

      <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500 text-center break-all max-w-[260px]">
        Students can open camera app or enter code directly.
      </p>
    </div>
  );
};
