'use client'
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock, Quote, Send, Check } from 'lucide-react';
import Page from '../Page.jsx';
import Gate from '../Gate.jsx';
import ConfirmDelete from '../Confirm.jsx';
import { Reveal } from '../Motion.jsx';
import { useAuth } from '../AuthContext.jsx';
import { useToast } from '../Toast.jsx';
import { api } from '../../lib/client-api.js';
import { messageView } from '../../lib/views';
import { FAKE_MESSAGES } from '../../lib/fixtures.js';
import { timeAgo } from '../../lib/format.js';

const ease = [0.22, 1, 0.36, 1];
const MAX = 800;

function MessageCard({ m, index, onDelete }) {
  return (
    <motion.article
      className={`message ${m.private ? 'is-private' : ''}`}
      layout="position"
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.25 } }}
      transition={{ duration: 0.7, delay: Math.min(index, 8) * 0.07, ease }}
    >
      <Quote className="quote-glyph" size={26} aria-hidden />
      <p className="message-body">{m.body}</p>
      <footer>
        <span className="message-by">Message by <b>{m.author}</b></span>
        <span className="message-meta">
          {m.private && <span className="private-chip"><Lock size={11} /> Private</span>}
          <time dateTime={m.created_at}>{timeAgo(m.created_at)}</time>
          {m.mine && onDelete && <ConfirmDelete onConfirm={() => onDelete(m)} label="Delete message" />}
        </span>
      </footer>
    </motion.article>
  );
}

function Composer({ onSent }) {
  const { role, guest, openSignIn } = useAuth();
  const toast = useToast();
  const [body, setBody] = useState('');
  const [priv, setPriv] = useState(false);
  const [state, setState] = useState('idle'); // idle | sending | sent

  const submit = async (e) => {
    e.preventDefault();
    if (state !== 'idle' || body.trim().length < 2) return;
    setState('sending');
    try {
      const res = await api.post('/api/messages?depth=0', { body, private: priv });
      onSent(messageView(res.doc, true));
      setBody('');
      setState('sent');
      toast(priv ? 'Sent privately to the couple.' : 'Your message is on the wall.');
      setTimeout(() => setState('idle'), 1800);
    } catch (err) {
      toast(err.message, 'error');
      setState('idle');
    }
  };

  if (role === 'admin') {
    return (
      <aside className="composer card">
        <h2 className="h3">Viewing as the couple</h2>
        <p className="muted">Guests write here. You can read everything, including private notes, and remove anything from the wall.</p>
      </aside>
    );
  }

  if (!role) {
    return (
      <aside className="composer card">
        <h2 className="h3">Write to the couple</h2>
        <p className="muted">Messages are signed with your name, so they’re for invited guests. Sign in with your invitation code to leave one.</p>
        <button className="btn btn-primary" onClick={openSignIn}>Sign in with code</button>
      </aside>
    );
  }

  return (
    <motion.form className="composer card" onSubmit={submit} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.2, ease }}>
      <h2 className="h3">Write to the couple</h2>
      <label className="sr-only" htmlFor="msg">Your message</label>
      <textarea id="msg" rows={6} maxLength={MAX} placeholder="A wish, a memory, some (gentle) advice…" value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="composer-meta">
        <span className={body.length > MAX - 60 ? 'warn' : ''}>{body.length}/{MAX}</span>
      </div>

      <label className="switch">
        <input type="checkbox" checked={priv} onChange={(e) => setPriv(e.target.checked)} />
        <i className="switch-track"><i className="switch-thumb" /></i>
        <span>Only the couple can read this</span>
      </label>

      <p className="signed">Signed as <b>Message by {guest?.name || 'Your name'}</b></p>

      <button className={`btn btn-primary send ${state}`} disabled={state !== 'idle' || body.trim().length < 2}>
        <AnimatePresence mode="wait" initial={false}>
          {state === 'sent' ? (
            <motion.span key="sent" className="btn-inner" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }}><Check size={16} /> Sent</motion.span>
          ) : (
            <motion.span key="send" className="btn-inner" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ x: 40, y: -20, opacity: 0 }}>
              <Send size={16} /> {state === 'sending' ? 'Sending…' : 'Send message'}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </motion.form>
  );
}

export default function MessagesView({ messages: initialMessages }) {
  const { role, canView } = useAuth();
  const toast = useToast();
  const locked = !canView;
  const [messages, setMessages] = useState(initialMessages);

  /* The server sends the list; a refresh (sign-in, sign-out, open access flipping) replaces it. */
  useEffect(() => setMessages(initialMessages), [initialMessages]);

  const list = locked ? FAKE_MESSAGES : messages;

  const remove = async (m) => {
    try {
      await api.del(`/api/messages/${m.id}`);
      setMessages((cur) => cur.filter((x) => x.id !== m.id));
      toast('Message removed.');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <Page className="messages">
      <Gate section="messages">
        <section className="page-head">
          <Reveal y={16}><p className="eyebrow">Messages</p></Reveal>
          <Reveal y={20} delay={0.08}><h1 className="h1">Words for the <em>couple</em></h1></Reveal>
          <Reveal y={20} delay={0.16}><p className="lede">Leave a few words they can keep forever. Each message is signed with your name.</p></Reveal>
        </section>

        <section className="messages-layout">
          <Composer onSent={(m) => setMessages((cur) => [m, ...cur])} />
          <div className="message-wall">
            {!locked && messages.length === 0 ? (
              <div className="empty small">
                <Quote size={28} />
                <p className="muted">No messages yet. Yours could be the first.</p>
              </div>
            ) : (
              <AnimatePresence initial>
                {list.map((m, i) => <MessageCard key={m.id} m={m} index={i} onDelete={locked ? null : remove} />)}
              </AnimatePresence>
            )}
          </div>
        </section>
      </Gate>
    </Page>
  );
}
