import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Lock, MessageCircleHeart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useToast } from '../../toast.jsx';
import ConfirmDelete from '../../components/Confirm.jsx';
import { timeAgo } from '../../format.js';

export default function Moderation() {
  const toast = useToast();
  const [photos, setPhotos] = useState(null);
  const [messages, setMessages] = useState(null);

  useEffect(() => {
    api.get('/api/photos').then((r) => setPhotos(r.photos));
    api.get('/api/messages').then((r) => setMessages(r.messages));
  }, []);

  const delPhoto = async (p) => {
    await api.del(`/api/photos/${p.id}`);
    setPhotos((cur) => cur.filter((x) => x.id !== p.id));
    toast('Photo removed.');
  };
  const delMsg = async (m) => {
    await api.del(`/api/messages/${m.id}`);
    setMessages((cur) => cur.filter((x) => x.id !== m.id));
    toast('Message removed.');
  };

  return (
    <>
      <div className="panel-head">
        <div>
          <p className="eyebrow">Photos & messages</p>
          <h2 className="h2">Keep it lovely</h2>
          <p className="muted">Everything guests share appears here. Remove anything you don’t want on the wall. You can also add photos yourself from the <Link to="/memories" className="text-link">Memories page</Link>.</p>
        </div>
      </div>

      <section className="admin-card">
        <div className="admin-card-head"><h3><Camera size={18} /> Photos {photos && <span className="muted small">({photos.length})</span>}</h3></div>
        {!photos ? <p className="muted">Loading…</p> : photos.length === 0 ? <p className="muted">No photos yet.</p> : (
          <ul className="mod-photos">
            <AnimatePresence initial={false}>
              {photos.map((p) => (
                <motion.li key={p.id} layout exit={{ opacity: 0, scale: 0.85 }} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}>
                  <img src={p.url} alt={p.caption || `Photo by ${p.author}`} loading="lazy" />
                  <div>
                    <span className="by">Uploaded by <b>{p.author}</b></span>
                    <ConfirmDelete onConfirm={() => delPhoto(p)} label="Delete photo" />
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </section>

      <section className="admin-card">
        <div className="admin-card-head"><h3><MessageCircleHeart size={18} /> Messages {messages && <span className="muted small">({messages.length})</span>}</h3></div>
        {!messages ? <p className="muted">Loading…</p> : messages.length === 0 ? <p className="muted">No messages yet.</p> : (
          <ul className="mod-messages">
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <motion.li key={m.id} layout exit={{ opacity: 0, x: -30 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <div>
                    <p>{m.body}</p>
                    <span className="by">Message by <b>{m.author}</b> · {timeAgo(m.created_at)} {m.private && <span className="private-chip"><Lock size={10} /> Private</span>}</span>
                  </div>
                  <ConfirmDelete onConfirm={() => delMsg(m)} label="Delete message" />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </section>
    </>
  );
}
