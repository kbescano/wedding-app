import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { AnimatePresence, motion } from 'framer-motion';
import { Copy, Link2, Mail, MessageCircle, Pencil, Plus, RefreshCw, Search, UserPlus, Users, X, Check } from 'lucide-react';
import { api } from '../../api.js';
import { useAuth } from '../../context.jsx';
import { useToast } from '../../toast.jsx';
import ConfirmDelete from '../../components/Confirm.jsx';
import { formatCode, inviteLink, shortDate } from '../../format.js';

const ease = [0.22, 1, 0.36, 1];

const RsvpChip = ({ g }) =>
  g.rsvp === 'yes' ? <span className="chip ok">Attending · {g.rsvp_count}</span> : g.rsvp === 'no' ? <span className="chip no">Declined</span> : <span className="chip wait">Awaiting</span>;

async function copy(text, toast, msg = 'Copied.') {
  try {
    await navigator.clipboard.writeText(text);
    toast(msg);
  } catch {
    toast('Couldn’t copy. Select the text and copy it manually.', 'error');
  }
}

function InviteSheet({ guest, onClose, onChanged }) {
  const toast = useToast();
  const { realEvent } = useAuth();
  const [qr, setQr] = useState('');
  const link = inviteLink(guest.code);
  const first = guest.name.split(' ')[0];
  const [message, setMessage] = useState(
    `Hi ${first}! ${realEvent?.partner1} & ${realEvent?.partner2} would love you to celebrate their wedding${realEvent ? ` on ${shortDate(realEvent.date)}` : ''}. Open your personal invitation here: ${link}\n\nYour invitation code: ${formatCode(guest.code)}`,
  );

  useEffect(() => {
    QRCode.toDataURL(link, { margin: 1, width: 240, color: { dark: '#1E3B2E', light: '#FBF7EE' } }).then(setQr);
  }, [link]);

  const regenerate = async () => {
    const res = await api.post(`/api/admin/guests/${guest.id}/regenerate-code`);
    onChanged(res.guest);
    toast('New code created. The old link no longer works.');
  };

  return (
    <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="sheet" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 28 }} onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <div>
            <p className="eyebrow">Send login</p>
            <h2 className="h3">{guest.name}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </header>

        <div className="invite-box">
          {qr && <img src={qr} alt={`QR code for ${guest.name}'s invitation`} width={150} height={150} />}
          <div className="invite-code">
            <span className="field-label">Invitation code</span>
            <b>{formatCode(guest.code)}</b>
            <button className="mini" onClick={() => copy(formatCode(guest.code), toast, 'Code copied.')}><Copy size={12} /> Copy code</button>
          </div>
        </div>

        <label className="field">
          <span className="field-label">Personal link</span>
          <div className="input-row">
            <input readOnly value={link} onFocus={(e) => e.target.select()} />
            <button className="btn btn-ghost" onClick={() => copy(link, toast, 'Link copied.')}><Link2 size={15} /> Copy</button>
          </div>
        </label>

        <label className="field">
          <span className="field-label">Message</span>
          <textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
        </label>

        <div className="invite-actions">
          <a className="btn btn-primary" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a>
          <a className="btn btn-ghost" href={`mailto:?subject=${encodeURIComponent('Your wedding invitation')}&body=${encodeURIComponent(message)}`}><Mail size={15} /> Email</a>
          <a className="btn btn-ghost" href={`sms:?&body=${encodeURIComponent(message)}`}>Text</a>
          <button className="btn btn-ghost" onClick={() => copy(message, toast, 'Message copied.')}><Copy size={15} /> Copy message</button>
        </div>
        <button className="text-link small refresh" onClick={regenerate}><RefreshCw size={12} /> Create a new code (old link stops working)</button>
      </motion.div>
    </motion.div>
  );
}

function GuestRow({ g, onUpdate, onInvite, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: g.name, party_size: g.party_size, table_label: g.table_label });

  const save = async (e) => {
    e.preventDefault();
    await onUpdate(g.id, form);
    setEditing(false);
  };

  return (
    <motion.li layout="position" className="guest-row" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.4, ease }}>
      <div className="g-main">
        <b>{g.name}</b>
        <span className="muted small">
          {g.party_size} {g.party_size === 1 ? 'seat' : 'seats'}{g.table_label ? ` · ${g.table_label}` : ''}
          {g.last_login ? '' : ' · not opened yet'}
        </span>
      </div>
      <div className="g-rsvp"><RsvpChip g={g} /></div>
      <label className="switch compact" title="Tagged guests can play the quiz while it's live">
        <input type="checkbox" checked={g.unlocked} onChange={(e) => onUpdate(g.id, { unlocked: e.target.checked })} />
        <i className="switch-track"><i className="switch-thumb" /></i>
        <span>Quiz</span>
      </label>
      <div className="g-actions">
        <button className="btn btn-primary small-btn" onClick={() => onInvite(g)}>Send login</button>
        <button className="icon-btn subtle" onClick={() => setEditing((v) => !v)} aria-label="Edit guest"><Pencil size={15} /></button>
        <ConfirmDelete onConfirm={() => onDelete(g)} label="Delete guest" />
      </div>
      <AnimatePresence initial={false}>
        {editing && (
          <motion.form className="g-edit" onSubmit={save} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease }}>
            <label className="field"><span className="field-label">Name</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label className="field narrow"><span className="field-label">Seats</span><input type="number" min="1" max="20" value={form.party_size} onChange={(e) => setForm({ ...form, party_size: e.target.value })} /></label>
            <label className="field"><span className="field-label">Table</span><input value={form.table_label} placeholder="e.g. Table 4" onChange={(e) => setForm({ ...form, table_label: e.target.value })} /></label>
            <button className="btn btn-brass">Save</button>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

