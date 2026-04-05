export default function Navbar() {
  return (
    <header
      className="h-12 flex-shrink-0 flex items-center px-6 z-40 relative"
      style={{
        background: 'rgba(8,12,22,0.98)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(24px)',
      }}
    >
      {/* Bottom shimmer line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(34,197,94,0.3) 25%, rgba(34,197,94,0.15) 60%, transparent 100%)',
        }}
      />

      {/* Logo + Name */}
      <div className="flex items-center gap-3.5">
        {/* Logo image */}
        <div
          className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0"
          style={{
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.28)',
            boxShadow: '0 0 18px rgba(34,197,94,0.15)',
          }}
        >
          <img
            src="/favicon.png"
            alt="Midnight Maps logo"
            className="w-full h-full object-cover"
          />
        </div>

        {/* App name */}
        <span
          className="font-bold tracking-tight"
          style={{ fontSize: '18px', color: '#f1f5f9', letterSpacing: '-0.02em' }}
        >
          Midnight Maps
        </span>
      </div>
    </header>
  );
}
