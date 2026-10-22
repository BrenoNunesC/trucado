// Jogar online: criar ou entrar numa sala pelo código, esperar o outro jogador e a partida 1
// contra 1 até 12. Quem manda na partida é o servidor (server/); aqui só se mostra a visão
// recebida e se mandam as jogadas.

import { useEffect, useRef, useState } from 'react';
import { sfx } from '../../audio/sfx';
import { OPPONENT_BY_ID, OPPONENTS } from '../../data/opponents';
import { DUEL_TARGET, type DuelAction } from '../../engine/duel';
import { actor, BET_NAMES, canBet, canPlayHidden, canRaise, responder, type BetResponse } from '../../engine/truco';
import { onlineAct, onlineCreate, onlineEmote, onlineJoin, onlineLeave, onlineRematch, onlineResume, onlineSeat, onlineSend, onlineStart, onlineWatch } from '../../net/client';
import { DuplasTable } from '../components/DuplasTable';
import { DECKS, STAKES } from '../../data/decks';
import { EMOTES, type RankRow, type RoomMode } from '../../net/protocol';
import { Portrait } from '../components/Portrait';
import { HandLog } from '../components/Sidebar';
import { Table } from '../components/Table';
import { shake } from '../fx';
import { getState, setSettings, update, updateProfile, useApp } from '../store';
import { DuplasGame } from './DuplasGame';
import { Tentos } from './FreeMode';

export function OnlineMode() {
  const s = useApp();
  const o = s.online;

  // recarregou a página no meio de uma sala: volta para ela
  useEffect(() => {
    if (!getState().online) onlineResume();
  }, []);

  if (!o || o.status === 'closed') return <OnlineSetup />;
  if (o.spectator && o.status !== 'connecting') return <Spectate />;
  if (o.status === 'connecting') return <Waiting text="Conectando ao servidor…" />;
  if (o.mode === 'campaign') {
    if (o.status === 'reconnecting' && !o.seats && !o.camp) return <Waiting text="Conexão caiu. Tentando voltar para a sala…" />;
    return <CampaignLobby />;
  }
  if (o.mode === 'duplas' || o.mode === 'coop') {
    if (o.status === 'reconnecting' && !o.dview && !o.seats) return <Waiting text="Conexão caiu. Tentando voltar para a sala…" />;
    if (o.status === 'lobby' || !o.dview) return <DuplasLobby />;
    return <DuplasOnline />;
  }
  if (o.status === 'reconnecting' && !o.view) return <Waiting text="Conexão caiu. Tentando voltar para a sala…" />;
  if (o.status === 'lobby' || !o.view) return <Lobby />;
  return <OnlineTable />;
}

const MODE_NAME: Record<RoomMode, string> = {
  duel: '1 contra 1',
  duplas: 'Duplas 2 contra 2',
  coop: 'Dupla contra a máquina',
  campaign: 'Campanha em dupla',
};

/**
 * Sala de espera da campanha em dupla: cada um escolhe o próprio baralho (a run é de cada um) e o
 * anfitrião escolhe a stake e começa. Sem ninguém para entrar, a IA joga de parceira.
 */
