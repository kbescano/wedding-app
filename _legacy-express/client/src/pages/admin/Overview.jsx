import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, CheckCircle2, Clock, Gamepad2, Globe, MessageCircleHeart, Users, XCircle } from 'lucide-react';
import { api } from '../../api.js';
import { CountUp } from '../../components/Motion.jsx';
import { useAuth } from '../../context.jsx';

function Stat({ icon: Icon, label, value, hint, index, tone }) {
  return (
    <motion.div
      className={`stat ${tone || ''}`}
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <Icon size={18} />
      <b><CountUp to={value} /></b>
      <span>{label}</span>
      {hint && <em>{hint}</em>}
    </motion.div>
  );
}

export default function Overview({ goTo }) {
  const { realEvent } = useAuth();
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);

  useEffect(() => {
    api.get('/api/admin/stats').then(setStats);
    api.get('/api/admin/guests').then((r) => setPending(r.guests.filter((g) => g.rsvp === 'pending')));
  }, []);

  if (!stats) return <p className="muted">Loading…</p>;
  const replied = stats.yes + stats.no;

  return (
    <>
      <div className="panel-head">
        <div>
          <p className="eyebrow">Overview</p>
          <h2 className="h2">{realEvent ? `${realEvent.partner1} & ${realEvent.partner2}` : 'Your wedding'}</h2>
        </div>
      </div>

      {stats.openAccess && (
        <motion.div className="notice" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Globe size={18} />
          <p><b>Open access is on.</b> Anyone with the link can view every page without a code.</p>
          <button className="btn btn-ghost small-btn" onClick={() => goTo('content')}>Change</button>
        </motion.div>
      )}

      <div className="stats">
        <Stat index={0} icon={Users} label="Invitations" value={stats.invited} hint={`${stats.seats} seats offered`} />
        <Stat index={1} icon={CheckCircle2} tone="ok" label="Attending" value={stats.headcount} hint={`${stats.yes} ${stats.yes === 1 ? 'reply' : 'replies'}`} />
        <Stat index={2} icon={XCircle} tone="no" label="Declined" value={stats.no} />
        <Stat index={3} icon={Clock} tone="wait" label="Awaiting reply" value={stats.pending} hint={`${replied} of ${stats.invited} answered`} />
        <Stat index={4} icon={Camera} label="Photos" value={stats.photos} />
        <Stat index={5} icon={MessageCircleHeart} label="Messages" value={stats.messages} />
        <Stat index={6} icon={Gamepad2} label="Tagged for quiz" value={stats.unlocked} hint={`Quiz is ${stats.quizStatus}`} />
      </div>

      <section className="admin-card">
        <div className="admin-card-head">
          <h3>Still waiting on a reply</h3>
          <button className="btn btn-ghost" onClick={() => goTo('guests')}>Open guest list</button>
        </div>
        {pending.length === 0 ? (
          <p className="muted">Everyone has replied. 🎉</p>
        ) : (
          <ul className="pending-list">
            {pending.slice(0, 12).map((g, i) => (
              <motion.li key={g.id} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.04 }}>
                <b>{g.name}</b>
                <span className="muted small">{g.last_login ? 'Opened their invitation' : 'Hasn’t opened it yet'}</span>
              </motion.li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
