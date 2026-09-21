import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Check, Pencil, Play, Plus, Square, Power, Trophy } from 'lucide-react';
import { api } from '../../api.js';
import { useToast } from '../../toast.jsx';
import ConfirmDelete from '../../components/Confirm.jsx';

const ease = [0.22, 1, 0.36, 1];

const STATUS = [
  ['off', 'Off', Power, 'Guests see “opens during the celebration”.'],
  ['live', 'Live', Play, 'Tagged guests can play right now.'],
  ['ended', 'Ended', Square, 'Answers close and final standings show.'],
];

function QuestionForm({ initial, onSave, onCancel }) {
  const [q, setQ] = useState(initial?.question || '');
  const [opts, setOpts] = useState(initial?.options?.length ? [...initial.options, '', '', ''].slice(0, 4) : ['', '', '', '']);
  const [correct, setCorrect] = useState(initial?.correct_index ?? 0);
  const filled = opts.filter((o) => o.trim());

  const submit = (e) => {
    e.preventDefault();
    const options = opts.filter((o) => o.trim());
    const correctText = opts[correct];
    onSave({ question: q, options, correct_index: Math.max(0, options.indexOf(correctText)) });
  };

  return (
    <motion.form className="admin-card q-form" onSubmit={submit} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.4, ease }}>
      <label className="field"><span className="field-label">Question</span><input required autoFocus value={q} maxLength={200} onChange={(e) => setQ(e.target.value)} placeholder="Where did we have our first date?" /></label>
      <div className="q-options">
        <span className="field-label">Answers. Tick the correct one</span>
        {opts.map((o, i) => (
          <div key={i} className="q-opt">
            <button type="button" className={`tick ${correct === i ? 'is-on' : ''}`} onClick={() => o.trim() && setCorrect(i)} aria-label={`Mark answer ${'ABCD'[i]} correct`} disabled={!o.trim()}>
              {correct === i && o.trim() ? <Check size={14} /> : 'ABCD'[i]}
            </button>
            <input value={o} maxLength={100} placeholder={i < 2 ? `Answer ${'ABCD'[i]} (required)` : `Answer ${'ABCD'[i]} (optional)`} onChange={(e) => setOpts(opts.map((x, j) => (j === i ? e.target.value : x)))} />
          </div>
        ))}
      </div>
      <div className="form-actions">
        <button className="btn btn-primary" disabled={!q.trim() || filled.length < 2}>Save question</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </motion.form>
  );
}