function CampaignLobby() {
  const s = useApp();
  const o = s.online!;
  const p = s.profile;
  const seats = o.seats ?? [null, null, null, null];
  const partner = seats[2];
  const [copied, setCopied] = useState(false);
  const [stake, setStake] = useState(1);
  const deckId = o.campDeck ?? 'classico';
  const unlocked = (d: (typeof DECKS)[number]) => !d.unlockedBy || (p.stakesWon[d.unlockedBy] ?? 0) >= 1;
  const maxStake = Math.min(8, (p.stakesWon[deckId] ?? 0) + 1);
  const pickDeck = (id: string) => {
    sfx('click');
    update((x) => (x.online!.campDeck = id));
    setStake(1);
  };
  return (
    <div className="free-setup online-lobby">
      <h2 className="screen-title">Campanha em dupla</h2>
      <p>
        Código da sala (mande para o seu parceiro):{' '}
        <button className="btn tiny" onClick={() => void navigator.clipboard?.writeText(o.code ?? '').then(() => setCopied(true))}>
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
      </p>
      <div className="online-code">{o.code}</div>
      <p className="muted">
        Antes, Blinds e chefes são da dupla; baralho, Coringas, Tarôs, dinheiro e loja são de cada um. A dupla vence o Blind quando a soma das
        pontuações chega à soma das metas.
      </p>
      <div className="lobby-pair">
        <div className="lobby-seat mine">
          <small>Você</small>
          {seats[0] && (
            <div className="lobby-player">
              <Portrait id={seats[0].info.avatar} size={44} title={seats[0].info.name} />
              <b>{seats[0].info.name}</b>
            </div>
          )}
        </div>
        <div className="lobby-seat mine">
          <small>Parceiro</small>
          {partner ? (
            <div className="lobby-player">
              <Portrait id={partner.info.avatar} size={44} title={partner.info.name} />
              <b>{partner.info.name}</b>
              {!partner.online && <em className="online-off">desconectado</em>}
            </div>
          ) : (
            <div className="lobby-empty">Ninguém ainda (se começar assim, a IA joga com você)</div>
          )}
        </div>
      </div>
      <h3>Seu baralho</h3>
      <div className="deck-choices compact">
        {DECKS.map((d) => (
          <button
            key={d.id}
            className={`deck-choice ${deckId === d.id ? 'selected' : ''} ${unlocked(d) ? '' : 'locked'}`}
            style={{ ['--dc' as string]: d.color }}
            disabled={!unlocked(d)}
            onClick={() => pickDeck(d.id)}
            title={d.description}
          >
            <span className="dc-icon">{unlocked(d) ? d.icon : '🔒'}</span>
            <b>{d.name}</b>
          </button>
        ))}
      </div>
      {o.host ? (
        <>
          <h3>Stake (vale para os dois)</h3>
          <div className="stake-choices">
            {STAKES.map((st) => (
              <button
                key={st.level}
                className={`stake-chip ${stake === st.level ? 'selected' : ''}`}
                style={{ ['--sc' as string]: st.color }}
                disabled={st.level > maxStake}
                onClick={() => setStake(st.level)}
                title={st.description}
              >
                {st.level > maxStake ? '🔒' : st.level}
              </button>
            ))}
            <span className="stake-name">{STAKES[stake - 1].name}</span>
          </div>
          <button className="btn primary big" onClick={() => (sfx('deal'), onlineSend({ t: 'start', stake }))}>
            Começar a campanha {partner ? '' : '(com a IA de parceira)'}
          </button>
        </>
      ) : (
        <p className="online-spinner">Esperando o anfitrião começar…</p>
      )}
      <button className="btn" onClick={() => (onlineLeave(), update((x) => (x.screen = 'title')))}>
        Sair da sala
      </button>
    </div>
  );
}

