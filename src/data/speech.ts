// Falas do adversário/narrador. Pelo menos 3 por evento para não repetir.

export type SpeechEvent =
  | 'truco'
  | 'seis'
  | 'nove'
  | 'doze'
  | 'accept'
  | 'run'
  | 'winRound'
  | 'loseRound'
  | 'tie'
  | 'winHand'
  | 'loseHand'
  | 'zap'
  | 'playerTruco'
  | 'playerRan'
  | 'greet'
  | 'think';

export const SPEECH: Record<SpeechEvent, string[]> = {
  truco: ['TRUCO, LADRÃO!', 'Truco! Desce essa carta aí!', 'TRUUUCO, marreco!', 'Truco! Quero ver tu aguentar.', 'Vai encarar? TRUCO!', 'Truco! E a próxima gelada é por sua conta!', 'TRUCO! Garçom, traz mais uma que hoje eu ganho!'],
  seis: ['Seis, marreco!', 'SEIS! Pode chorar!', 'Seis, e sem choro!', 'Seis! Achou que eu ia correr?'],
  nove: ['NOVE! Agora o bicho pega!', 'Nove, e segura o tchan!', 'Nove! Vai pedir pra mamãe?', 'Nove, que hoje eu tô com sorte!'],
  doze: ['DOZE! É tudo ou nada!', 'Doze, e chama o padre!', 'DOZE! Vai pro tudo, parceiro!', 'Doze! Hoje a mesa racha!'],
  accept: ['Desce!', 'Tô dentro, pode vir.', 'Aceito. Não tenho medo de cara feia.', 'Bora, joga logo!', 'Cai dentro!', 'Desce! E desce mais uma 600 também!', 'Aceito. Seu Bené, anota aí.'],
  run: ['Corro. Hoje não...', 'Essa eu deixo passar.', 'Vou correr, mas volto!', 'Tá bom, leva esse ponto aí.', 'Corro. Vou ali pedir um torresmo.', 'Essa eu passo. Mas a cerveja eu não largo.'],
  winRound: ['Essa é minha!', 'Hahaha, toma!', 'Recolhe essa aí pra mim.', 'Foi pouco!'],
  loseRound: ['Sorte de principiante...', 'Hmm, essa doeu.', 'Tá, essa tu levou.', 'Aproveita enquanto dura!'],
  tie: ['Canga! Ninguém leva.', 'Empatou, a coisa tá feia.', 'Canga! Agora é que são elas.', 'Deu canga, segura o coração!'],
  winHand: ['Volta pra escolinha!', 'Isso é truco de verdade!', 'Pode embaralhar, essa foi minha.', 'Mais um pro caderninho!', 'Essa vai pro caderninho do fiado!', 'Pode pagar a rodada, meu amigo!'],
  loseHand: ['Tá com sorte hoje, hein?', 'Próxima eu desconto.', 'Ah, não acredito!', 'Pode comemorar, mas é a última.', 'Garçom, desce a saideira...', 'Tá bom, essa cerveja eu pago.'],
  zap: ['O ZAP! Respeita!', 'Zap na mesa, abaixa a cabeça!', 'Olha o Zap aí, meu filho!', 'ZAAAP!'],
  playerTruco: ['Hmm... será que tem?', 'Tá blefando, eu sei.', 'Truco, é? Vamos ver...', 'Olha só quem ficou valente!'],
  playerRan: ['Correu! Tá com medo, é?', 'Arregou, hein!', 'Pode correr, galinha!', 'Ih, fugiu do pau!', 'Correu! Vai lá pagar a conta, vai.', 'Arregou! Nem terminou o copo!'],
  greet: ['Senta aí, vamos jogar.', 'Mais um patinho na mesa!', 'Dá as cartas, que eu tô com pressa.', 'Hoje eu tô inspirado!', 'Puxa a cadeira de plástico e senta aí.', 'Seu Bené, uma 600 e um baralho, por favor!', 'Bora um truquinho enquanto a porção não chega?'],
  think: ['Deixa eu pensar...', 'Hmmm...', 'Tô vendo, tô vendo...', 'Peraí...', 'Deixa eu dar um gole aqui...', 'Peraí, tô vendo...'],
};

export function speechFor(event: SpeechEvent, roll: number): string {
  const lines = SPEECH[event];
  return lines[Math.floor(roll * lines.length) % lines.length];
}
