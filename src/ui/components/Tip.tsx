// Tooltip global: passar o mouse ou segurar o dedo. Renderizado numa camada própria
// para não ser cortado por overflow e para não re-renderizar o app inteiro.

import { useRef, useSyncExternalStore, type ReactNode } from 'react';

interface TipState {
  content: ReactNode;
  x: number;
  y: number;
  below: boolean;
}

let current: TipState | null = null;
const subs = new Set<() => void>();
const setTip = (t: TipState | null) => {
  current = t;
  for (const s of subs) s();
};

export function hideTip() {
  if (current) setTip(null);
}

export function TipLayer() {
  const tip = useSyncExternalStore(
    (l) => {
      subs.add(l);
      return () => subs.delete(l);
    },
    () => current,
  );
  if (!tip) return null;
  const left = Math.max(12, Math.min(window.innerWidth - 12, tip.x));
  return (
    <div
      className={`tip-bubble ${tip.below ? 'below' : 'above'}`}
      style={{ left, top: tip.y }}
      role="tooltip"
    >
      {tip.content}
    </div>
  );
}

export function Tip({ content, children, className }: { content: ReactNode; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = () => {
    const el = ref.current;
    if (!el || !content) return;
    const r = el.getBoundingClientRect();
    const below = r.top < 200;
    setTip({ content, x: r.left + r.width / 2, y: below ? r.bottom + 8 : r.top - 8, below });
  };
  return (
    <span
      ref={ref}
      className={`tip-anchor ${className ?? ''}`}
      onMouseEnter={show}
      onMouseLeave={hideTip}
      onFocus={show}
      onBlur={hideTip}
      onTouchStart={() => {
        timer.current = window.setTimeout(show, 380);
      }}
      onTouchEnd={() => {
        window.clearTimeout(timer.current);
        window.setTimeout(hideTip, 1600);
      }}
      onTouchMove={() => window.clearTimeout(timer.current)}
    >
      {children}
    </span>
  );
}
