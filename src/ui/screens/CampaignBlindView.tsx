// Mesa do Blind na campanha em dupla online: a mesa de quatro vem do servidor (as suas cartas,
// as do parceiro e as da dupla adversária da IA) e as jogadas vão para ele. A run é a sua: a
// barra de Coringas e consumíveis, o blefe, a pontuação da sua mão e o pagamento.

import { useCallback, useEffect, useRef, useState } from 'react';
import { sfx } from '../../audio/sfx';
import { bluffMaxCards, canBluff } from '../../engine/blind';
import { dActor, dCanBet, dCanPlayHidden, dCanRaise, teamOf } from '../../engine/duplas';
import { collectCashout, endRun } from '../../engine/run';
import { BET_NAMES, type BetResponse } from '../../engine/truco';
import { onlineAct, onlineEmote } from '../../net/client';
import { EMOTES } from '../../net/protocol';
import { campBluff, campNextHand } from '../campaignOnline';
import { DuplasTable } from '../components/DuplasTable';
import { InventoryBar } from '../components/Items';
import { HandLog } from '../components/Sidebar';
import { shake } from '../fx';
import { act, toast, update, useApp } from '../store';
import { fmtNum } from '../text';
import { CashoutPanel, getModalOpen, SummaryLine } from './BlindView';

