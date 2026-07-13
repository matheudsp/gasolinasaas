/**
 * Marca Gasolina Cloud: nuvem com gota de combustível.
 * Roxo da marca por padrão; um tom mais claro no dark mode para contraste.
 * Fonte canônica dos SVGs: brand/ na raiz do monorepo.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="10 8 108 96"
      className={className}
      role="img"
      aria-label="Gasolina Cloud"
    >
      <g className="fill-[#7C3AED] dark:fill-[#8B5CF6]">
        <circle cx="42" cy="52" r="20" />
        <circle cx="66" cy="40" r="24" />
        <circle cx="90" cy="56" r="16" />
        <rect x="42" y="52" width="48" height="20" />
        <path d="M64 62 C 69 72 74 77.5 74 83 A 10 10 0 1 1 54 83 C 54 77.5 59 72 64 62 Z" />
      </g>
    </svg>
  );
}
