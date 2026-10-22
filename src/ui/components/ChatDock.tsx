// Chat da sala online: um painel no canto que acompanha todas as telas (sala de espera, mesa,
// loja, quem assiste). Sem filtro de palavras. Recolhe e mostra quantas mensagens chegaram.

import { useEffect, useRef, useState } from 'react';
import { onlineChat } from '../../net/client';
import { useApp } from '../store';

export function ChatDock() {
  const s = useApp();
  const o = s.online;
  const lines = o?.chat ?? [];
  const [open, setOpen] = useState(true);
  const [text, setText] = useState('');
  const [seen, setSeen] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const active = !!o && (o.status === 'lobby' || o.status === 'playing' || o.status === 'reconnecting');

  // rola para a última mensagem e zera o contador quando o painel está aberto
  useEffect(() => {
    if (!open) return;
    setSeen(lines.length);
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [open, lines.length]);

  if (!active) return null;
  const unread = Math.max(0, lines.length - seen);
  const send = () => {
    const t = text.trim();
    if (!t) return;
    onlineChat(t);
    setText('');
  };

  return (
    <aside className={`chat-dock ${open ? 'open' : ''}`} aria-label="Chat da sala">
      <button className="chat-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        💬 Chat {o?.spectator ? '(assistindo)' : ''}
        {!open && unread > 0 && <span className="chat-badge">{unread}</span>}
        <span className="chat-toggle">{open ? '▾' : '▴'}</span>
      </button>
      {open && (
        <>
          <div className="chat-lines" ref={list}>
            {lines.length === 0 && <p className="muted chat-empty">Ninguém falou nada ainda.</p>}
            {lines.map((l) => (
              <p key={l.key} className={`chat-line ${l.mine ? 'mine' : ''} ${l.spectator ? 'watcher' : ''}`}>
                <b>{l.mine ? 'Você' : l.from}:</b> {l.text}
              </p>
            ))}
          </div>
          <form
            className="chat-form"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              value={text}
              maxLength={300}
              placeholder="Mande a sua…"
              aria-label="Mensagem"
              onChange={(e) => setText(e.target.value)}
              // as teclas do jogo (1, 2, 3, T, A, C…) não valem enquanto digita
              onKeyDown={(e) => e.stopPropagation()}
            />
            <button className="btn tiny" type="submit">
              Enviar
            </button>
          </form>
        </>
      )}
    </aside>
  );
}
