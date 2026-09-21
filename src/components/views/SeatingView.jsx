'use client'
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Armchair, Search, Users } from 'lucide-react';
import Page from '../Page.jsx';
import Gate from '../Gate.jsx';
import { Reveal } from '../Motion.jsx';
import { useAuth } from '../AuthContext.jsx';
import { FAKE_TABLES } from '../../lib/fixtures.js';

const ease = [0.22, 1, 0.36, 1];

const shortLabel = (label) => label.match(/\d+/)?.[0] || label.slice(0, 2).toUpperCase();

function RoundTable({ label, count, active }) {
  const n = Math.min(Math.max(count, 1), 14);
  return (
    <svg viewBox="0 0 120 120" className={`round-table ${active ? 'is-active' : ''}`} aria-hidden>
      <circle cx="60" cy="60" r="30" className="table-top" />
      <circle cx="60" cy="60" r="36" className="table-halo" />
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        return (
          <motion.circle
            key={i}
            cx={60 + 47 * Math.cos(a)}
            cy={60 + 47 * Math.sin(a)}
            r="5.5"
            className="seat-dot"
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.25 + i * 0.05, type: 'spring', stiffness: 300, damping: 16 }}
          />
        );
      })}
      <text x="60" y="68" textAnchor="middle" className="table-num">{shortLabel(label)}</text>
    </svg>
  );
}

function Highlight({ text, q }) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

export default function SeatingView({ seating }) {
  const { canView } = useAuth();
  const locked = !canView;
  const data = seating;
  const [q, setQ] = useState('');

  const tables = locked ? FAKE_TABLES : data.tables;
  const query = q.trim();
  const mineTable = data?.mine ? tables.find((t) => t.label === data.mine) : null;

  const matches = useMemo(
    () =>
      new Set(
        query
          ? tables.filter((t) => t.label.toLowerCase().includes(query.toLowerCase()) || t.guests.some((g) => g.toLowerCase().includes(query.toLowerCase()))).map((t) => t.label)
          : [],
      ),
    [tables, query],
  );

  const unpublished = !locked && !data.published;

  return (
    <Page className="seating">
      <Gate section="seating">
        <section className="page-head">
          <Reveal y={16}><p className="eyebrow">Seating</p></Reveal>
          <Reveal y={20} delay={0.08}><h1 className="h1">Find your <em>seat</em></h1></Reveal>
          <Reveal y={20} delay={0.16}><p className="lede">Look yourself up, or find out who you’ll be sitting with.</p></Reveal>
        </section>

        {unpublished ? (
          <Reveal className="empty">
            <div className="empty-arch"><Armchair size={28} /></div>
            <h3 className="h3">The seating plan is on its way</h3>
            <p className="muted">The couple will publish it closer to the day. Check back soon.</p>
          </Reveal>
        ) : (
          <>
            {mineTable && (
              <motion.section
                className="your-table"
                initial={{ opacity: 0, y: 30, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 1, delay: 0.3, ease }}
              >
                <p className="eyebrow on-dark">Your table</p>
                <p className="your-table-label">{mineTable.label}</p>
                <p className="muted-light"><Users size={14} /> Sitting with</p>
                <ul className="mates">
                  {mineTable.guests.map((g, i) => (
                    <motion.li key={g} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 + i * 0.07 }}>{g}</motion.li>
                  ))}
                </ul>
              </motion.section>
            )}

            <div className="search-wrap">
              <Search size={18} aria-hidden />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a name or table…" aria-label="Search guests or tables" />
              {query && <span className="search-count">{matches.size} {matches.size === 1 ? 'table' : 'tables'}</span>}
            </div>

            <div className="tables-grid">
              {tables.map((t, i) => {
                const hit = matches.has(t.label);
                const dim = query && !hit;
                const mine = data?.mine === t.label;
                return (
                  <motion.article
                    key={t.label}
                    className={`table-card ${hit ? 'is-hit' : ''} ${mine ? 'is-mine' : ''}`}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: dim ? 0.3 : 1, y: 0, scale: hit ? 1.02 : 1 }}
                    transition={{ duration: 0.6, delay: query ? 0 : Math.min(i, 8) * 0.06, ease }}
                  >
                    <RoundTable label={t.label} count={t.guests.length} active={hit || mine} />
                    <h3>{t.label}{mine && <span className="you-badge">You</span>}</h3>
                    <ul>
                      {t.guests.map((g, gi) => (
                        <li key={g + gi}><Highlight text={g} q={query} /></li>
                      ))}
                    </ul>
                  </motion.article>
                );
              })}
            </div>
            {!locked && data?.published && tables.length === 0 && (
              <p className="muted center">No tables have been assigned yet.</p>
            )}
            {!locked && query && matches.size === 0 && <p className="muted center">No one by that name. Try a different spelling.</p>}
          </>
        )}
      </Gate>
    </Page>
  );
}
