// Retratos realistas dos personagens a partir de scripts/retratos/personagens.json.
//
//   node scripts/retratos/gerar.mjs --prompts      escreve PROMPTS.md (para colar num gerador de imagens)
//   node scripts/retratos/gerar.mjs                gera as imagens que faltam pela API da OpenAI
//   node scripts/retratos/gerar.mjs tonhao bene    gera (ou refaz) só esses
//
// Gerar pela API precisa de OPENAI_API_KEY (pago). OPENAI_IMAGE_MODEL troca o modelo.
// As imagens vão para src/assets/portraits/<id>.webp, que o Portrait já carrega no lugar do desenho.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const raiz = join(here, '..', '..');
const saida = join(raiz, 'src', 'assets', 'portraits');
const { estilo, personagens } = JSON.parse(readFileSync(join(here, 'personagens.json'), 'utf8'));

const promptDe = (p) => `${p.descricao}\n\n${estilo}`;
const args = process.argv.slice(2);

if (args.includes('--prompts')) {
  const linhas = [
    '# Prompts dos retratos',
    '',
    'Gere cada imagem quadrada (1:1) e salve em `src/assets/portraits/` com o nome do id',
    '(ex.: `tonhao.png`, `.jpg` ou `.webp`). O jogo usa a imagem no lugar do desenho.',
    'Anexe a imagem de referência ao gerador, se ele aceitar, para manter o estilo igual em todos.',
    '',
  ];
  for (const p of personagens) linhas.push(`## ${p.nome} — \`${p.id}\``, '', '```', promptDe(p), '```', '');
  writeFileSync(join(here, 'PROMPTS.md'), linhas.join('\n'));
  console.log(`PROMPTS.md com ${personagens.length} personagens.`);
  process.exit(0);
}

const chave = process.env.OPENAI_API_KEY;
if (!chave) {
  console.error('Falta OPENAI_API_KEY. Sem chave, use --prompts e gere as imagens manualmente.');
  process.exit(1);
}
const modelo = process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1';
mkdirSync(saida, { recursive: true });

const temImagem = (id) => ['png', 'jpg', 'jpeg', 'webp'].some((ext) => existsSync(join(saida, `${id}.${ext}`)));
const alvo = args.length ? personagens.filter((p) => args.includes(p.id)) : personagens.filter((p) => !temImagem(p.id));
if (!alvo.length) {
  console.log('Nada para gerar: todos já têm imagem.');
  process.exit(0);
}

let falhas = 0;
for (const p of alvo) {
  process.stdout.write(`${p.id}… `);
  try {
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chave}` },
      body: JSON.stringify({
        model: modelo,
        prompt: promptDe(p),
        size: '1024x1024',
        quality: 'high',
        output_format: 'webp',
        output_compression: 85,
      }),
    });
    const json = await r.json();
    if (!r.ok) throw new Error(json.error?.message ?? `HTTP ${r.status}`);
    writeFileSync(join(saida, `${p.id}.webp`), Buffer.from(json.data[0].b64_json, 'base64'));
    console.log('ok');
  } catch (e) {
    falhas++;
    console.log(`falhou: ${e.message}`);
  }
}
console.log(`${alvo.length - falhas}/${alvo.length} gerados em src/assets/portraits.`);
process.exit(falhas ? 1 : 0);
