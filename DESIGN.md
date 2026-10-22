# Trucado — Documento de Design

Este arquivo registra a arquitetura e todas as decisões de design tomadas onde a
especificação era ambígua. Regra geral: na dúvida, a opção mais fiel à diversão
do Balatro.

## 1. Arquitetura

**Stack:** TypeScript + Vite + React, testes com Vitest. Distribuído como programa de Windows com
Electron: `electron/main.cjs` abre uma janela sem menu que carrega o build do Vite (`dist/`) do disco,
com `contextIsolation`, `sandbox` e sem Node na página. As fontes vêm do `@fontsource` (embutidas no
build), então o jogo roda offline. `npm run dist` gera o instalador NSIS e a versão portátil.

**Por que React (e não Canvas/PixiJS):** o jogo é dominado por cartas, botões,
tooltips, modais e texto. O DOM resolve isso com acessibilidade (foco, leitor de
tela, toque), layout responsivo e texto nítido de graça. As animações (tilt 3D,
distribuir, tremor, partículas) ficam em CSS transforms + Web Animations API,
que rodam na GPU e são fluidas o suficiente para dezenas de cartas.

```
src/
  engine/   regras puras: cartas, RNG, truco, pontuação, run, loja, coringas (sem UI)
  data/     tabelas: coringas (1 arquivo por grupo, registro automático), chefes,
            tags, vouchers, consumíveis, decks, stakes, falas, balance.ts
  ai/       IA do adversário (heurística + Monte Carlo) e IA jogadora do simulador
  ui/       componentes React, store, animações, telas
  audio/    sons sintetizados com WebAudio
tests/      Vitest
scripts/    simulate.ts (npm run simulate)
```

**Fluxo de dados:** o motor é um conjunto de funções que recebem e modificam um
estado serializável (`RunState`, `TrucoHand`). A UI mantém o estado num store
externo (`useSyncExternalStore`) e chama ações do motor. O motor devolve
**eventos** (ex.: lista de passos da pontuação) que a UI anima em sequência —
assim a lógica nunca espera pela animação.

**RNG:** mulberry32. O estado do RNG (um inteiro de 32 bits) faz parte do
`RunState`, então salvar/carregar a run preserva a sequência exata. A seed é uma
string de 8 caracteres (A–Z, 0–9) convertida em inteiro por hash.

## 2. Regras de Truco adotadas (Truco Paulista)

- Baralho de 40 cartas: 4,5,6,7,Q,J,K,A,2,3 em 4 naipes.
- Força crescente: 4 < 5 < 6 < 7 < Q < J < K < A < 2 < 3.
- Vira: carta virada no início da mão; a manilha é o valor seguinte na ordem
  acima (vira 3 → manilha 4). Manilhas vencem tudo e se desempatam pelo naipe:
  Paus (Zap) > Copas > Espadas > Ouros.
- Cartas de mesmo valor (não manilha) empatam (canga). Como o jogador tem um
  baralho próprio, duas manilhas de mesmo naipe também podem se encontrar — e
  empatam.
- Melhor de 3 rodadas. Desempates:
  - empate na 1ª → quem vencer a 2ª leva; se a 2ª empatar, decide a 3ª;
  - empate na 2ª (1ª teve vencedor) → leva quem venceu a 1ª;
  - empate na 3ª (1ª e 2ª divididas) → leva quem venceu a 1ª;
  - três empates → mão nula, ninguém pontua.
- **Quem abre:** o "mão" (quem começa) alterna a cada mão; na 1ª mão de cada
  Blind o jogador é o mão. O mão joga primeiro na 1ª rodada. Quem vence uma
  rodada abre a próxima. **Em caso de canga, quem abriu a rodada empatada abre a
  seguinte.**
- **Carta virada (encoberta):** permitida só da 2ª rodada em diante (e nunca na Mão de Ferro, que já é
  às cegas). Não vale nada: perde para qualquer carta aberta e duas viradas dão canga (ou contam para o
  Gilberto da Sorveteria, que fica com as cangas). O outro lado não vê a face (`knownCards` a esconde), a
  carta não conta como manilha jogada e não pontua. A IA reconhece a virada do jogador mas nunca vira.
- **Apostas:** 1 → Truco (3) → Seis (6) → Nove (9) → Doze (12). Só se pode pedir
  na própria vez, antes de jogar a carta. Quem recebe pode aceitar, correr (o
  apostador leva o valor anterior à aposta pendente) ou aumentar. Quem fez a
  última aposta aceita não pode aumentar de novo: o próximo aumento é sempre do
  outro lado.