/** Sala de espera das duplas: os quatro lugares em volta da mesa, girados (você embaixo). */
function DuplasLobby() {
  const o = useApp().online!;
  const seats = o.seats ?? [null, null, null, null];
  const locked = o.locked ?? [false, false, false, false];
  const [copied, setCopied] = useState(false);
  const humans = seats.filter((x) => x && !x.bot).length;
  const place = ['Você', 'À direita', 'Parceiro (em frente)', 'À esquerda'];
  return (
    <div className="free-setup online-lobby">
      <h2 className="screen-title">{MODE_NAME[o.mode ?? 'duplas']}</h2>
      <p>
        Código da sala (mande para quem vai jogar):{' '}
        <button className="btn tiny" onClick={() => void navigator.clipboard?.writeText(o.code ?? '').then(() => setCopied(true))}>
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
      </p>
      <div className="online-code">{o.code}</div>
      <div className="lobby-table" role="group" aria-label="Lugares da mesa">
        {[2, 3, 1, 0].map((i) => {
          const s = seats[i];
          const team = i % 2 === 0 ? 'Sua dupla' : 'Dupla adversária';
          return (
            <div key={i} className={`lobby-seat lobby-${['me', 'right', 'partner', 'left'][i]} ${i % 2 === 0 ? 'mine' : 'theirs'}`}>
              <small>
                {place[i]} · {team}
              </small>
              {s ? (
                <div className="lobby-player">
                  <Portrait id={s.info.avatar} size={44} title={s.info.name} />
                  <b>{i === 0 ? `${s.info.name} (você)` : s.info.name}</b>
                  {!s.online && <em className="online-off">desconectado</em>}
                </div>
              ) : locked[i] ? (
                <div className="lobby-empty">Máquina (IA)</div>
              ) : (
                <button className="btn tiny" onClick={() => (sfx('click'), onlineSeat(i))}>
                  Sentar aqui
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p className="muted">
        {o.mode === 'coop'
          ? 'Você e seu parceiro contra uma dupla da máquina. Se ninguém entrar, a IA joga com você.'
          : 'Lugares vazios viram IA quando a partida começar. Clique num lugar livre para trocar de lado.'}
      </p>
      {o.host ? (
        <button className="btn primary big" onClick={() => (sfx('deal'), onlineStart())}>
          Começar ({humans} {humans === 1 ? 'pessoa' : 'pessoas'} + IA)
        </button>
      ) : (
        <p className="online-spinner">Esperando o anfitrião começar…</p>
      )}
      <button className="btn" onClick={() => (onlineLeave(), update((x) => (x.screen = 'title')))}>
        Sair da sala
      </button>
    </div>
  );
}

function DuplasOnline() {
  const o = useApp().online!;
  const v = o.dview!;
  const seats = o.seats ?? [];
  const [emoteCooldown, setEmoteCooldown] = useState(false);
  const leave = () => (onlineLeave(), update((x) => (x.screen = 'title')));
  const emote = (i: number) => {
    if (emoteCooldown) return;
    onlineEmote(i);
    setEmoteCooldown(true);
    window.setTimeout(() => setEmoteCooldown(false), 2500);
  };
  const offline = seats.map((s) => !!s && !s.online);
  return (
    <DuplasGame
      online
      view={v}
      names={seats.map((s, i) => (i === 0 ? s?.info.name ?? 'Você' : s?.info.name ?? '?'))}
      avatars={seats.map((s) => s?.info.avatar ?? 'bene')}
      offline={offline}
      speech={o.dspeech ?? null}
      onAct={(a) => onlineAct(a)}
      topRight={
        <>
          <span className="online-room">
            Sala {o.code} · {MODE_NAME[o.mode ?? 'duplas']}
          </span>
          <button className="btn small" onClick={leave}>
            Sair
          </button>
        </>
      }
      banner={
        <>
          {o.status === 'reconnecting' && <div className="online-banner">Sua conexão caiu. Reconectando…</div>}
          {offline.some(Boolean) && v.stage !== 'over' && (
            <div className="online-banner">Alguém caiu da conexão. Se não voltar em 1 minuto e meio, a IA assume o lugar.</div>
          )}
        </>
      }
      handOverControls={<span className="hint muted">próxima mão já vem…</span>}
      overControls={
        <>
          <button className="btn primary" disabled={o.drematch?.you} onClick={() => onlineRematch()}>
            {o.drematch?.you ? `Esperando mais ${o.drematch.waiting}…` : 'Revanche'}
          </button>
          <button className="btn" onClick={leave}>
            Sair da sala
          </button>
        </>
      }
      footer={
        <div className="online-emotes" aria-label="Frases rápidas">
          {EMOTES.map((t, i) => (
            <button key={i} className="btn tiny" disabled={emoteCooldown} onClick={() => emote(i)}>
              {t}
            </button>
          ))}
        </div>
      }
    />
  );
}

function Waiting({ text }: { text: string }) {
  return (
    <div className="free-setup online-wait">
      <h2 className="screen-title">Jogar online</h2>
      <p className="online-spinner">{text}</p>
      <button className="btn" onClick={() => (onlineLeave(), update((x) => (x.screen = 'title')))}>
        Cancelar
      </button>
    </div>
  );
}

function OnlineSetup() {
  const s = useApp();
  const st = s.settings;
  const [code, setCode] = useState('');
  const [editUrl, setEditUrl] = useState(false);
  const name = st.onlineName.trim();
  const player = { name: name || 'Jogador', avatar: st.onlineAvatar, id: st.playerId };
  const [ranking, setRanking] = useState(false);
  const err = s.online?.status === 'closed' ? s.online.error : null;

  return (
    <div className="free-setup online-setup">
      <h2 className="screen-title">Jogar online</h2>
      <p>Truco até {DUEL_TARGET} pontos com outras pessoas: 1 contra 1, em duplas, ou você e um amigo contra a máquina. Um cria a sala e manda o código; os outros entram com ele.</p>

      {err && (
        <p className="online-error" role="alert">
          {err}
        </p>
      )}

      <section className="online-card">
        <h3>Você</h3>
        <label className="online-field">
          <span>Seu nome</span>
          <input value={st.onlineName} maxLength={18} placeholder="Como te chamam no bar" onChange={(e) => setSettings({ onlineName: e.target.value })} />
        </label>
        <span className="online-label">Seu personagem (é ele que o outro vê sentado à mesa)</span>
        <div className="online-avatars">
          {OPPONENTS.map((p) => (
            <button
              key={p.id}
              className={`online-avatar ${st.onlineAvatar === p.id ? 'selected' : ''}`}
              aria-pressed={st.onlineAvatar === p.id}
              title={p.name}
              onClick={() => (sfx('click'), setSettings({ onlineAvatar: p.id }))}
            >
              <Portrait id={p.id} size={52} title={p.name} />
            </button>
          ))}
        </div>
      </section>

      <div className="online-actions">
        <section className="online-card">
          <h3>Criar sala</h3>
          <p className="muted">
            Mão de Onze: {st.freeOnze ? 'ligada' : 'desligada'} · Mão de Ferro: {st.freeFerro ? 'ligada' : 'desligada'}
          </p>
          {(['duel', 'duplas', 'coop', 'campaign'] as RoomMode[]).map((mode, i) => (
            <button
              key={mode}
              className={`btn ${i === 0 ? 'primary' : ''}`}
              onClick={() => {
                sfx('deal');
                // a campanha usa as regras opcionais da campanha; as partidas até 12, as do modo livre
                const rules = mode === 'campaign' ? { maoDeOnze: st.campaignOnze, maoDeFerro: st.campaignFerro } : { maoDeOnze: st.freeOnze, maoDeFerro: st.freeFerro };
                onlineCreate(st.serverUrl, player, rules, mode);
              }}
            >
              {MODE_NAME[mode]}
            </button>
          ))}
        </section>
        <section className="online-card">
          <h3>Entrar numa sala</h3>
          <input
            className="online-code-input"
            value={code}
            maxLength={4}
            placeholder="CÓDIGO"
            aria-label="Código da sala"
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && code.length === 4 && onlineJoin(st.serverUrl, code, player)}
          />
          <button className="btn primary big" disabled={code.length !== 4} onClick={() => (sfx('deal'), onlineJoin(st.serverUrl, code, player))}>
            Entrar
          </button>
          <button className="btn" disabled={code.length !== 4} onClick={() => (sfx('click'), onlineWatch(st.serverUrl, code, player.name))} title="Ver a partida sem jogar (dá para usar o chat)">
            Só assistir
          </button>
        </section>
      </div>

      <section className="online-card">
        <h3>Ranking</h3>
        <p className="muted">Vitórias no 1 contra 1 e nas duplas, Blinds e Ante na campanha em dupla. Você aparece pelo nome que usa nas salas.</p>
        <button className="btn" onClick={() => setRanking((v) => !v)}>
          {ranking ? 'Esconder ranking' : 'Ver ranking'}
        </button>
        {ranking && <Ranking url={st.serverUrl} id={st.playerId} />}
      </section>

      <p className="muted online-server">
        Servidor:{' '}
        {editUrl ? (
          <input autoFocus value={st.serverUrl} onChange={(e) => setSettings({ serverUrl: e.target.value.trim() })} onBlur={() => setEditUrl(false)} />
        ) : (
          <>
            <code>{st.serverUrl}</code>{' '}
            <button className="btn tiny" onClick={() => setEditUrl(true)}>
              Mudar
            </button>
          </>
        )}
      </p>
      <button className="btn" onClick={() => update((x) => ((x.online = null), (x.screen = 'title')))}>
        Voltar
      </button>
    </div>
  );
}

function Lobby() {
  const o = useApp().online!;
  const [copied, setCopied] = useState(false);
  return (
    <div className="free-setup online-lobby">
      <h2 className="screen-title">Sala criada</h2>
      <p>Mande este código para quem vai jogar com você:</p>
      <div className="online-code" aria-label={`Código da sala: ${o.code?.split('').join(' ')}`}>
        {o.code}
      </div>
      <button
        className="btn"
        onClick={() => {
          void navigator.clipboard?.writeText(o.code ?? '').then(() => setCopied(true));
        }}
      >
        {copied ? 'Copiado!' : 'Copiar código'}
      </button>
      <p className="online-spinner">{o.status === 'reconnecting' ? 'Reconectando…' : 'Esperando o adversário entrar…'}</p>
      <button className="btn" onClick={() => (onlineLeave(), update((x) => (x.screen = 'title')))}>
        Fechar sala
      </button>
    </div>
  );
}

function OnlineTable() {
  const s = useApp();
  const o = s.online!;
  const v = o.view!;
  const h = v.hand;
  const opp = o.opp!;
  const oppDef = OPPONENT_BY_ID[opp.info.avatar];
  const [hiddenNext, setHiddenNext] = useState(false);
  const [emoteCooldown, setEmoteCooldown] = useState(false);
  const who = actor(h);
  const playing = v.stage === 'playing' && h.phase !== 'done';
  const playerTurn = playing && h.phase === 'play' && who === 'player';
  const mustRespond = playing && h.phase === 'respond' && responder(h) === 'player';
  const oppTurn = (playing && (who === 'ai' || (h.phase === 'respond' && responder(h) === 'ai'))) || v.onzeOpp;
  const hiddenOk = playerTurn && canPlayHidden(h, 'player');

  // sons e tremida a partir do que entrou de novo no log (as jogadas do outro chegam do servidor)
  const seen = useRef({ hand: v.handNo, log: h.log.length, opp: h.hands.ai.length });
  useEffect(() => {
    const p = seen.current;
    const fresh = p.hand === v.handNo ? h.log.slice(p.log) : h.log;
    for (const e of fresh) {
      if (e.kind !== 'bet') continue;
      if (/pede|aumenta/.test(e.text)) {
        sfx('truco');
        if (e.text.startsWith('Adversário')) shake(2);
      } else if (/aceita/.test(e.text)) sfx('accept');
      else sfx('run');
    }
    if (p.hand === v.handNo && h.hands.ai.length < p.opp) sfx('card');
    seen.current = { hand: v.handNo, log: h.log.length, opp: h.hands.ai.length };
  }, [v.handNo, h.log.length, h.hands.ai.length, h.log, h.hands.ai]);

  const wasOver = useRef(v.stage === 'over');
  useEffect(() => {
    const over = v.stage === 'over';
    if (over && !wasOver.current) {
      sfx(v.winner === 'player' ? 'victory' : 'gameOver');
      updateProfile((x) => {
        if (v.winner === 'player') x.onlineWins = (x.onlineWins ?? 0) + 1;
        else x.onlineLosses = (x.onlineLosses ?? 0) + 1;
      });
    }
    wasOver.current = over;
  }, [v.stage, v.winner]);

  // uma ação por vez: até o servidor mandar a mesa nova, cliques extras são ignorados
  const stamp = `${v.handNo}-${v.stage}-${h.log.length}-${h.phase}-${h.hands.player.length}`;
  const sent = useRef<string | null>(null);
  const send = (a: DuelAction) => {
    if (sent.current === stamp) return false;
    sent.current = stamp;
    onlineAct(a);
    return true;
  };
  const play = (id: string) => {
    if (!playerTurn || !send({ t: 'play', cardId: id, hidden: hiddenNext && hiddenOk })) return;
    setHiddenNext(false);
    sfx('card');
  };
  const respond = (r: BetResponse) => {
    if (!mustRespond) return;
    if (r === 'raise' && !canRaise(h, 'player')) return;
    send({ t: 'respond', r });
  };
  const doBet = () => {
    if (!playerTurn || !canBet(h, 'player') || !send({ t: 'bet' })) return;
    shake(2);
  };
  const emote = (i: number) => {
    if (emoteCooldown) return;
    onlineEmote(i);
    setEmoteCooldown(true);
    window.setTimeout(() => setEmoteCooldown(false), 2500);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (['1', '2', '3'].includes(k)) {
        const c = h.hands.player[Number(k) - 1];
        if (c) play(c.id);
      } else if (k === 'v') {
        if (hiddenOk) setHiddenNext((x) => !x);
      } else if (k === 't') {
        if (mustRespond) respond('raise');
        else doBet();
      } else if (k === 'a') respond('accept');
      else if (k === 'c') respond('run');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const nextLevel = Math.min(4, (h.pending?.level ?? h.level) + 1);
  const youName = o.you?.info.name ?? 'Você';
  const gone = opp.gone || (!opp.online && v.stage === 'over');

  return (
    <div className="free-mode online-mode">
      <div className="scoreboard">
        <div>
          <span>{youName}</span> <b>{v.score.player}</b> <Tentos n={v.score.player} />
        </div>
        <div>
          <span>
            {opp.info.name}
            {!opp.online && <em className="online-off"> (desconectado)</em>}
          </span>{' '}
          <b>{v.score.ai}</b> <Tentos n={v.score.ai} />
        </div>
        <span className="online-room">Sala {o.code}</span>
        <button className="btn small" onClick={() => (onlineLeave(), update((x) => (x.screen = 'title')))}>
          Sair
        </button>
      </div>
      {o.status === 'reconnecting' && <div className="online-banner">Sua conexão caiu. Reconectando…</div>}
      {!opp.online && !gone && v.stage !== 'over' && (
        <div className="online-banner">{opp.info.name} caiu da conexão. Esperando voltar (se não voltar em 1 minuto e meio, você vence).</div>
      )}
      <div className="table-wrap">
        <Table
          hand={h}
          opponentName={opp.info.name}
          opponentTag={oppDef?.name}
          portraitId={opp.info.avatar}
          selected={[]}
          canPlay={playerTurn}
          speech={s.speech}
          thinking={oppTurn}
          onCardClick={(c) => play(c.id)}
        />
        <HandLog log={h.log} />
      </div>
      <div className="controls">
        {v.onzeYou && (
          <>
            <span className="hint">Mão de Onze! Jogar valendo 3 ou correr (o adversário ganha 1)?</span>
            <button className="btn primary" onClick={() => send({ t: 'onze', play: true })}>
              Jogar
            </button>
            <button className="btn danger" onClick={() => send({ t: 'onze', play: false })}>
              Correr
            </button>
          </>
        )}
        {v.onzeOpp && <span className="hint muted">{opp.info.name} está decidindo a Mão de Onze…</span>}
        {playerTurn && (
          <>
            <span className="hint">{hiddenNext && hiddenOk ? 'Clique na carta que vai jogar virada.' : 'Sua vez: clique numa carta (ou 1–3).'}</span>
            {hiddenOk && (
              <button className={`btn ${hiddenNext ? 'primary' : ''}`} aria-pressed={hiddenNext} onClick={() => setHiddenNext((x) => !x)}>
                {hiddenNext ? 'Virada: ligada' : 'Virar a próxima'} <kbd>V</kbd>
              </button>
            )}
            {canBet(h, 'player') && (
              <button className="btn truco" onClick={doBet}>
                {BET_NAMES[nextLevel]}! <kbd>T</kbd>
              </button>
            )}
          </>
        )}
        {mustRespond && (
          <>
            <span className="hint shout">{BET_NAMES[h.pending!.level].toUpperCase()}!</span>
            <button className="btn primary" onClick={() => respond('accept')}>
              Aceitar <kbd>A</kbd>
            </button>
            <button className="btn danger" onClick={() => respond('run')}>
              Correr <kbd>C</kbd>
            </button>
            {canRaise(h, 'player') && (
              <button className="btn truco" onClick={() => respond('raise')}>
                {BET_NAMES[nextLevel]}! <kbd>T</kbd>
              </button>
            )}
          </>
        )}
        {oppTurn && !v.onzeOpp && <span className="hint muted">Vez de {opp.info.name}…</span>}
        {v.stage === 'handOver' && (
          <span className={`hint ${v.lastPoints?.side === 'player' ? 'good' : 'bad'}`}>
            {v.lastPoints?.side ? `${v.lastPoints.side === 'player' ? youName : opp.info.name} +${v.lastPoints.points}` : 'Mão nula'} · próxima mão já vem…
          </span>
        )}
        {v.stage === 'over' && (
          <>
            <span className={`hint ${v.winner === 'player' ? 'good' : 'bad'}`}>
              {v.winner === 'player'
                ? v.forfeit === 'ai'
                  ? `${opp.info.name} abandonou: você venceu!`
                  : 'Você venceu a partida!'
                : `${opp.info.name} venceu a partida.`}
            </span>
            {!gone && (
              <button className="btn primary" disabled={o.rematch?.you} onClick={() => onlineRematch()}>
                {o.rematch?.you ? 'Esperando o outro aceitar…' : o.rematch?.opp ? `${opp.info.name} quer revanche! Aceitar` : 'Revanche'}
              </button>
            )}
            <button className="btn" onClick={() => (onlineLeave(), update((x) => (x.screen = 'title')))}>
              Sair da sala
            </button>
          </>
        )}
      </div>
      <div className="online-emotes" aria-label="Frases rápidas">
        {EMOTES.map((t, i) => (
          <button key={i} className="btn tiny" disabled={emoteCooldown} onClick={() => emote(i)}>
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Ranking online: busca no servidor (o mesmo endereço do WebSocket, por HTTP). */
function Ranking({ url, id }: { url: string; id: string }) {
  const [data, setData] = useState<{ top: RankRow[]; you: RankRow | null } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    const http = url.replace(/^ws/, 'http').replace(/\/$/, '');
    fetch(`${http}/ranking?id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setErr(`Não foi possível falar com o servidor (${url}).`));
  }, [url, id]);
  if (err) return <p className="online-error">{err}</p>;
  if (!data) return <p className="online-spinner">Buscando o ranking…</p>;
  if (data.top.length === 0) return <p className="muted">Ninguém no ranking ainda. Jogue uma partida online!</p>;
  const row = (r: RankRow, me: boolean) => (
    <tr key={`${r.pos}-${me}`} className={me ? 'rank-me' : ''}>
      <td>{r.pos}º</td>
      <td>{r.name}</td>
      <td>
        <b>{r.points}</b>
      </td>
      <td>
        {r.wins}/{r.losses}
      </td>
      <td>{r.campBlinds}</td>
      <td>{r.campBestAnte || '—'}</td>
      <td>{r.campVictories}</td>
    </tr>
  );
  const youInTop = data.you && data.top.some((r) => r.pos === data.you!.pos);
  return (
    <table className="rank-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Jogador</th>
          <th>Pontos</th>
          <th>V/D</th>
          <th>Blinds</th>
          <th>Ante</th>
          <th>Campanhas</th>
        </tr>
      </thead>
      <tbody>
        {data.top.map((r) => row(r, !!data.you && r.pos === data.you.pos))}
        {data.you && !youInTop && row(data.you, true)}
      </tbody>
    </table>
  );
}

/** Assistindo uma sala: a mesa sem as cartas de ninguém, os placares e o chat. */
function Spectate() {
  const s = useApp();
  const o = s.online!;
  const leave = () => (onlineLeave(), update((x) => (x.screen = 'title')));
  const top = (
    <>
      <span className="online-room">
        Assistindo · Sala {o.code} · {MODE_NAME[o.mode ?? 'duel']}
      </span>
      <button className="btn small" onClick={leave}>
        Sair
      </button>
    </>
  );
  if (o.mode === 'duel' && o.view && o.you && o.opp) {
    const v = o.view;
    return (
      <div className="free-mode online-mode spectate">
        <div className="scoreboard">
          <div>
            <span>{o.you.info.name}</span> <b>{v.score.player}</b> <Tentos n={v.score.player} />
          </div>
          <div>
            <span>{o.opp.info.name}</span> <b>{v.score.ai}</b> <Tentos n={v.score.ai} />
          </div>
          {top}
        </div>
        <div className="table-wrap">
          <Table hand={v.hand} opponentName={o.opp.info.name} portraitId={o.opp.info.avatar} selected={[]} canPlay={false} speech={null} />
          <HandLog log={v.hand.log} />
        </div>
        <div className="controls">
          <span className="hint muted">
            {v.stage === 'over' ? `Fim: ${v.winner === 'player' ? o.you.info.name : o.opp.info.name} venceu.` : `Embaixo: ${o.you.info.name}. Ninguém vê as cartas de ninguém.`}
          </span>
        </div>
      </div>
    );
  }
  if ((o.mode === 'duplas' || o.mode === 'coop') && o.dview && o.seats) {
    const seats = o.seats;
    return (
      <DuplasGame
        view={o.dview}
        names={seats.map((x) => x?.info.name ?? '?')}
        avatars={seats.map((x) => x?.info.avatar ?? 'bene')}
        offline={seats.map((x) => !!x && !x.online)}
        speech={o.dspeech ?? null}
        onAct={() => {}}
        readOnly
        topRight={top}
      />
    );
  }
  const t = o.camp?.table;
  if (o.mode === 'campaign' && o.camp && t?.hand) {
    const c = o.camp;
    return (
      <div className="free-mode spectate">
        <div className="scoreboard">
          <div>
            <span>
              Ante {c.ante} · {c.blinds[c.blindIndex]?.name}
            </span>{' '}
            <b>
              {c.score.mine + c.score.partner} / {c.score.target}
            </b>
          </div>
          {top}
        </div>
        <div className="table-wrap">
          <DuplasTable hand={t.hand} names={t.seats.map((x) => x.name)} avatars={t.seats.map((x) => x.avatar)} hideVira={t.hideVira} canPlay={false} />
          <HandLog log={t.hand.log} />
        </div>
      </div>
    );
  }
  return (
    <div className="free-setup online-wait">
      <h2 className="screen-title">Assistindo a sala {o.code}</h2>
      <p>
        {MODE_NAME[o.mode ?? 'duel']} · Na sala: {o.players?.join(', ') || 'ninguém ainda'}
      </p>
      <p className="online-spinner">{o.mode === 'campaign' && o.camp ? 'A dupla está na loja ou escolhendo o Blind…' : 'Esperando a partida começar…'}</p>
      <button className="btn" onClick={leave}>
        Sair
      </button>
    </div>
  );
}
