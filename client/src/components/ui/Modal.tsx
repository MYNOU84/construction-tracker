import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  footer?: React.ReactNode;
}

const sizes = {
  sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg',
  xl: 'max-w-xl', '2xl': 'max-w-2xl',
};

export default function Modal({ isOpen, onClose, title, children, size = 'md', footer }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}>
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'var(--bg-overlay)' }} />
      <div className={`relative rounded-t-2xl sm:rounded-2xl w-full ${sizes[size]} max-h-[92vh] sm:max-h-[90vh] flex flex-col fade-in`}
        role="dialog" aria-modal="true" aria-label={title}
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-accent)', boxShadow: 'var(--shadow-lg)' }}>
        <div className="gold-rule absolute top-0 left-6 right-6" aria-hidden="true" />
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="font-display text-xl font-semibold" style={{ color: 'var(--text-1)' }}>{title}</h3>
          <button onClick={onClose} className="btn-ghost !min-h-0 !p-1.5" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="px-5 sm:px-6 py-4 flex flex-wrap items-center justify-end gap-3 flex-shrink-0"
            style={{ borderTop: '1px solid var(--border)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