export function CampaignBlindView() {
  const s = useApp();
  const run = s.run!;
  const blind = run.blind!;
  const view = s.online?.camp;
  const t = view?.table;
  const busy = !!s.anim;
  const [emoteWait, setEmoteWait] = useState(false);

  const h = t?.hand && t.stage !== 'dealing' ? t.hand : null;
  const live = !!h && t!.stage === 'playing' && h.phase !== 'done' && !busy;
  const who = h ? dActor(h) : null;
  const myTurn = live && h!.phase === 'play' && who === 0;
  const mustRespond = live && h!.phase === 'respond' && who === 0;
  const names = t?.seats.map((x) => x.name) ?? [];

  // uma ação por estado da mesa (duplo clique e tecla repetida não mandam de novo)
  const stamp = `${t?.handNo}-${t?.stage}-${h?.phase}-${h?.log.length}-${h?.hands[0].length}`;
  const sent = useRef<string | null>(null);
  const once = (fn: () => void) => {
    if (sent.current === stamp) return false;
    sent.current = stamp;
    fn();
    return true;
  };

  // sons das jogadas dos outros, a partir do que entrou de novo no log
  const seen = useRef({ hand: t?.handNo ?? 0, log: h?.log.length ?? 0 });
  useEffect(() => {
    if (!h || !t) return;
    const prev = seen.current;
    const fresh = prev.hand === t.handNo ? h.log.slice(prev.log) : h.log;
    for (const e of fresh) {
      if (e.kind === 'round') sfx('card');
      if (e.kind !== 'bet') continue;
      if (/pede|aumenta/.test(e.text)) {
        sfx('truco');
        if (h.pending && teamOf(h.pending.by) === 1) shake(2);
      } else if (/aceita/.test(e.text)) sfx('accept');
      else sfx('run');
    }
    seen.current = { hand: t.handNo, log: h.log.length };
  }, [h, t]);

  const select = useCallback(
    (id: string) => {
      if (!myTurn) return;
      sfx('click');
      update((st) => {
        const sel = st.selected;
        if (sel.includes(id)) st.selected = sel.filter((x) => x !== id);
        else st.selected = [...sel, id].slice(-bluffMaxCards(run));
      });
    },
    [myTurn, run],
  );

  const play = (id: string, hidden = false) => {
    if (!myTurn || !h || (hidden && !dCanPlayHidden(h, 0))) return;
    once(() => {
      onlineAct({ t: 'play', cardId: id, hidden });
      // chefe que cobra por carta jogada: a cobrança é na sua run
      if (blind.rules.moneyPerCard > 0) act((r) => (r.money = Math.max(0, r.money - blind.rules.moneyPerCard)));
      sfx('card');
      update((st) => (st.selected = []));
    });
  };
  const bet = () => {
    if (!myTurn || !h || !dCanBet(h, 0)) return;
    once(() => {
      onlineAct({ t: 'bet' });
      act((r) => (r.stats.betsCalled += 1));
      sfx('truco');
      shake(2);
    });
  };
  const respond = (r: BetResponse) => {
    if (!mustRespond || !h || (r === 'raise' && !dCanRaise(h, 0))) return;
    once(() => onlineAct({ t: 'respond', r }));
  };
  const doBluff = () => {
    if (!myTurn || s.selected.length === 0) return;
    if (campBluff(s.selected)) {
      sfx('deal');
      update((st) => (st.selected = []));
      toast('Blefe! Cartas trocadas.', 'info');
    }
  };
  const bluffOk = myTurn && !!h && h.rounds.length === 1 && !h.rounds[0].cards[0] && canBluff(run);

  // a mão acabou e a dupla não chegou na meta: a próxima mão é sua quando você quiser
  const canNext = !busy && t?.stage === 'handOver' && blind.stage === 'handOver' && blind.handsPlayed === t.handNo;
  const next = () => {
    if (!canNext) return;
    campNextHand();
  };
  const collect = () => {
    if (busy || blind.stage !== 'won') return;
    // vai para a sua loja (ou para a vitória, depois do chefe final)
    const total = act((r) => collectCashout(r));
    sfx('coin');
    toast(`+$${total}`, 'good');
  };
  const lost = () => act((r) => endRun(r));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (getModalOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (['1', '2', '3'].includes(k) && h) {
        const c = h.hands[0][Number(k) - 1];
        if (c) play(c.id);
      } else if (k === 't') {
        if (mustRespond) respond('raise');
        else bet();
      } else if (k === 'a') respond('accept');
      else if (k === 'c') respond('run');
      else if (k === 'b') doBluff();
      else if (k === 'v' && myTurn && s.selected.length === 1) play(s.selected[0], true);
      else if (k === 'enter' || k === ' ') {
        if (t?.onzeYou) once(() => onlineAct({ t: 'onze', play: true }));
        else if (myTurn && s.selected.length === 1) play(s.selected[0]);
        else if (canNext) next();
        else if (blind.stage === 'won') collect();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!view || !t) return <p className="hint muted">Conectando à mesa…</p>;
  const partner = view.partner.name;
  const nextLevel = h ? Math.min(4, (h.pending?.level ?? h.level) + 1) : 1;
  const teamScore = view.score.mine + view.score.partner;

  return (
    <div className="blind-view coop-blind campaign-blind">
      <InventoryBar busy={busy} />
      <div className="camp-score" aria-label="Placar da dupla">
        <span>
          Dupla: <b>{fmtNum(teamScore)}</b> / {fmtNum(view.score.target)}
        </span>
        <span className="muted">
          Você {fmtNum(view.score.mine)} · {partner} {view.partner.bot ? '(IA)' : fmtNum(view.score.partner)}
        </span>
        <span className="muted">Mãos restantes: {t.handsLeft}</span>
      </div>
      <div className="table-wrap">
        {h ? (
          <DuplasTable
            hand={h}
            names={names}
            avatars={t.seats.map((x) => x.avatar)}
            offline={t.seats.map((x) => !x.online)}
            speech={s.online?.dspeech ?? null}
            revealPartner={t.stage === 'onze'}
            revealedId={t.revealedId}
            hideVira={t.hideVira}
            canPlay={myTurn}
            selected={s.selected}
            onCardSelect={(c) => select(c.id)}
            onCardPlay={(c) => play(c.id)}
          />
        ) : (
          <div className="table duplas-table camp-waiting">
            <p className="online-spinner">{t.sentCards ? `Esperando as cartas de ${partner}…` : 'Comprando as suas cartas…'}</p>
          </div>
        )}
        <HandLog log={h ? (t.hideVira ? h.log.map((l) => (/^(Nova )?vira/i.test(l.text) ? { ...l, text: 'Vira escondida: a manilha é segredo!' } : l)) : h.log) : []} />
      </div>

      <div className="controls" role="toolbar" aria-label="Ações">
        {t.onzeYou && !busy && (
          <>
            <span className="hint">Mão de Onze: você vê as cartas de {partner}. Jogar valendo Truco ou desistir?</span>
            <button className="btn primary" onClick={() => once(() => onlineAct({ t: 'onze', play: true }))}>
              Jogar <kbd>Enter</kbd>
            </button>
            <button className="btn danger" onClick={() => once(() => onlineAct({ t: 'onze', play: false }))}>
              Desistir
            </button>
          </>
        )}
        {t.stage === 'onze' && !t.onzeYou && <span className="hint muted">{partner} está decidindo a Mão de Onze…</span>}
        {mustRespond && h && (
          <>
            <span className="hint shout">
              {names[h.pending!.by]}: {BET_NAMES[h.pending!.level].toUpperCase()}!
            </span>
            <button className="btn primary" onClick={() => respond('accept')}>
              Aceitar <kbd>A</kbd>
            </button>
            <button className="btn danger" onClick={() => respond('run')}>
              Correr <kbd>C</kbd>
            </button>
            {dCanRaise(h, 0) && (
              <button className="btn truco" onClick={() => respond('raise')}>
                {BET_NAMES[nextLevel]}! <kbd>T</kbd>
              </button>
            )}
          </>
        )}
        {myTurn && h && (
          <>
            <span className="hint">
              {s.selected.length === 0 ? 'Sua vez: escolha uma carta (ou 1–3).' : s.selected.length === 1 ? 'Jogar ou blefar com a selecionada?' : `Blefar: trocar as ${s.selected.length} selecionadas.`}
            </span>
            <button className="btn primary" disabled={s.selected.length !== 1} onClick={() => play(s.selected[0])}>
              Jogar <kbd>Enter</kbd>
            </button>
            {dCanPlayHidden(h, 0) && (
              <button className="btn" disabled={s.selected.length !== 1} onClick={() => play(s.selected[0], true)}>
                Jogar virada <kbd>V</kbd>
              </button>
            )}
            {dCanBet(h, 0) && (
              <button className="btn truco" onClick={bet}>
                {BET_NAMES[nextLevel]}! <kbd>T</kbd>
              </button>
            )}
            {bluffOk && (
              <button className="btn" disabled={s.selected.length === 0} onClick={doBluff}>
                Blefar ({blind.bluffsLeft}) <kbd>B</kbd>
              </button>
            )}
          </>
        )}
        {live && who !== null && who !== 0 && <span className="hint muted">Vez de {names[who]}…</span>}
        {busy && <span className="hint muted">Contando os pontos…</span>}
        {!busy && t.stage === 'scoring' && <span className="hint muted">{t.sentScore ? `Esperando a pontuação de ${partner}…` : 'Contando…'}</span>}
        {!busy && t.stage === 'handOver' && blind.lastSummary && (
          <>
            <SummaryLine />
            {canNext ? (
              <button className="btn primary" onClick={next}>
                Próxima mão <kbd>Enter</kbd>
              </button>
            ) : (
              <span className="hint muted">Esperando {partner}…</span>
            )}
          </>
        )}
        {!busy && blind.stage === 'lost' && (
          <>
            <span className="hint bad">Acabaram as mãos: faltaram {fmtNum(view.score.target - teamScore)} pontos para a dupla.</span>
            <button className="btn danger" onClick={lost}>
              Ver resultado <kbd>Enter</kbd>
            </button>
          </>
        )}
      </div>
      <div className="online-emotes" aria-label="Frases rápidas">
        {EMOTES.map((txt, i) => (
          <button
            key={i}
            className="btn tiny"
            disabled={emoteWait}
            onClick={() => {
              onlineEmote(i);
              setEmoteWait(true);
              window.setTimeout(() => setEmoteWait(false), 2500);
            }}
          >
            {txt}
          </button>
        ))}
      </div>

      {!busy && blind.stage === 'won' && <CashoutPanel onCollect={collect} />}
    </div>
  );
}