- **Mão de Onze (modo livre):** quem tem 11 pontos vê as cartas e decide jogar
  (a mão vale 3) ou correr (o adversário ganha 1). Não se pode trucar.
  **Mão de Ferro:** ambos com 11; as cartas são jogadas às cegas, sem truco.
- **Mão de Onze / Ferro na campanha** (desligado por padrão): a última mão de
  cada Blind vira Mão de Onze — o jogador vê as cartas e escolhe jogar valendo
  Truco (×2, sem apostas) ou desistir dela. Com Mão de Ferro ligada, se faltar
  mais da metade da meta na última mão, ela é jogada às cegas valendo Seis (×3).

## 3. Truco + Balatro

### Blind
Meta de pontuação, 4 mãos e 3 blefes (padrão). Cada mão: 3 cartas do baralho do
jogador (monte embaralhado no início do Blind, como no Balatro) contra 3 cartas
do baralho da casa (40 cartas normais, reembaralhado a cada mão). **A vira sai do
monte do jogador** (a 4ª carta de cada mão): o baralho que você monta também decide a manilha
(muitos 5 no baralho → manilha 6 com frequência). A **manilha só pode ser um valor que existe no seu baralho**: se a carta seguinte à vira não
está nele (ex.: você destruiu todos os 4), pula para a próxima, e assim por diante, dando a volta na
ordem até achar uma (no pior caso, o próprio valor da vira). Quem calcula é `manilhaFromVira(vira,
existentes)`; a mão recebe a lista em `HandOptions.availableRanks` e avisa no log quando pulou. Modo livre
e tutorial usam o baralho completo, então não pulam nada. A vira volta ao descarte no fim da mão, e a casa
nunca segura uma carta igual a ela. Com a vira rotativa (Madame Zuleika), as duas viradas seguintes
saem do mesmo monte junto com a primeira e também voltam ao descarte.

**Blefe:** antes de jogar a 1ª carta da mão, trocar até 2 cartas por novas do
monte. Se o monte acabar, o descarte é reembaralhado.

### Pontuação
Quando o jogador vence a mão, identifica-se a **Jogada** (categoria) de maior
prioridade. Ela dá fichas e mult base, que sobem de nível com as Gírias.

1. Fichas = fichas da Jogada.
2. Mult = mult da Jogada × multiplicador da aposta (1: ×1, Truco ×2, Seis ×3,
   Nove ×4, Doze ×6) — "a aposta define o multiplicador base".
3. Cada rodada vencida: fichas da carta vencedora (4=4 … K=10, A=11, 2=12,
   3=13; manilha = 20 + Ouros 0 / Espadas 2 / Copas 4 / Paus 8), depois edição e
   selo da carta.
4. Coringas da esquerda para a direita (e edições dos Coringas).
5. Total = fichas × mult (arredondado para baixo).

O bônus "+10 por vencer a mão" e "+5 por Fechou" estão embutidos nas fichas base
das Jogadas (Na Raça = 10, Fechou = 15).

**Jogadas (prioridade da maior para a menor):** Três Manilhas, Casal Maior
(Zap + Copas), Zap, Casal de Manilhas, Trinca, Virada, Canga Vencida,
Pé de Mesa, Fechou, Arregou (adversário correu), Na Raça.
"Ter" uma carta = recebê-la na mão; Zap exige vencer uma rodada com o Zap.

**Perder a mão:** sem pontos. Se havia aposta aceita (por qualquer lado) o
jogador perde $1 por nível (Truco $1 … Doze $4), sem ficar negativo. Correr de
uma aposta não custa dinheiro, mas gasta a mão. Mão nula também gasta a mão.

### Economia
Recompensa: Pequeno $3, Grande $4, Chefe $5; +$1 por mão não usada; juros de $1
a cada $5 guardados (máx. $5). Loja: rolar custa $5, +$1 por rolagem na mesma
loja.

### Run
8 Antes × 3 Blinds. Pequeno e Grande podem ser pulados por uma Tag. Fórmula das
metas em `src/data/balance.ts`. Depois do Ante 8: vitória e modo infinito.

## 4. Coringas
Registro automático: todo arquivo em `src/data/jokers/` exporta por padrão um
Coringa ou uma lista deles (`defineJoker`). Ganchos disponíveis: `score`
(durante a pontuação), `handEnd`, `blindStart`, `blindEnd`, `passive`.

## 5. IA do adversário

Para cada carta possível, a IA sorteia ~80 mãos que o jogador poderia ter, tiradas **só do que ela
não viu** (baralho padrão de 40 menos suas cartas, a vira e as cartas já jogadas), e simula o resto
da mão com uma política simples (vencer com a menor carta que ganha; segurar a mais forte na 1ª
rodada; aceitar canga quando a canga garante a mão). Isso dá a **equidade** de cada jogada.

