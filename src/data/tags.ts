// Tags: recompensas por pular o Blind Pequeno ou o Grande.
// `when` diz quando a tag age: na hora (immediate), na próxima loja (shop),
// ao vencer o próximo Chefe (boss) ou no próximo Blind (blind).

export interface TagDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  when: 'immediate' | 'shop' | 'boss' | 'blind' | 'nextTag';
  minAnte: number;
}

export const TAGS: TagDef[] = [
  { id: 'caixinha', name: 'Tag da Caixinha', description: 'Ganhe $7 agora.', icon: '💰', when: 'immediate', minAnte: 1 },
  { id: 'investimento', name: 'Tag de Investimento', description: 'Ganhe $15 ao vencer o próximo Chefe.', icon: '📈', when: 'boss', minAnte: 1 },
  { id: 'girias', name: 'Tag da Resenha', description: 'Abre de graça um Pacote Mega de Gírias.', icon: '🗣️', when: 'immediate', minAnte: 1 },
  { id: 'taro', name: 'Tag da Cartomante', description: 'Abre de graça um Pacote Mega de Tarô de Boteco.', icon: '🔮', when: 'immediate', minAnte: 1 },
  { id: 'mandinga', name: 'Tag da Encruzilhada', description: 'Abre de graça um Pacote de Mandingas.', icon: '🕯️', when: 'immediate', minAnte: 2 },
  { id: 'incomum', name: 'Tag do Camelô', description: 'A próxima loja traz um Coringa Incomum grátis.', icon: '🛒', when: 'shop', minAnte: 1 },
  { id: 'raro', name: 'Tag do Contrabando', description: 'A próxima loja traz um Coringa Raro grátis.', icon: '📦', when: 'shop', minAnte: 2 },
  { id: 'cupom', name: 'Tag do Cupom', description: 'Itens e pacotes iniciais da próxima loja saem de graça.', icon: '🎫', when: 'shop', minAnte: 2 },
  { id: 'rolagem', name: 'Tag da Rolagem', description: 'A próxima loja tem 3 rolagens grátis.', icon: '🎲', when: 'shop', minAnte: 1 },
  { id: 'dobro', name: 'Tag do Dobro', description: 'A próxima Tag que você pegar vem em dobro.', icon: '✌️', when: 'nextTag', minAnte: 1 },
  { id: 'folego', name: 'Tag do Fôlego', description: '+1 mão no próximo Blind.', icon: '🫁', when: 'blind', minAnte: 1 },
  { id: 'blefe', name: 'Tag da Cara de Pau', description: '+1 blefe no próximo Blind.', icon: '😶', when: 'blind', minAnte: 1 },
  { id: 'gorjetaTag', name: 'Tag da Vaquinha', description: 'Ganhe $2 por Coringa seu (máx. $12) agora.', icon: '🐖', when: 'immediate', minAnte: 1 },
  { id: 'cartasTag', name: 'Tag do Baralho Novo', description: 'Abre de graça um Pacote Mega de Cartas.', icon: '🂡', when: 'immediate', minAnte: 1 },
  { id: 'coringasTag', name: 'Tag da Banca', description: 'Abre de graça um Pacote Mega de Coringas.', icon: '🃏', when: 'immediate', minAnte: 2 },
  { id: 'desconto', name: 'Tag do Fiado', description: 'Itens e pacotes iniciais da próxima loja custam metade.', icon: '📒', when: 'shop', minAnte: 1 },
  { id: 'brilho', name: 'Tag do Brilho', description: 'A próxima loja traz um Coringa Comum com edição, de graça.', icon: '✨', when: 'shop', minAnte: 2 },
];

export const TAG_BY_ID = Object.fromEntries(TAGS.map((t) => [t.id, t])) as Record<string, TagDef>;
