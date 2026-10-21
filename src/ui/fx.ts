// Efeitos visuais: tremor de tela e partículas. Respeitam as configurações.

let shakeEnabled = true;
let reduced = false;

export function configureFx(shake: boolean, reducedMotion: boolean): void {
  shakeEnabled = shake;
  reduced = reducedMotion;
}

export function shake(strength: 1 | 2 | 3 = 1): void {
  if (!shakeEnabled || reduced) return;
  const el = document.getElementById('shake-root');
  if (!el) return;
  const px = strength * 4;
  el.animate(
    [
      { transform: 'translate(0,0)' },
      { transform: `translate(${-px}px, ${px / 2}px) rotate(-0.4deg)` },
      { transform: `translate(${px}px, ${-px / 2}px) rotate(0.4deg)` },
      { transform: `translate(${-px / 2}px, ${px / 3}px)` },
      { transform: 'translate(0,0)' },
    ],
    { duration: 180 + strength * 80, easing: 'ease-out' },
  );
}

/** Explosão de partículas a partir de um ponto da tela (ou do centro de um elemento). */
export function burst(at: { x: number; y: number } | Element | null, color = '#ffd34d', count = 18): void {
  if (reduced || !at) return;
  const layer = document.getElementById('fx-layer');
  if (!layer) return;
  let x: number;
  let y: number;
  if (at instanceof Element) {
    const r = at.getBoundingClientRect();
    x = r.left + r.width / 2;
    y = r.top + r.height / 2;
  } else ({ x, y } = at);
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.background = color;
    const size = 4 + Math.random() * 6;
    p.style.width = p.style.height = `${size}px`;
    layer.appendChild(p);
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 90;
    const anim = p.animate(
      [
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        {
          transform: `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist + 30}px)) scale(0.2)`,
          opacity: 0,
        },
      ],
      { duration: 500 + Math.random() * 400, easing: 'cubic-bezier(.2,.8,.3,1)' },
    );
    anim.onfinish = () => p.remove();
  }
}

/** Texto flutuante ("+20", "×2") saindo de um elemento. */
export function floatText(el: Element | null, text: string, kind: 'chips' | 'mult' | 'xmult' | 'money' | 'info'): void {
  if (!el) return;
  const layer = document.getElementById('fx-layer');
  if (!layer) return;
  const r = el.getBoundingClientRect();
  const t = document.createElement('div');
  t.className = `float-text float-${kind}`;
  t.textContent = text;
  t.style.left = `${r.left + r.width / 2}px`;
  t.style.top = `${r.top}px`;
  layer.appendChild(t);
  const anim = t.animate(
    [
      { transform: 'translate(-50%, 0) scale(0.6)', opacity: 0 },
      { transform: 'translate(-50%, -18px) scale(1.15)', opacity: 1, offset: 0.25 },
      { transform: 'translate(-50%, -46px) scale(1)', opacity: 0 },
    ],
    { duration: reduced ? 600 : 900, easing: 'ease-out' },
  );
  anim.onfinish = () => t.remove();
}

/** "Bate" um elemento (pulo rápido). */
export function pop(el: Element | null, scale = 1.18): void {
  if (!el || reduced) return;
  el.animate(
    [{ transform: 'scale(1) rotate(0)' }, { transform: `scale(${scale}) rotate(-3deg)` }, { transform: 'scale(1) rotate(0)' }],
    { duration: 260, easing: 'cubic-bezier(.3,1.6,.5,1)' },
  );
}