As decisões de apostar, aceitar, aumentar, correr e blefar comparam essa equidade com limiares que
dependem da **personalidade** (agressividade, blefe, cautela) e do nível da aposta. A Ficha Preta
deixa todos mais agressivos. O motivo de cada decisão vira texto ("Acha que tem 72% de chance"),
e as falas saem de `src/data/speech.ts` (3+ por evento).

Teste em `tests/modes.test.ts`: trocar as cartas escondidas do jogador não muda a equidade
calculada pela IA.

## 6. Balanceamento

`npm run simulate` joga 1000 runs com uma IA jogadora ingênua (compra o Coringa mais raro que
couber, quase nunca rola a loja, usa consumíveis em cartas aleatórias). Valores atuais:
`TARGET_BASE = 22`, `TARGET_GROWTH = 1.85` → metas do Ante 1: 20 / 30 / 40; Ante 8: ~1630 /
2400 / 3300. Para esse bot, ~87% passam do Ante 1 e ~3% vencem o Ante 8; um humano que escolhe
Coringas e ordem com cuidado deve ir bem mais longe. O truco tem muita variância
(o bot vence ~60% das mãos), por isso as metas iniciais são baixas: perder duas mãos seguidas no
começo não deve acabar a run.

## 7. Decisões de ambiguidades da especificação

- **Zé Pilintra** ("primeiro truco de cada Blind é aceito de graça"): a primeira
  aposta perdida em cada Blind não custa dinheiro.
- **Mula sem Cabeça** ("vencer sem ver a vira"): enquanto você tiver a Mula, a
  vira fica escondida; vencendo a mão, ×3 Mult.
- **Cachaceiro:** +25 fichas por nível de aposta da mão; −1 mão em todo Blind.
- **Truqueiro:** +3 Mult por cada aposta sua que o adversário aceitou na mão.
- **Edição Marcada:** com a carta na mão, uma carta aleatória do adversário fica
  visível (1 por mão, mesmo com várias marcadas).
- **Consumíveis que alteram cartas** abrem um seletor com o baralho inteiro (não
  só a mão de 3), porque a mão de truco é pequena demais para escolher.
- **Afinar baralho:** a loja oferece "Destruir carta" por $3 (+$1 a cada uso na
  run). O baralho nunca fica com menos de 12 cartas.
- **IA:** não vê as cartas do jogador. Ela modela o baralho do jogador como um
  baralho padrão de 40 cartas menos as cartas que já viu.
- **Dênis (chefe):** corre de qualquer aposta, meta ×2.
- **Vencer o Blind no meio da mão** não acontece: a pontuação só entra no fim
  da mão, então "imediatamente" = assim que a mão que bateu a meta termina.
- **Selos:** Dourado = +$2 quando a carta vence rodada; Vermelho = a carta pontua duas vezes;
  Roxo = cria um Tarô quando a carta é trocada num blefe (o "descarte" do Truco); Azul = cria a
  Gíria da Jogada se a carta estava na mão vencedora.
- **Gírias de pacote** são usadas na hora (como planetas no Balatro); Tarôs e Mandingas de pacote
  vão para os slots de consumível.
- **Vira escondida** (Waldemar, O Imperador, Mula sem Cabeça): a vira some da mesa e do log; as cartas não mostram
  destaque de manilha. O resultado das rodadas continua visível.
- **Desbloqueios:** Baralho Rezado exige vencer com o Clássico; Baralho do Bicho exige vencer com o
  Sujo. A stake N de um baralho exige ter vencido a N−1 com ele.

## 8. Adversários, chefes e visual

- **Personagens:** os Blinds Pequeno e Grande sorteiam um personagem de `src/data/opponents.ts`
  (15 rostos). Cada um tem uma personalidade de IA escondida — várias pessoas dividem a mesma
  personalidade, e nem o nome nem a bio dizem qual é. O jogador descobre jogando.
- **Chefes:** 20 chefes normais e 3 finais (`finale: true`) em `src/data/bosses.ts`. No Ante 8 (e a cada
  8 Antes no infinito) só aparecem chefes finais. Regras novas de Blind: `maxLevel` (aposta máxima),
  `noManilhaChips`, `bluffCost`, `aiAlwaysMao`, `halfBase`.
- **Retratos:** `src/ui/components/Portrait.tsx` monta cada personagem em SVG (cabelo, olhos, boca,
  roupa, acessórios) sobre o fundo do bar. Novo personagem = nova entrada em `ART` com o mesmo id.
