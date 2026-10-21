// npm run simulate [-- --runs 1000 --deck classico --stake 1]
// Joga runs automáticas com a IA jogadora e reporta até onde cada uma chegou.

import { autoRun } from '../src/ai/autoplayer';
import { FINAL_ANTE } from '../src/data/balance';
import { newRun } from '../src/engine/run';

function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const runs = Number(arg('runs', '1000'));
const deckId = arg('deck', 'classico');
const stake = Number(arg('stake', '1'));

const reached = new Array(FINAL_ANTE + 2).fill(0); // reached[a] = runs que venceram o Chefe do Ante a
let wins = 0;
let best = 0;
let blinds = 0;
const started = Date.now();

for (let i = 0; i < runs; i++) {
  const run = newRun({ seed: `SIM${i}`, deckId, stake });
  const r = autoRun(run);
  if (r.won) wins++;
  const cleared = r.won ? FINAL_ANTE : r.ante - 1;
  for (let a = 1; a <= cleared; a++) reached[a]++;
  best = Math.max(best, r.bestHand);
  blinds += r.blindsDefeated;
  if ((i + 1) % 100 === 0) process.stdout.write(`  ${i + 1}/${runs}\r`);
}

const pct = (n: number) => `${((100 * n) / runs).toFixed(1)}%`.padStart(6);
console.log(`\nTrucado — ${runs} runs simuladas (deck ${deckId}, stake ${stake}) em ${((Date.now() - started) / 1000).toFixed(1)}s\n`);
console.log('Ante | venceram o Chefe | taxa');
console.log('-----+------------------+------');
for (let a = 1; a <= FINAL_ANTE; a++) {
  console.log(`  ${a}  | ${String(reached[a]).padStart(16)} | ${pct(reached[a])}`);
}
console.log(`\nVitórias (Ante ${FINAL_ANTE}): ${wins} (${pct(wins).trim()})`);
console.log(`Média de Blinds vencidos: ${(blinds / runs).toFixed(2)}`);
console.log(`Melhor mão: ${best}`);
