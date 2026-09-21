import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

/** Details shown behind the blur. Deliberately generic: real venue/times never leave the server before login. */
const placeholderEvent = (pub) => ({
  partner1: pub?.partner1 || 'Isabelle',
  partner2: pub?.partner2 || 'Julian',
  date: pub?.date || '2027-05-15',
  time: '16:00',
  venue: 'The venue name goes here',
  address: '00 Street Name, Town',
  mapUrl: '',
  note: 'A few words from us, waiting behind the seal.',
  dressCode: 'Dress code',
  dressNote: 'A little guidance on what to wear, revealed when you open your invitation.',
  swatches: ['#1F3A2E', '#6B7F5E', '#C9A15B', '#E8DCC4', '#8C5A3C'],
  mealOptions: ['First option', 'Second option', 'Third option'],
  rsvpDeadline: '',
  seatingPublished: false,
  schedule: [
    { time: '15:30', title: 'Guests arrive', detail: 'Details revealed after you sign in.' },
    { time: '16:00', title: 'Ceremony', detail: 'Details revealed after you sign in.' },
    { time: '18:30', title: 'Dinner', detail: 'Details revealed after you sign in.' },
    { time: '20:30', title: 'Celebration', detail: 'Details revealed after you sign in.' },
  ],
});

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [pub, setPub] = useState(null);
  const [auth, setAuth] = useState({ role: null, guest: null });
  const [event, setEvent] = useState(null);
  const [unlockedAt, setUnlockedAt] = useState(0);
  const [loginNotice, setLoginNotice] = useState('');
  const [signInOpen, setSignInOpen] = useState(false);

  const loadEvent = useCallback(async () => {
    try {
      setEvent(await api.get('/api/event'));
    } catch {
      setEvent(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const p = await api.get('/api/public');
        setPub(p);
        const me = await api.get('/api/me');
        setAuth({ role: me.role, guest: me.guest || null });
        if (me.role || p.openAccess) await loadEvent();
      } catch {
        /* server down: sealed view stays */
      }
      setReady(true);
    })();
  }, [loadEvent]);

  /* Signed-out visitors: notice when the couple flip "open access" on or off. */
  useEffect(() => {
    if (!ready || auth.role) return;
    const id = setInterval(async () => {
      if (document.hidden) return;
      try {
        const p = await api.get('/api/public');
        setPub(p);
        if (p.openAccess) await loadEvent();
        else setEvent(null);
      } catch {
        /* ignore */
      }
    }, 15000);
    return () => clearInterval(id);
  }, [ready, auth.role, loadEvent]);

  const openAccess = !!pub?.openAccess;
  const canView = !!auth.role || openAccess;

  const value = useMemo(
    () => ({
      ready,
      pub,
      role: auth.role,
      guest: auth.guest,
      /** True when the visitor may see the pages: signed in, or the couple turned on open access. */
      canView,
      openAccess,
      event: canView && event ? event : placeholderEvent(pub),
      realEvent: event,
      unlockedAt,
      loginNotice,
      setLoginNotice,
      signInOpen,
      openSignIn: () => setSignInOpen(true),
      closeSignIn: () => setSignInOpen(false),
      async login(code) {
        const res = await api.post('/api/login', { code });
        setAuth({ role: 'guest', guest: res.guest });
        setUnlockedAt(Date.now());
        setLoginNotice('');
        await loadEvent();
        return res;
      },
      async adminLogin(username, password) {
        await api.post('/api/admin/login', { username, password });
        setAuth({ role: 'admin', guest: null });
        setUnlockedAt(Date.now());
        await loadEvent();
      },
      async logout() {
        await api.post('/api/logout');
        setAuth({ role: null, guest: null });
        if (!openAccess) setEvent(null);
        setUnlockedAt(0);
      },
      setGuest: (guest) => setAuth((a) => ({ ...a, guest })),
      reloadEvent: loadEvent,
    }),
    [ready, pub, auth, event, unlockedAt, loginNotice, signInOpen, canView, openAccess, loadEvent],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