- **Visual:** linguagem do Balatro aplicada a um boteco brasileiro. Fundo em espiral que gira bem devagar
  e muda de cor por Blind (Pequeno azul, Grande âmbar, Chefe na cor dele, loja cor de cerveja); painéis
  arredondados com sombra sólida; botões chapados; Fichas azul × Mult vermelho. Fontes: Barlow nos textos
  e botões, Barlow Condensed encorpada nos títulos e números grandes (a fonte pixelada saiu por ser difícil
  de ler). A mesa é de madeira de bar, com a 600, o copo americano, a porção de amendoim e tampinhas
  (`TableDecor.tsx`, escondidos em telas pequenas). Fora a espiral, animação só onde comunica jogada.
- **Elenco brasileiro:** fregueses do bar (Tonhão do Açougue, Dona Neide, Marcão Pagodeiro, Kátia do
  Cartório…) e chefes (Vó Benedita, Coronel Teodoro, Toninho do Cavaco, Rainha da Bateria…).
- **Coringas de boteco** em `src/data/jokers/boteco.ts`: cerveja e petisco que acabam com o uso (Garrafa
  de 600, Porção de Torresmo), escaláveis (Engradado, Barril de Chope, Coleção de Tampinhas) e o lendário
  Seu Zé do Bar.
- **Pau-Brasil** (`src/data/jokers/paus.ts`): raro, ×1.4 Mult por rodada vencida com carta de Paus. Combina
  com baralhos cheios de Paus, com o Zap e com Coringas que repetem a carta vencedora.
- **Vouchers (21):** os de nível 2 exigem o de nível 1 (`requires`). Novos: Cortesia da Casa (1ª rolagem
  grátis), Prateleira de Pacotes (+1 pacote), Gorjeta e Gorjetão (+$1 e +$2 por mão vencida), Seguro de Truco
  (perder com aposta custa metade), Olho Vivo (uma carta do adversário sempre visível), Mão Cheia (blefe troca
  até 3), Balcão Cheio (+1 item na loja, exige Vitrine) e Fiado Eterno (40% de desconto no total, exige
  Liquidação).

### Segunda leva de conteúdo
- **Coringas (93 no total):** `src/data/jokers/novos.ts` traz 23 novos, todos só com os ganchos existentes.
  Comuns de petisco e bebida (Cafezinho, Farofa, Quentinha, Guaraná, Pipoca, Brigadeiro, Chinelada, Isqueiro),
  incomuns de situação (Torcida Organizada, Apito do Árbitro, Churrasqueira, Passista, Carteiro e quatro
  que premiam uma Jogada específica: Mestre da Virada, Rei do Pé de Mesa, Arregão, Fechador), raros de
  economia e baralho (Gerente do Bar, Mão-de-Vaca, Ganancioso, Dono do Sebo) e as lendas Padre Cícero e
  Maria Bonita.
- **Tarôs (+9):** Pedreiro, Lavadeira, Cartomante, Feirante, Faxineira, Parteira, Vidente, Pintor, Palpite.
- **Mandingas (+8):** Sal Grosso, Água Benta (+1 mão em 2 Blinds), Boneco de Pano (copia o Coringa da esquerda
  e sacrifica outro), Atabaque, Trevo de Quatro Folhas, Fogueira de São João, Pomba-Gira, Seu Exu. Novo
  Pacote Mega de Mandingas (1 de 4).
- **Tags (+6):** Cara de Pau (+1 blefe), Vaquinha, Baralho Novo, Banca, Fiado (metade do preço) e Brilho
  (Coringa com edição de graça).
- **Vouchers (+4, total 25):** Cobrador, Baralho Novo, Bolso Sem Fundo (nível 2) e Amigo do Dono (nível 2).
- **Baralhos (+3):** Paus (as 40 cartas de Paus, toda manilha é Zap), Fiado ($0 e dois Coringas) e Enxuto
  (24 cartas altas com a Mão-de-Vaca). O Enxuto ganha muito com cartas altas, então as metas dele são o dobro:
  o simulador deu ~5,5% de vitória, perto dos ~4,7% do Clássico (com 1.8× deu 7% e com 1.2× deu 13%).
- **Chefes (+6) e fregueses (+5):** Comadre Quitéria, Cobrador Zé Cabeção, Seu Aurélio Padeiro, Juiz Dr. Rui,
  Ciganinha Esmeralda e o chefe final O Prefeito; fregueses Dona Cida, Seu Jorge, Vanessa, Deivid e Seu
  Osvaldo, todos com retrato próprio (`tests/conteudo.test.ts` confere que ninguém ficou sem arte).
