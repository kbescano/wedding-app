'use client'
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { CalendarDays, CalendarPlus, ChevronDown, Minus, Navigation, Plus, Shirt, MapPin, Check } from 'lucide-react';
import Page from '../Page.jsx';
import Gate from '../Gate.jsx';
import { Countdown, Petals, Reveal, Words } from '../Motion.jsx';
import { useAuth } from '../AuthContext.jsx';
import { useToast } from '../Toast.jsx';
import { api } from '../../lib/client-api.js';
import { guestView } from '../../lib/views';
import { clock, downloadCalendar, longDate, parseDate, shortDate, weekday } from '../../lib/format.js';

const ease = [0.22, 1, 0.36, 1];

function Hero({ event, guest }) {
  const d = parseDate(event.date, event.time);
  const month = d.toLocaleDateString('en-GB', { month: 'long' });
  return (
    <section className="hero">
      <div className="hero-glow" />
      <Petals />
      <div className="hero-stack">
        <motion.p
          className="eyebrow on-dark"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.9, ease }}
        >
          Together with their families
        </motion.p>

        <div className="invite-wrap">
          {[0, 1].map((i) => (
            <motion.span
              key={i}
              className="arch-line"
              style={{ top: -(12 + i * 12), left: -(12 + i * 12), right: -(12 + i * 12), opacity: 1 - i * 0.45 }}
              initial={{ clipPath: 'inset(100% 0 0 0)' }}
              animate={{ clipPath: 'inset(0% 0 0 0)' }}
              transition={{ duration: 1.7, delay: 0.35 + i * 0.25, ease }}
            />
          ))}
          <motion.article
            className="invite-card"
            initial={{ opacity: 0, y: 46, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1.1, delay: 0.25, ease }}
          >
            <span className="invite-ring" aria-hidden />
            <p className="eyebrow">request the pleasure of your company</p>
            <h1 className="names">
              <Words text={event.partner1} delay={0.8} className="name" />
              <motion.span
                className="amp"
                initial={{ opacity: 0, scale: 0.4, rotate: -20 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ delay: 1.1, type: 'spring', stiffness: 180, damping: 12 }}
              >
                &amp;
              </motion.span>
              <Words text={event.partner2} delay={1.0} className="name" />
            </h1>

            <motion.div
              className="date-lockup"
              initial={{ opacity: 0, scaleX: 0.6 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 1.5, duration: 0.9, ease }}
            >
              <span>{month}</span>
              <strong>{d.getDate()}</strong>
              <span>{d.getFullYear()}</span>
            </motion.div>

            <motion.div
              className="invite-where"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.75, duration: 0.8, ease }}
            >
              <p>
                {weekday(event.date)} at {clock(event.time)}
              </p>
              <p className="venue">{event.venue}</p>
              {guest && (
                <p className="invite-for">
                  For <strong>{guest.name}</strong>
                  {guest.party_size > 1 ? ` · ${guest.party_size} seats` : ''}
                </p>
              )}
            </motion.div>
          </motion.article>
        </div>

        <motion.a
          href="#the-day"
          className="scroll-cue"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.4, duration: 1 }}
          aria-label="Scroll to details"
        >
          <span>Scroll</span>
          <motion.i animate={{ y: [0, 6, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>
            <ChevronDown size={18} />
          </motion.i>
        </motion.a>
      </div>
    </section>
  );
}

function Intro({ event }) {
  return (
    <section className="section intro">
      <Reveal>
        <p className="eyebrow">Save the date</p>
      </Reveal>
      <Reveal delay={0.1}>
        <h2 className="statement">{event.note}</h2>
      </Reveal>
      <Reveal delay={0.2}>
        <Countdown target={parseDate(event.date, event.time)} />
      </Reveal>
    </section>
  );
}

function Details({ event }) {
  const mapsHref =
    event.mapUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([event.venue, event.address].filter(Boolean).join(' '))}`;
  return (
    <section className="section details" id="the-day">
      <Reveal className="section-head">
        <p className="eyebrow">The day</p>
        <h2 className="h2">Everything you need to know</h2>
      </Reveal>
      <div className="detail-grid">
        <Reveal className="detail-card" delay={0}>
          <span className="detail-icon"><CalendarDays size={22} /></span>
          <h3>When</h3>
          <p className="detail-big">{longDate(event.date)}</p>
          <p className="muted">Ceremony begins at {clock(event.time)}</p>
          <button className="btn btn-ghost" onClick={() => downloadCalendar(event)}>
            <CalendarPlus size={16} /> Add to calendar
          </button>
        </Reveal>
        <Reveal className="detail-card" delay={0.12}>
          <span className="detail-icon"><MapPin size={22} /></span>
          <h3>Where</h3>
          <p className="detail-big">{event.venue}</p>
          <p className="muted">{event.address}</p>
          <a className="btn btn-ghost" href={mapsHref} target="_blank" rel="noreferrer">
            <Navigation size={16} /> Get directions
          </a>
        </Reveal>
        <Reveal className="detail-card" delay={0.24}>
          <span className="detail-icon"><Shirt size={22} /></span>
          <h3>Dress code</h3>
          <p className="detail-big">{event.dressCode}</p>
          <p className="muted">{event.dressNote}</p>
          <div className="swatches" aria-label="Suggested colours">
            {event.swatches.map((c, i) => (
              <motion.i
                key={c + i}
                className="swatch"
                style={{ background: c }}
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 + i * 0.09, type: 'spring', stiffness: 260, damping: 16 }}
                whileHover={{ scale: 1.25, y: -3 }}
              />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Schedule({ event }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 55%'] });
  const grow = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });
  return (
    <section className="section schedule">
      <Reveal className="section-head">
        <p className="eyebrow">Order of the day</p>
        <h2 className="h2">How it unfolds</h2>
      </Reveal>
      <ol className="timeline" ref={ref}>
        <span className="timeline-track" aria-hidden />
        <motion.span className="timeline-fill" style={{ scaleY: grow }} aria-hidden />
        {event.schedule.map((s, i) => (
          <motion.li
            key={i}
            className="timeline-item"
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '0px 0px -60px 0px' }}
            transition={{ duration: 0.8, ease }}
          >
            <span className="timeline-time">{clock(s.time)}</span>
            <motion.i
              className="timeline-dot"
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.15 }}
            />
            <div className="timeline-body">
              <h3>{s.title}</h3>
              {s.detail && <p className="muted">{s.detail}</p>}
            </div>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}

function CheckMark() {
  return (
    <motion.svg viewBox="0 0 52 52" className="check-mark" aria-hidden>
      <motion.circle
        cx="26" cy="26" r="23" fill="none" strokeWidth="2"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, ease }}
      />
      <motion.path
        d="M15 27l8 8 15-17" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.6, ease }}
      />
    </motion.svg>
  );
}

function Rsvp({ event }) {
  const { role, guest, setGuest, openSignIn } = useAuth();
  const toast = useToast();
  const answered = guest && guest.rsvp !== 'pending';
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(guest?.rsvp === 'pending' ? null : guest?.rsvp || null);
  const [count, setCount] = useState(guest?.rsvp_count || 1);
  const [meal, setMeal] = useState(guest?.meal || '');
  const [note, setNote] = useState(guest?.note || '');
  const [saving, setSaving] = useState(false);
  const max = guest?.party_size || 1;

  useEffect(() => {
    if (!guest) return;
    setStatus(guest.rsvp === 'pending' ? null : guest.rsvp);
    setCount(guest.rsvp_count || 1);
    setMeal(guest.meal || '');
    setNote(guest.note || '');
  }, [guest?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault();
    if (!status || saving) return;
    setSaving(true);
    try {
      const res = await api.patch(`/api/guests/${guest.id}?depth=0`, { rsvp: status, rsvpCount: count, meal, note });
      setGuest(guestView(res.doc));
      setEditing(false);
      toast(status === 'yes' ? 'Reply received. See you there!' : 'Reply received. Thank you for letting us know.');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const deadline = event.rsvpDeadline ? `Kindly reply by ${shortDate(event.rsvpDeadline)}.` : 'Kindly let us know if you can make it.';

  return (
    <section className="section rsvp on-dark" id="rsvp">
      <Reveal className="section-head">
        <p className="eyebrow on-dark">RSVP</p>
        <h2 className="h2">Will you join us?</h2>
        <p className="lede">{deadline}</p>
      </Reveal>

      <Reveal className="rsvp-card" delay={0.1}>
        {role === 'admin' ? (
          <p className="rsvp-note">You’re viewing as the couple. Guests reply here, and you’ll see their answers on your dashboard.</p>
        ) : !role ? (
          <div className="rsvp-note">
            <p>Replies are for invited guests. Sign in with your invitation code to RSVP.</p>
            <button className="btn btn-brass" onClick={openSignIn}>Sign in with code</button>
          </div>
        ) : answered && !editing ? (
          <motion.div className="rsvp-done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <CheckMark />
            <h3>{guest.rsvp === 'yes' ? `We’ll see you there, ${guest.name.split(' ')[0]}!` : `We’ll miss you, ${guest.name.split(' ')[0]}.`}</h3>
            <p className="muted-light">
              {guest.rsvp === 'yes'
                ? `${guest.rsvp_count} ${guest.rsvp_count === 1 ? 'seat' : 'seats'} reserved${guest.meal ? ` · ${guest.meal}` : ''}`
                : 'Thank you for letting us know.'}
            </p>
            <button className="btn btn-light-ghost" onClick={() => setEditing(true)}>Change my reply</button>
          </motion.div>
        ) : (
          <form onSubmit={submit} className="rsvp-form">
            <div className="choice-row" role="radiogroup" aria-label="Your reply">
              {[
                ['yes', 'Joyfully accepts'],
                ['no', 'Regretfully declines'],
              ].map(([val, label]) => (
                <button
                  type="button"
                  key={val}
                  role="radio"
                  aria-checked={status === val}
                  className={`choice ${status === val ? 'is-on' : ''}`}
                  onClick={() => setStatus(val)}
                >
                  {status === val && <motion.i layoutId="choice-bg" className="choice-bg" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
                  <span className="choice-label">{label}</span>
                  {status === val && <Check size={16} className="choice-check" />}
                </button>
              ))}
            </div>

            <AnimatePresence mode="popLayout" initial={false}>
              {status === 'yes' && (
                <motion.div
                  key="yes"
                  className="rsvp-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.45, ease }}
                >
                  {max > 1 && (
                    <div className="field">
                      <span className="field-label">How many will attend?</span>
                      <div className="stepper">
                        <button type="button" onClick={() => setCount((c) => Math.max(1, c - 1))} aria-label="Fewer"><Minus size={16} /></button>
                        <output><AnimatePresence mode="popLayout" initial={false}><motion.b key={count} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: 0.2 }}>{count}</motion.b></AnimatePresence></output>
                        <button type="button" onClick={() => setCount((c) => Math.min(max, c + 1))} aria-label="More"><Plus size={16} /></button>
                        <span className="muted-light">of {max} seats</span>
                      </div>
                    </div>
                  )}
                  {event.mealOptions.length > 0 && (
                    <label className="field">
                      <span className="field-label">Meal preference</span>
                      <select value={meal} onChange={(e) => setMeal(e.target.value)}>
                        <option value="">No preference</option>
                        {event.mealOptions.map((m) => <option key={m}>{m}</option>)}
                      </select>
                    </label>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {status && (
              <motion.label className="field" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <span className="field-label">{status === 'yes' ? 'Allergies or anything else we should know?' : 'A note for the couple (optional)'}</span>
                <textarea rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
              </motion.label>
            )}

            <div className="rsvp-actions">
              <button className="btn btn-brass" disabled={!status || saving}>{saving ? 'Sending…' : 'Send my reply'}</button>
              {answered && <button type="button" className="btn btn-light-ghost" onClick={() => setEditing(false)}>Cancel</button>}
            </div>
          </form>
        )}
      </Reveal>
    </section>
  );
}

function Footer({ event }) {
  return (
    <footer className="site-footer">
      <Reveal>
        <p className="foot-names">{event.partner1} <em>&amp;</em> {event.partner2}</p>
        <p className="muted">{shortDate(event.date)} · {event.venue}</p>
        <p className="foot-love">With love and gratitude</p>
      </Reveal>
    </footer>
  );
}

export default function HomeView() {
  const { event, guest } = useAuth();
  return (
    <Page className="home">
      <Gate section="home">
        <Hero event={event} guest={guest} />
        <Intro event={event} />
        <Details event={event} />
        <Schedule event={event} />
        <Rsvp event={event} />
        <Footer event={event} />
      </Gate>
    </Page>
  );
}
