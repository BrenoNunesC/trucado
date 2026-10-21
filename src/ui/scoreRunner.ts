// Anima a pontuação passo a passo: cada efeito "bate" na ordem, da esquerda para a direita.

import { sfx } from '../audio/sfx';
import type { HandSummary, ScoreStep } from '../engine/state';
import { burst, floatText, pop, shake } from './fx';
import { delay, getState, update } from './store';
import { fmtMult } from './text';

let timer: number | undefined;
let raf: number | undefined;

export function cancelScoreAnim(): void {
  window.clearTimeout(timer);
  if (raf) cancelAnimationFrame(raf);
  if (getState().anim) update((s) => (s.anim = null));
}

export function startScoreAnim(summary: HandSummary, before: number, onDone?: () => void): void {
  if (!summary.score) return;
  update((s) => {
    s.anim = { summary, before, step: 0, chips: 0, mult: 0, phase: 'steps', shown: before };
  });
  const steps = summary.score.steps;
  const stepMs = delay(Math.max(170, 420 - steps.length * 12));
  timer = window.setTimeout(() => runStep(0, stepMs, onDone), delay(250));
}

function stepText(s: ScoreStep): { text: string; kind: 'chips' | 'mult' | 'xmult' | 'money' | 'info' } {
  if (s.xmult) return { text: `×${fmtMult(s.xmult)}`, kind: 'xmult' };
  if (s.money) return { text: `+$${s.money}`, kind: 'money' };
  if (s.chips && s.mult) return { text: s.label, kind: 'chips' };
  if (s.mult) return { text: `+${fmtMult(s.mult)}`, kind: 'mult' };
  if (s.chips) return { text: `+${s.chips}`, kind: 'chips' };
  return { text: s.label, kind: 'info' };
}

function runStep(i: number, stepMs: number, onDone?: () => void): void {
  const anim = getState().anim;
  if (!anim) return;
  const steps = anim.summary.score!.steps;
  if (i >= steps.length) {
    showTotal(onDone);
    return;
  }
  const s = steps[i];
  update((st) => {
    if (!st.anim) return;
    st.anim.step = i + 1;
    st.anim.chips = s.totalChips;
    st.anim.mult = s.totalMult;
  });
  const el = s.ref ? document.querySelector(`[data-ref="${s.ref}"]`) : null;
  const { text, kind } = stepText(s);
  if (el) {
    pop(el);
    floatText(el, s.source === 'joker' || s.source === 'seal' || kind === 'info' ? s.label : text, kind);
  }
  if (s.chips) pop(document.getElementById('chips-box'));
  if (s.mult || s.xmult) pop(document.getElementById('mult-box'), s.xmult ? 1.35 : 1.18);
  if (s.xmult) {
    sfx('xmult');
    shake(1);
  } else if (s.money) sfx('coin');
  else if (s.mult) sfx('mult');
  else if (s.chips) sfx('chips');
  timer = window.setTimeout(() => runStep(i + 1, stepMs, onDone), s.xmult ? stepMs * 1.4 : stepMs);
}

function showTotal(onDone?: () => void): void {
  const anim = getState().anim!;
  const total = anim.summary.score!.total;
  update((st) => (st.anim!.phase = 'total'));
  const big = total >= anim.summary.score!.chips * 6;
  shake(big ? 3 : 2);
  sfx('xmult');
  burst(document.getElementById('mult-box'), big ? '#ff4b3e' : '#ffd34d', big ? 36 : 20);
  timer = window.setTimeout(() => countUp(total, onDone), delay(650));
}

function countUp(total: number, onDone?: () => void): void {
  const anim = getState().anim!;
  const from = anim.before;
  const to = from + total;
  const dur = delay(650);
  const start = performance.now();
  update((st) => (st.anim!.phase = 'count'));
  const frame = (now: number) => {
    const t = Math.min(1, (now - start) / dur);
    const v = Math.floor(from + (to - from) * (1 - Math.pow(1 - t, 3)));
    update((st) => {
      if (st.anim) st.anim.shown = v;
    });
    if (t < 1) raf = requestAnimationFrame(frame);
    else {
      timer = window.setTimeout(() => {
        update((st) => (st.anim = null));
        onDone?.();
      }, delay(350));
    }
  };
  raf = requestAnimationFrame(frame);
}