export default function QuizAdmin() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [editing, setEditing] = useState(null); // question id | 'new'

  const load = async () => {
    const [d, s] = await Promise.all([api.get('/api/admin/quiz'), api.get('/api/admin/stats')]);
    setData(d);
    setStats(s);
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (status) => {
    await api.put('/api/admin/quiz/status', { status });
    setData((d) => ({ ...d, status }));
    toast(status === 'live' ? 'The quiz is live. Tagged guests are unlocking now.' : status === 'ended' ? 'The quiz has ended.' : 'The quiz is switched off.');
  };

  const unlock = async (mode, msg) => {
    await api.post('/api/admin/quiz/unlock', { mode });
    await load();
    toast(msg);
  };

  const save = async (id, body) => {
    try {
      if (id === 'new') await api.post('/api/admin/quiz/questions', body);
      else await api.put(`/api/admin/quiz/questions/${id}`, body);
      setEditing(null);
      await load();
      toast('Question saved.');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const move = async (i, d) => {
    const ids = data.questions.map((q) => q.id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    setData((cur) => ({ ...cur, questions: ids.map((id) => cur.questions.find((q) => q.id === id)) }));
    await api.put('/api/admin/quiz/order', { ids });
  };

  const removeQ = async (q) => {
    await api.del(`/api/admin/quiz/questions/${q.id}`);
    await load();
    toast('Question deleted.');
  };

  const reset = async () => {
    await api.post('/api/admin/quiz/reset');
    await load();
    toast('All scores cleared.');
  };

  if (!data || !stats) return <p className="muted">Loading…</p>;

  return (
    <>
      <div className="panel-head">
        <div>
          <p className="eyebrow">Quiz</p>
          <h2 className="h2">Run the game</h2>
          <p className="muted">Guests can play only when the quiz is live <em>and</em> they’re tagged. Switch it on whenever the moment feels right.</p>
        </div>
      </div>

      <section className="admin-card">
        <h3>1. Tag who can play</h3>
        <p className="muted">{stats.unlocked} of {stats.invited} guests are tagged. You can also tag people one by one from the Guests tab (the “Quiz” switch), for example as they arrive.</p>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={() => unlock('attending', 'Everyone who RSVP’d yes is tagged.')}>Tag everyone attending</button>
          <button className="btn btn-ghost" onClick={() => unlock('all', 'Every guest is tagged.')}>Tag all guests</button>
          <button className="btn btn-ghost" onClick={() => unlock('none', 'All tags cleared.')}>Clear tags</button>
        </div>
      </section>

      <section className="admin-card">
        <h3>2. Switch the quiz</h3>
        <div className="segmented" role="radiogroup" aria-label="Quiz status">
          {STATUS.map(([id, label, Icon, hint]) => (
            <button key={id} role="radio" aria-checked={data.status === id} className={`seg ${data.status === id ? 'is-on' : ''} ${id}`} onClick={() => setStatus(id)}>
              {data.status === id && <motion.i layoutId="seg-bg" className="seg-bg" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
              <span className="seg-label"><Icon size={16} /> {label}</span>
              <span className="seg-hint">{hint}</span>
            </button>
          ))}
        </div>
        {data.status === 'live' && <p className="live-note"><i /> Live now. Guests’ pages update automatically within a few seconds.</p>}
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <h3>3. Questions <span className="muted small">({data.questions.length})</span></h3>
          <button className="btn btn-brass" onClick={() => setEditing('new')}><Plus size={15} /> Add question</button>
        </div>
        <AnimatePresence initial={false}>{editing === 'new' && <QuestionForm key="new" onSave={(b) => save('new', b)} onCancel={() => setEditing(null)} />}</AnimatePresence>
        <ol className="q-list">
          {data.questions.map((q, i) => (
            <motion.li layout="position" key={q.id} className="q-item" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, ease }}>
              {editing === q.id ? (
                <QuestionForm initial={q} onSave={(b) => save(q.id, b)} onCancel={() => setEditing(null)} />
              ) : (
                <>
                  <span className="q-num">{i + 1}</span>
                  <div className="q-body">
                    <b>{q.question}</b>
                    <ul>
                      {q.options.map((o, j) => <li key={j} className={j === q.correct_index ? 'is-correct' : ''}>{j === q.correct_index && <Check size={13} />} {o}</li>)}
                    </ul>
                  </div>
                  <div className="q-actions">
                    <button className="icon-btn subtle" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp size={15} /></button>
                    <button className="icon-btn subtle" disabled={i === data.questions.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown size={15} /></button>
                    <button className="icon-btn subtle" onClick={() => setEditing(q.id)} aria-label="Edit"><Pencil size={15} /></button>
                    <ConfirmDelete onConfirm={() => removeQ(q)} label="Delete question" />
                  </div>
                </>
              )}
            </motion.li>
          ))}
        </ol>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <h3><Trophy size={18} /> Leaderboard</h3>
          <ConfirmDelete onConfirm={reset} label="Reset all scores" />
        </div>
        {data.leaderboard.length === 0 ? <p className="muted">No scores yet.</p> : (
          <ol className="board-admin">
            {data.leaderboard.map((r) => <li key={r.id}><span>{r.rank}</span><b>{r.name}</b><em>{r.answered} answered</em><strong>{r.score}</strong></li>)}
          </ol>
        )}
      </section>
    </>
  );
}
