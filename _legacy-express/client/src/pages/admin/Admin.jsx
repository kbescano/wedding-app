import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Gamepad2, LayoutDashboard, LogOut, PenLine, ShieldCheck, Users } from 'lucide-react';
import Page from '../../components/Page.jsx';
import { useAuth } from '../../context.jsx';
import { useToast } from '../../toast.jsx';
import Overview from './Overview.jsx';
import Guests from './Guests.jsx';
import QuizAdmin from './QuizAdmin.jsx';
import ContentAdmin from './ContentAdmin.jsx';
import Moderation from './Moderation.jsx';
import { initials } from '../../format.js';

const ease = [0.22, 1, 0.36, 1];

const TABS = [
  ['overview', 'Overview', LayoutDashboard, Overview],
  ['guests', 'Guests', Users, Guests],
  ['quiz', 'Quiz', Gamepad2, QuizAdmin],
  ['content', 'Event details', PenLine, ContentAdmin],
  ['moderation', 'Photos & messages', ShieldCheck, Moderation],
];

function AdminLogin() {
  const { adminLogin, pub } = useAuth();
  const [username, setUsername] = useState('couple');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await adminLogin(username, password);
    } catch (err) {
      setError(err.message);
      setShake((n) => n + 1);
      setBusy(false);
    }
  };

  return (
    <div className="admin-login">
      <motion.form
        key={shake}
        className="admin-login-card"
        onSubmit={submit}
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={shake ? { opacity: 1, y: 0, scale: 1, x: [0, -10, 9, -6, 4, 0] } : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: shake ? 0.45 : 0.9, ease }}
      >
        <div className="seal static">{initials(pub?.partner1, pub?.partner2) || '&'}</div>
        <p className="eyebrow">Couple sign-in</p>
        <h1 className="h2">Welcome back</h1>
        <label className="field">
          <span className="field-label">Username</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" />
        </label>
        <label className="field">
          <span className="field-label">Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" autoFocus />
        </label>
        <AnimatePresence>
          {error && <motion.p className="form-error" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>{error}</motion.p>}
        </AnimatePresence>
        <button className="btn btn-primary" disabled={busy || !password}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <Link to="/" className="text-link small"><ArrowLeft size={12} /> Back to the invitation</Link>
      </motion.form>
    </div>
  );
}

function Dashboard() {
  const { logout, pub } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState(() => sessionStorage.getItem('admin-tab') || 'overview');
  const Current = (TABS.find((t) => t[0] === tab) || TABS[0])[3];

  const go = (id) => {
    setTab(id);
    sessionStorage.setItem('admin-tab', id);
  };
  const signOut = async () => {
    await logout();
    navigate('/');
    toast('Signed out.');
  };

  return (
    <div className="admin">
      <header className="admin-bar">
        <Link to="/" className="brand"><span className="brand-mark">{pub ? `${pub.partner1[0]} & ${pub.partner2[0]}` : '&'}</span></Link>
        <span className="admin-title">Couple dashboard</span>
        <div className="admin-bar-actions">
          <Link to="/" className="chip-link">View site</Link>
          <button className="icon-btn" onClick={signOut} aria-label="Sign out" title="Sign out"><LogOut size={17} /></button>
        </div>
      </header>

      <nav className="admin-tabs" aria-label="Dashboard sections">
        {TABS.map(([id, label, Icon]) => (
          <button key={id} className={`admin-tab ${tab === id ? 'is-on' : ''}`} onClick={() => go(id)}>
            <Icon size={16} /> <span>{label}</span>
            {tab === id && <motion.i layoutId="admin-tab-underline" className="admin-tab-underline" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
          </button>
        ))}
      </nav>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          className="admin-panel"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease }}
        >
          <Current goTo={go} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function Admin() {
  const { role } = useAuth();
  return <Page className="admin-page">{role === 'admin' ? <Dashboard /> : <AdminLogin />}</Page>;
}
