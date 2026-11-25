import { useEffect, useState } from 'react';
import { Info, X } from 'lucide-react';

/** App-wide banner for short server notices, e.g. "this demo is read-only". */
export default function Notice() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onNotice = (e: Event) => {
      setMessage((e as CustomEvent<string>).detail);
      clearTimeout(timer);
      timer = setTimeout(() => setMessage(null), 5000);
    };
    window.addEventListener('bt:notice', onNotice);
    return () => { window.removeEventListener('bt:notice', onNotice); clearTimeout(timer); };
  }, []);

  if (!message) return null;
  return (
    <div role="status" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)] flex items-start gap-2 px-4 py-3 rounded-lg text-sm fade-in"
      style={{ background: '#0A0A0B', color: '#F5F1E8', border: '1px solid rgba(201,152,44,0.5)', boxShadow: 'var(--shadow-lg)' }}>
      <Info size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#E0BC63' }} />
      <span className="flex-1">{message}</span>
      <button onClick={() => setMessage(null)} aria-label="Dismiss" style={{ color: 'rgba(245,241,232,0.6)' }}>
        <X size={14} />
      </button>
    </div>
  );
}
