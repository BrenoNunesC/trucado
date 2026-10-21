// Fregueses do bar que sentam para jogar nos Blinds Pequeno e Grande. O nome nunca entrega
// o estilo de jogo: cada personalidade tem mais de um rosto, e a bio é só papo de boteco.
// A arte de cada um fica em ui/components/Portrait.tsx (mesmo id).

import type { PersonalityId } from '../ai/opponent';

export interface OpponentDef {
  id: string;
  name: string;
  /** Frase de apresentação (não revela a personalidade). */
  bio: string;
  personality: PersonalityId;
  color: string;
}

export const OPPONENTS: OpponentDef[] = [
  { id: 'tonhao', name: 'Tonhão do Açougue', bio: 'Fecha o açougue às seis e às seis e cinco já pediu a primeira gelada.', personality: 'agressivo', color: '#c8453a' },
  { id: 'rosana', name: 'Rosana Cabeleireira', bio: 'Faz escova progressiva de dia e conta fofoca do bairro à noite.', personality: 'agressivo', color: '#e86a9a' },
  { id: 'juninho', name: 'Juninho do Gás', bio: 'Passa de moto tocando a musiquinha. Para no bar "só um minutinho".', personality: 'medroso', color: '#4a9ad8' },
  { id: 'neide', name: 'Dona Neide', bio: 'Vê a novela das oito e volta pro truco no intervalo do Jornal Nacional.', personality: 'medroso', color: '#e0a040' },
  { id: 'marcao', name: 'Marcão Pagodeiro', bio: 'Leva o pandeiro debaixo do braço. Sempre puxa um samba depois da terceira.', personality: 'blefador', color: '#8a5ad8' },
  { id: 'cris', name: 'Cris da Feira', bio: 'Vende pastel na feira de domingo. Grita "olha a promoção" até no truco.', personality: 'blefador', color: '#5ab84a' },
  { id: 'arlindo', name: 'Prof. Arlindo', bio: 'Dá aula de matemática no supletivo. Anota tudo num guardanapo.', personality: 'calculista', color: '#7aa0c8' },
  { id: 'katia', name: 'Kátia do Cartório', bio: 'Reconhece firma de manhã e reconhece blefe à noite.', personality: 'calculista', color: '#3ab89a' },
  { id: 'bene', name: 'Seu Bené', bio: 'Dono do bar desde 1971. Conhece todo mundo pelo nome e pelo fiado.', personality: 'equilibrado', color: '#e0b040' },
  { id: 'lu', name: 'Lurdinha', bio: 'Ouve o jogo no radinho de pilha, pede torresmo e não divide.', personality: 'equilibrado', color: '#e07a3a' },
  { id: 'gringo', name: 'Gerson Taxista', bio: 'Conhece todos os atalhos da cidade e todas as manhas do baralho.', personality: 'agressivo', color: '#d8a030' },
  { id: 'paty', name: 'Jurema', bio: 'Rezadeira de dia, trucadora de noite. Diz que lê a sorte nas cartas.', personality: 'blefador', color: '#b84ab8' },
  { id: 'zeca', name: 'Zeca Mecânico', bio: 'Conserta Fusca, Brasília e Chevette. A mão nunca sai limpa da graxa.', personality: 'equilibrado', color: '#c9a227' },
  { id: 'telma', name: 'Telma Telefonista', bio: 'Trabalhou anos na central. Ouve tudo e não comenta nada.', personality: 'calculista', color: '#6fa0d8' },
  { id: 'betinho', name: 'Betinho Gandula', bio: 'Busca bola no campo de várzea todo domingo. Ainda tá aprendendo o jogo.', personality: 'medroso', color: '#8ad84a' },
];

export const OPPONENT_BY_ID = Object.fromEntries(OPPONENTS.map((o) => [o.id, o])) as Record<string, OpponentDef>;

/** Personagem padrão para saves antigos sem opponentId. */
export function opponentFor(id: string | undefined, personality: PersonalityId): OpponentDef {
  return (id && OPPONENT_BY_ID[id]) || OPPONENTS.find((o) => o.personality === personality)!;
}
