export default function LoadingSpinner({ size = 'md', text }: { size?: 'sm' | 'md' | 'lg'; text?: string }) {
  const s = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }[size];
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8">
      <div className={`${s} rounded-full animate-spin`}
        style={{ borderWidth: 2, borderStyle: 'solid', borderColor: 'var(--tint-3)', borderTopColor: 'var(--gold)' }}
        role="status" aria-label={text || 'Loading'} />
      {text && <p className="text-xs uppercase" style={{ color: 'var(--text-3)', letterSpacing: '0.16em' }}>{text}</p>}
    </div>
  );
}

export function PageLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}
