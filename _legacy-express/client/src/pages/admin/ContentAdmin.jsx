import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Plus, Save, X } from 'lucide-react';
import { api } from '../../api.js';
import { useAuth } from '../../context.jsx';
import { useToast } from '../../toast.jsx';

export default function ContentAdmin() {
  const toast = useToast();
  const { reloadEvent } = useAuth();
  const [e, setE] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get('/api/admin/event').then((r) => setE(r.event)); }, []);
  if (!e) return <p className="muted">Loading…</p>;

  const set = (k) => (ev) => setE({ ...e, [k]: ev.target.value });
  const setSched = (i, k, v) => setE({ ...e, schedule: e.schedule.map((s, j) => (j === i ? { ...s, [k]: v } : s)) });

  const toggleAccess = async (ev) => {
    const openAccess = ev.target.checked;
    setE((cur) => ({ ...cur, openAccess }));
    try {
      await api.put('/api/admin/access', { openAccess });
      toast(openAccess ? 'Open access is on. Anyone with the link can view every page.' : 'Open access is off. The invitation is sealed again.');
    } catch (err) {
      setE((cur) => ({ ...cur, openAccess: !openAccess }));
      toast(err.message, 'error');
    }
  };

  const save = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/api/admin/event', e);
      setE(res.event);
      await reloadEvent();
      toast('Saved. Guests will see the changes straight away.');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save}>
      <div className="panel-head">
        <div>
          <p className="eyebrow">Event details</p>
          <h2 className="h2">What guests see</h2>
          <p className="muted">Signed-in guests see all of this. Turn on Open access to show it to anyone with the link.</p>
        </div>
      </div>

      <section className={`admin-card access-card ${e.openAccess ? 'is-on' : ''}`}>
        <div className="access-text">
          <h3><Globe size={18} /> Open access</h3>
          <p className="muted">
            Show every page to anyone with the link, no code needed. Visitors can look around, but adding photos or messages,
            RSVPing and playing the quiz still need a personal code. Takes effect immediately, no need to save.
          </p>
        </div>
        <label className="switch big">
          <input type="checkbox" checked={!!e.openAccess} onChange={toggleAccess} />
          <i className="switch-track"><i className="switch-thumb" /></i>
          <span>{e.openAccess ? 'On: anyone can view' : 'Off: code required'}</span>
        </label>
      </section>

      <section className="admin-card form-grid">
        <h3>The couple</h3>
        <label className="field"><span className="field-label">Partner one</span><input value={e.partner1} onChange={set('partner1')} required /></label>
        <label className="field"><span className="field-label">Partner two</span><input value={e.partner2} onChange={set('partner2')} required /></label>
        <label className="field"><span className="field-label">Date</span><input type="date" value={e.date} onChange={set('date')} required /></label>
        <label className="field"><span className="field-label">Ceremony time</span><input type="time" value={e.time} onChange={set('time')} required /></label>
        <label className="field full"><span className="field-label">A few words on the invitation</span><input value={e.note} maxLength={200} onChange={set('note')} /></label>
      </section>

      <section className="admin-card form-grid">
        <h3>Venue</h3>
        <label className="field full"><span className="field-label">Venue name</span><input value={e.venue} onChange={set('venue')} /></label>
        <label className="field full"><span className="field-label">Address</span><input value={e.address} onChange={set('address')} /></label>
        <label className="field full"><span className="field-label">Map link (optional)</span><input type="url" value={e.mapUrl} placeholder="https://maps.google.com/…" onChange={set('mapUrl')} /></label>
      </section>

      <section className="admin-card form-grid">
        <h3>Dress code</h3>
        <label className="field"><span className="field-label">Dress code</span><input value={e.dressCode} onChange={set('dressCode')} /></label>
        <label className="field full"><span className="field-label">A note on what to wear</span><textarea rows={2} value={e.dressNote} onChange={set('dressNote')} /></label>
        <div className="field full">
          <span className="field-label">Colour palette</span>
          <div className="swatch-edit">
            {e.swatches.map((c, i) => (
              <span className="swatch-input" key={i}>
                <input type="color" value={c} onChange={(ev) => setE({ ...e, swatches: e.swatches.map((x, j) => (j === i ? ev.target.value : x)) })} aria-label={`Colour ${i + 1}`} />
                <button type="button" onClick={() => setE({ ...e, swatches: e.swatches.filter((_, j) => j !== i) })} aria-label="Remove colour"><X size={12} /></button>
              </span>
            ))}
            {e.swatches.length < 8 && <button type="button" className="swatch-add" onClick={() => setE({ ...e, swatches: [...e.swatches, '#c9a15b'] })} aria-label="Add colour"><Plus size={16} /></button>}
          </div>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-head"><h3>Order of the day</h3><button type="button" className="btn btn-ghost" onClick={() => setE({ ...e, schedule: [...e.schedule, { time: '', title: '', detail: '' }] })}><Plus size={15} /> Add item</button></div>
        <ul className="sched-edit">
          {e.schedule.map((s, i) => (
            <motion.li key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <input type="time" value={s.time} onChange={(ev) => setSched(i, 'time', ev.target.value)} aria-label="Time" />
              <input value={s.title} placeholder="What happens" onChange={(ev) => setSched(i, 'title', ev.target.value)} aria-label="Title" />
              <input value={s.detail} placeholder="A short detail (optional)" onChange={(ev) => setSched(i, 'detail', ev.target.value)} aria-label="Detail" />
              <button type="button" className="icon-btn subtle" onClick={() => setE({ ...e, schedule: e.schedule.filter((_, j) => j !== i) })} aria-label="Remove item"><X size={16} /></button>
            </motion.li>
          ))}
        </ul>
      </section>

      <section className="admin-card form-grid">
        <h3>RSVP & seating</h3>
        <label className="field"><span className="field-label">Reply-by date</span><input type="date" value={e.rsvpDeadline} onChange={set('rsvpDeadline')} /></label>
        <label className="field full"><span className="field-label">Meal options (one per line)</span><textarea rows={3} value={e.mealOptions.join('\n')} onChange={(ev) => setE({ ...e, mealOptions: ev.target.value.split('\n') })} /></label>
        <label className="switch full">
          <input type="checkbox" checked={e.seatingPublished} onChange={(ev) => setE({ ...e, seatingPublished: ev.target.checked })} />
          <i className="switch-track"><i className="switch-thumb" /></i>
          <span>Publish the seating plan to guests (assign tables on the Guests tab)</span>
        </label>
      </section>

      <div className="save-bar">
        <button className="btn btn-brass big" disabled={saving}><Save size={16} /> {saving ? 'Saving…' : 'Save changes'}</button>
      </div>
    </form>
  );
}
