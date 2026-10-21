// Objetos de boteco espalhados pela mesa: a 600 suada, o copo americano com colarinho,
// uma porção de amendoim e as tampinhas. Só decoração (aria-hidden, sem clique).

export function TableDecor() {
  return (
    <div className="table-decor" aria-hidden>
      {/* garrafa de 600 + copo americano, canto de cima à direita */}
      <BeerProp className="decor-beer" />
      {/* porção de amendoim no pratinho, canto de baixo à esquerda */}
      <svg className="decor-snack" viewBox="0 0 80 50" width="80" height="50">
        <ellipse cx="40" cy="28" rx="38" ry="18" fill="#000" opacity="0.3" />
        <ellipse cx="40" cy="25" rx="36" ry="17" fill="#ece2cc" />
        <ellipse cx="40" cy="25" rx="27" ry="12" fill="#d8ccb0" />
        {[
          [30, 22],
          [36, 27],
          [43, 21],
          [48, 27],
          [39, 18],
          [33, 30],
          [52, 22],
          [26, 26],
          [45, 31],
        ].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx="3.4" ry="2.4" fill={i % 3 ? '#a8641e' : '#c8843a'} transform={`rotate(${i * 37} ${x} ${y})`} />
        ))}
      </svg>
      {/* tampinhas esquecidas */}
      <svg className="decor-caps" viewBox="0 0 50 30" width="50" height="30">
        <circle cx="12" cy="16" r="8" fill="#c8a868" stroke="#8a6a32" strokeWidth="2" strokeDasharray="2 1.4" />
        <circle cx="34" cy="12" r="8" fill="#9a2a1e" stroke="#6a1a12" strokeWidth="2" strokeDasharray="2 1.4" />
      </svg>
    </div>
  );
}

/** A 600 âmbar (rótulo sem marca) e o copo americano com colarinho. */
export function BeerProp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 70 110" width="70" height="110" aria-hidden>
      <ellipse cx="35" cy="104" rx="32" ry="5" fill="#000" opacity="0.35" />
      {/* garrafa âmbar com rótulo sem marca */}
      <path d="M12 104 V52 Q12 40 18 35 V12 H26 V35 Q32 40 32 52 V104Z" fill="#5a3010" />
      <path d="M14 100 V54 Q14 44 19 39" stroke="#c8843a" strokeWidth="2" fill="none" opacity="0.6" />
      <rect x="17" y="6" width="10" height="7" rx="1.5" fill="#c8a868" />
      <rect x="13" y="62" width="18" height="22" fill="#ece2cc" />
      <rect x="13" y="66" width="18" height="4" fill="#9a2a1e" />
      <text x="22" y="80" textAnchor="middle" fontSize="6" fontWeight="700" fill="#5a3010" fontFamily="sans-serif">
        600
      </text>
      {/* gotas de suor da garrafa gelada */}
      <circle cx="27" cy="90" r="1" fill="#fff" opacity="0.5" />
      <circle cx="16" cy="56" r="0.9" fill="#fff" opacity="0.5" />
      {/* copo americano facetado */}
      <path d="M40 72 H64 L61 104 H43Z" fill="#e0a020" opacity="0.92" />
      <path d="M40 72 H64 L63.3 79 H40.7Z" fill="#fff6e0" />
      <path d="M44 79 L45.5 103 M49 79 L50 104 M54 79 L54 104 M59 79 L58.5 104" stroke="#fff" strokeOpacity="0.25" strokeWidth="0.8" />
      <path d="M40 72 H64 L61 104 H43Z" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="1" />
    </svg>
  );
}
