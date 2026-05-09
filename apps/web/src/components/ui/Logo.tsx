interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 32, className = '' }: LogoMarkProps) {
  const inner = Math.round(size * 0.52);
  return (
    <div
      className={`rounded-xl bg-gradient-to-br from-brand-400 via-brand-500 to-violet-600 flex items-center justify-center shrink-0 shadow-lg shadow-brand-900/30 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={inner} height={inner} viewBox="0 0 18 14" fill="none">
        <rect x="0" y="6" width="4" height="8" rx="1.2" fill="white" fillOpacity="0.9" />
        <rect x="7" y="3" width="4" height="11" rx="1.2" fill="white" />
        <rect x="14" y="0" width="4" height="14" rx="1.2" fill="white" fillOpacity="0.85" />
      </svg>
    </div>
  );
}

interface LogoProps {
  markSize?: number;
  textClass?: string;
  showText?: boolean;
  dark?: boolean;
}

export function Logo({ markSize = 32, textClass = '', showText = true, dark = false }: LogoProps) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={markSize} />
      {showText && (
        <span className={`font-semibold tracking-tight leading-none ${dark ? 'text-white' : 'text-slate-900'} ${textClass}`}>
          Finanzapp
        </span>
      )}
    </div>
  );
}