export default function Guests() {
  const toast = useToast();
  const [guests, setGuests] = useState(null);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [mode, setMode] = useState(null); // 'add' | 'bulk'
  const [invite, setInvite] = useState(null);
  const [form, setForm] = useState({ name: '', party_size: 1, table_label: '' });
  const [bulk, setBulk] = useState('');

  const load = () => api.get('/api/admin/guests').then((r) => setGuests(r.guests));
  useEffect(() => { load(); }, []);

  const shown = useMemo(
    () =>
      (guests || []).filter(
        (g) => (filter === 'all' || g.rsvp === filter) && (!q || g.name.toLowerCase().includes(q.toLowerCase()) || g.table_label.toLowerCase().includes(q.toLowerCase())),
      ),
    [guests, filter, q],
  );

  const update = async (id, patch) => {
    try {
      const res = await api.put(`/api/admin/guests/${id}`, patch);
      setGuests((cur) => cur.map((g) => (g.id === id ? res.guest : g)));
      if (invite?.id === id) setInvite(res.guest);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const add = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/admin/guests', form);
      setGuests((cur) => [...cur, res.guest].sort((a, b) => a.name.localeCompare(b.name)));
      setForm({ name: '', party_size: 1, table_label: '' });
      toast(`${res.guest.name} added. Send them their login next.`);
      setInvite(res.guest);
      setMode(null);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const addBulk = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/admin/guests/bulk', { text: bulk });
      await load();
      setBulk('');
      setMode(null);
      toast(`${res.guests.length} guests added.`);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const remove = async (g) => {
    await api.del(`/api/admin/guests/${g.id}`);
    setGuests((cur) => cur.filter((x) => x.id !== g.id));
    toast(`${g.name} removed.`);
  };

  const counts = useMemo(() => {
    const c = { all: 0, pending: 0, yes: 0, no: 0 };
    (guests || []).forEach((g) => { c.all++; c[g.rsvp]++; });
    return c;
  }, [guests]);

  return (
    <>
      <div className="panel-head">
        <div>
          <p className="eyebrow">Guests</p>
          <h2 className="h2">Who’s invited</h2>
          <p className="muted">Each guest gets a personal code. Send it, and only they can open the invitation.</p>
        </div>
        <div className="panel-actions">
          <button className="btn btn-ghost" onClick={() => setMode(mode === 'bulk' ? null : 'bulk')}><Users size={15} /> Add many</button>
          <button className="btn btn-brass" onClick={() => setMode(mode === 'add' ? null : 'add')}><UserPlus size={15} /> Add guest</button>
        </div>
      </div>

      <AnimatePresence initial={false} mode="wait">
        {mode === 'add' && (
          <motion.form key="add" className="admin-card inline-form" onSubmit={add} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease }}>
            <label className="field grow"><span className="field-label">Guest or family name</span><input required autoFocus value={form.name} placeholder="e.g. Amara Okafor" onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label className="field narrow"><span className="field-label">Seats</span><input type="number" min="1" max="20" value={form.party_size} onChange={(e) => setForm({ ...form, party_size: e.target.value })} /></label>
            <label className="field"><span className="field-label">Table (optional)</span><input value={form.table_label} placeholder="Table 4" onChange={(e) => setForm({ ...form, table_label: e.target.value })} /></label>
            <button className="btn btn-primary"><Plus size={15} /> Add</button>
          </motion.form>
        )}
        {mode === 'bulk' && (
          <motion.form key="bulk" className="admin-card" onSubmit={addBulk} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease }}>
            <label className="field">
              <span className="field-label">One guest per line: Name, seats, table (seats and table are optional)</span>
              <textarea rows={6} value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={'Amara Okafor, 2, Table 1\nThe Whitfield Family, 4, Table 3\nGrandma Rosa'} />
            </label>
            <button className="btn btn-primary" disabled={!bulk.trim()}>Add guests</button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="toolbar">
        <div className="search-mini"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search guests or tables" aria-label="Search guests" /></div>
        <div className="filters" role="tablist">
          {[['all', 'All'], ['pending', 'Awaiting'], ['yes', 'Attending'], ['no', 'Declined']].map(([id, label]) => (
            <button key={id} role="tab" aria-selected={filter === id} className={`filter ${filter === id ? 'is-on' : ''}`} onClick={() => setFilter(id)}>
              {label} <span>{counts[id]}</span>
              {filter === id && <motion.i layoutId="filter-bg" className="filter-bg" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
            </button>
          ))}
        </div>
      </div>

      {!guests ? (
        <p className="muted">Loading…</p>
      ) : shown.length === 0 ? (
        <div className="empty small"><Users size={26} /><p className="muted">{guests.length ? 'No guests match.' : 'No guests yet. Add your first guest to create their login.'}</p></div>
      ) : (
        <ul className="guest-list">
          <AnimatePresence initial={false}>
            {shown.map((g) => <GuestRow key={g.id} g={g} onUpdate={update} onInvite={setInvite} onDelete={remove} />)}
          </AnimatePresence>
        </ul>
      )}

      <AnimatePresence>
        {invite && <InviteSheet guest={invite} onClose={() => setInvite(null)} onChanged={(g) => { setGuests((cur) => cur.map((x) => (x.id === g.id ? g : x))); setInvite(g); }} />}
      </AnimatePresence>
    </>
  );
}
