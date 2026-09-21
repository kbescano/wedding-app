import { lazy, Suspense, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion';
import { Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from './context.jsx';
import { useToast } from './toast.jsx';
import { BottomNav, TopNav } from './components/Nav.jsx';
import { SignInModal } from './components/Gate.jsx';
import Home from './pages/Home.jsx';
import Memories from './pages/Memories.jsx';
import Messages from './pages/Messages.jsx';
import Games from './pages/Games.jsx';
import Seating from './pages/Seating.jsx';
import { initials } from './format.js';

const Admin = lazy(() => import('./pages/admin/Admin.jsx'));

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 26, restDelta: 0.001 });
  return <motion.div className="scroll-progress" style={{ scaleX }} />;
}

function Splash({ pub }) {
  return (
    <div className="splash">
      <motion.div
        className="splash-seal"
        animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {pub ? initials(pub.partner1, pub.partner2).split('').join(' & ') : '&'}
      </motion.div>
    </div>
  );
}

export default function App() {
  const { ready, pub, role, guest, login, setLoginNotice } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const code = params.get('code');
  const tried = useRef('');

  /* Personal invitation links (/i/CODE -> /?code=CODE) sign the guest in automatically. */
  useEffect(() => {
    if (!ready || !code) return;
    const clear = () => {
      const next = new URLSearchParams(params);
      next.delete('code');
      setParams(next, { replace: true });
    };
    if (role) return clear();
    if (tried.current === code) return;
    tried.current = code;
    login(code)
      .then((res) => {
        toast(`Welcome, ${res.guest.name}`);
        clear();
      })
      .catch((err) => setLoginNotice(err.message));
  }, [ready, code, role]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (pub) document.title = `${pub.partner1} & ${pub.partner2} · Wedding`;
  }, [pub]);

  if (!ready) return <Splash pub={pub} />;

  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <>
      <ScrollProgress />
      {!isAdmin && <TopNav />}
      <AnimatePresence mode="wait" initial={false} onExitComplete={() => window.scrollTo(0, 0)}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/memories" element={<Memories />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/games" element={<Games />} />
          <Route path="/seating" element={<Seating />} />
          <Route
            path="/admin"
            element={
              <Suspense fallback={<Splash pub={pub} />}>
                <Admin />
              </Suspense>
            }
          />
          <Route path="*" element={<Home />} />
        </Routes>
      </AnimatePresence>
      {!isAdmin && <BottomNav />}
      <SignInModal />
    </>
  );
}
