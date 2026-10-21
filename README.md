# Trucado

Roguelike de deckbuilding no estilo **Balatro**, construído sobre as regras do **Truco Paulista**.
Você enfrenta adversários ("Blinds") cada vez mais difíceis, precisa bater uma meta de pontos
com poucas mãos, ganha dinheiro, compra Coringas na loja e tenta chegar ao fim do Ante 8.

Jogo de computador para Windows: abre na própria janela, funciona offline e não precisa de
navegador nem de internet. Interface em português do Brasil.

## Instalar e jogar

O `npm run dist` (veja Desenvolvimento) gera dois executáveis em `release/`:

| Arquivo | Para quê |
| --- | --- |
| `Trucado-Instalador-0.1.0.exe` | instala no computador, com atalho na área de trabalho e no menu Iniciar |
| `Trucado-0.1.0-portatil.exe` | roda direto, sem instalar (dá para levar num pendrive) |

O Windows pode mostrar o aviso "O Windows protegeu o computador" porque o executável não tem
assinatura digital: clique em **Mais informações → Executar assim mesmo**.

`F11` alterna a tela cheia. O progresso (run em andamento, recordes, coleção) fica salvo no
computador, na pasta de dados do Trucado.

## Desenvolvimento

Precisa de Node.js 20+.

```bash
npm install
npm run app        # compila e abre o jogo numa janela
npm run dist       # gera o instalador e a versão portátil em release/
```

Outros comandos:

