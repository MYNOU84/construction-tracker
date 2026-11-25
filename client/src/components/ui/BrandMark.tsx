// BuildTrack Pro monogram: a gold gable outline on black. Used in the sidebar and on login.
export default function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center flex-shrink-0 rounded-lg"
      style={{ width: size, height: size, background: '#050505', border: '1px solid rgba(201,152,44,0.55)' }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 21V10l9-6 9 6v11" stroke="#C9982C" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 21v-7h6v7" stroke="#E0BC63" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