| Comando | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento com recarga automática (abre em http://localhost:5173) |
| `npm run build` | typecheck + build do jogo em `dist/` (é o que a janela carrega) |
| `npm test` | testes unitários (Vitest) |
| `npm run typecheck` | checagem de tipos |
| `npm run lint` | ESLint |
| `npm run simulate` | simula 1000 runs com uma IA jogadora e mostra a taxa de vitória por Ante |

`npm run simulate -- --runs 300 --deck sujo --stake 3` muda quantidade, deck e stake.

## Como jogar

1. **Nova run**: escolha um baralho, uma stake (dificuldade) e uma seed (ou sorteie). A mesma seed
   gera a mesma run.
2. Cada **Ante** tem três Blinds: Pequeno, Grande e Chefe. O Pequeno e o Grande podem ser
   **pulados** em troca de uma **Tag** (recompensa). O Chefe sempre muda alguma regra.
3. Num Blind você tem **4 mãos** e **3 blefes** para fazer a meta de pontos. Cada mão é uma mão de
   truco normal contra a IA.
4. **Blefe**: antes de jogar sua primeira carta da mão, selecione até 2 cartas e troque por novas.
5. Vencer a mão pontua **Fichas × Mult**. Perder não pontua — e, se havia aposta aceita, custa
   dinheiro. Bateu a meta, ganha dinheiro (prêmio + mãos não usadas + juros) e vai para a **Loja**.
6. Na loja: compre Coringas, consumíveis, cartas, pacotes e vouchers; venda Coringas; destrua
   cartas para afinar o baralho; role a loja.
7. Vença o Chefe do Ante 8 para ganhar. Depois dá para seguir no **modo infinito**.

Há também o **Modo livre** (truco clássico até 12, com Mão de Onze e Mão de Ferro) e um
**Tutorial** de uma mão.

### Atalhos

| Tecla | Ação |
| --- | --- |
| `1` `2` `3` | jogar a carta 1, 2 ou 3 |
| `T` | pedir truco / aumentar (seis, nove, doze) |
| `A` / `C` | aceitar / correr |
| `B` | blefar com as cartas selecionadas |
| `V` | jogar a carta selecionada virada (no modo livre: liga/desliga "virar a próxima") |
| `Enter` | jogar a carta selecionada / continuar |
| `H` | como funciona a pontuação |
| `D` | ver baralho |
| `M` | mudo |
| `Esc` | menu / fechar |

No celular: toque para selecionar, toque duas vezes para jogar, segure para ver a dica.

## Regras de Truco adotadas

- Baralho de 40 cartas (sem 8, 9, 10). Força crescente: **4 5 6 7 Q J K A 2 3**.
- **Vira e manilha**: a manilha é o valor seguinte ao da vira (vira 3 → manilha 4). Manilhas
  vencem tudo e se desempatam pelo naipe: **Paus (Zap) > Copas > Espadas > Ouros**.
- Melhor de 3 rodadas. Mesmo valor empata (**canga**):
  - canga na 1ª → quem vencer a 2ª leva (se a 2ª também empatar, decide a 3ª);
  - canga na 2ª → leva quem venceu a 1ª;
  - canga na 3ª → leva quem venceu a 1ª;
  - tudo empatado → mão nula, ninguém pontua.
- **Quem abre**: o "mão" alterna a cada mão (o jogador é o mão na 1ª mão de cada Blind) e joga
  primeiro na 1ª rodada. Quem vence uma rodada abre a próxima. **Depois de uma canga, quem abriu a
  rodada empatada abre a seguinte.**
- **Carta virada**: a partir da 2ª rodada dá para jogar uma carta de face para baixo. Ela não vale nada
  (perde para qualquer carta aberta; duas viradas dão canga), mas o adversário não vê qual foi.
- **Apostas**: Truco (3) → Seis (6) → Nove (9) → Doze (12); sem aposta a mão vale 1. Só se pede na
  própria vez, antes de jogar a carta. Quem recebe pode aceitar, correr (o apostador leva o valor
  anterior) ou aumentar. Quem fez a última aposta aceita não pode aumentar de novo.
- **Mão de Onze / Mão de Ferro**: opcionais nas configurações (ligadas no modo livre, desligadas na
  campanha). Detalhes em [DESIGN.md](DESIGN.md).

Essas convenções estão cobertas em `tests/truco.test.ts`.

## Pontuação (resumo)

1. A **Jogada** reconhecida (Zap, Casal de Manilhas, Fechou, Pé de Mesa…) dá Fichas e Mult base.
   Gírias sobem o nível das Jogadas.
2. A **aposta** multiplica o Mult base: sem aposta ×1, Truco ×2, Seis ×3, Nove ×4, Doze ×6.
3. Cada **rodada vencida** soma as Fichas da carta vencedora (4=4 … 3=13; manilha = 20 + naipe).
4. **Coringas** disparam da esquerda para a direita.
5. Pontos = Fichas × Mult.

## Como adicionar um novo Coringa

Os Coringas têm **registro automático**: todo arquivo em `src/data/jokers/` que exporte por padrão
um Coringa (ou uma lista deles) entra no jogo, na loja, nos pacotes e na coleção. Basta criar um
arquivo:

```ts
// src/data/jokers/garcom-do-bar.ts
import { defineJoker } from '../../engine/jokerApi';

export default defineJoker({
  id: 'garcomDoBar',
  name: 'Garçom do Bar',
  rarity: 'comum',          // comum | incomum | raro | lendario (define o preço)
  icon: '🍻',
  color: '#ffcc33',
  description: () => '+3 Mult para cada canga na mão.',
  score: (ctx) => {
    if (ctx.ties > 0) ctx.mult(3 * ctx.ties);
  },
});
```

Ganchos disponíveis (todos opcionais), definidos em `src/engine/jokerApi.ts`:

| Gancho | Quando | Uso típico |
| --- | --- | --- |
| `score(ctx, self)` | depois das cartas, em ordem | `ctx.chips(n)`, `ctx.mult(n)`, `ctx.xmult(n)`, `ctx.money(n)` |
| `scoreCard(ctx, self, round)` | depois de cada carta vencedora | efeitos por naipe/valor |
| `retrigger(ctx, self, round)` | antes de cada carta vencedora | retorna quantas vezes a mais ela pontua |
| `beforeScore(ctx, self)` | antes de tudo | Coringas que escalam (alterar `self.state`) |
| `handEnd(ctx, self)` | fim de toda mão | dinheiro mesmo perdendo, contadores, `self.state.destroyed = 1` |
| `blindStart` / `blindEnd` / `bossDefeated` | ciclo do Blind | alterar mãos, pagar no fim, escalar por Chefe |
| `passive` | sempre | `hidesVira`, `rerollDiscount`, `firstLossFree`, `copyRight` |

`ctx` traz a mão (`ctx.hand`), a Jogada (`ctx.category`), o nível da aposta (`ctx.betLevel`), as
rodadas vencidas (`ctx.roundsWon`), cangas, manilhas jogadas e o estado da run. Use `initialState`
para contadores próprios e mostre-os na `description(self)`.

## Estrutura

```
src/
  engine/   regras puras (sem UI): cartas, RNG com seed, truco, pontuação, Blind, loja, run, modo livre
  data/     tabelas: jokers/ (registro automático), chefes, tags, vouchers, consumíveis, pacotes,
            decks e stakes, falas, balance.ts (fórmulas de meta e preços)
  ai/       IA do adversário (heurística + Monte Carlo) e IA jogadora do simulador
  ui/       React: telas, componentes, store, animações e efeitos
  audio/    sons sintetizados com WebAudio
tests/      Vitest
electron/   janela do jogo (main.cjs) e ícone
scripts/    simulate.ts
```

Arquitetura e decisões de design: [DESIGN.md](DESIGN.md).

## Salvamento

Run em andamento, configurações, recordes, Coringas descobertos e stakes vencidas ficam salvos na pasta
de dados do Trucado no computador (o `localStorage` da janela do jogo). Sem armazenamento disponível o
jogo funciona, só não salva.
