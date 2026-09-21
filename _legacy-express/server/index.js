import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  db,
  UPLOAD_DIR,
  getEvent,
  setSetting,
  getQuizStatus,
  generateCode,
  normalizeCode,
  hashPassword,
  verifyPassword,
  nowIso,
  ensureAdmin,
  ensureSampleQuiz,
} from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '../client/dist');
const PORT = Number(process.env.PORT) || 3000;

const created = ensureAdmin();
ensureSampleQuiz();

const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY) app.set('trust proxy', 1);
app.use(express.json({ limit: '200kb' }));
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    'X-Frame-Options': 'DENY',
  });
  next();
});

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

const COOKIE = 'wsid';
const GUEST_TTL = 1000 * 60 * 60 * 24 * 60;
const ADMIN_TTL = 1000 * 60 * 60 * 24 * 7;

function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function startSession(req, res, role, guestId, ttl) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, role, guest_id, expires_at) VALUES (?, ?, ?, ?)').run(
    token,
    role,
    guestId ?? null,
    Date.now() + ttl,
  );
  const secure = req.secure ? '; Secure' : '';
  res.append(
    'Set-Cookie',
    `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(ttl / 1000)}${secure}`,
  );
}

function endSession(req, res) {
  const token = parseCookies(req)[COOKIE];
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  res.append('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

app.use((req, _res, next) => {
  req.auth = null;
  const token = parseCookies(req)[COOKIE];
  if (token) {
    const s = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
    if (s && s.expires_at > Date.now()) {
      if (s.role === 'admin') req.auth = { role: 'admin' };
      else {
        const guest = db.prepare('SELECT * FROM guests WHERE id = ?').get(s.guest_id);
        if (guest) req.auth = { role: 'guest', guest };
      }
    }
  }
  next();
});

const requireGuest = (req, res, next) =>
  req.auth ? next() : res.status(401).json({ error: 'Please sign in with your invitation code.' });
/** Signed-in guests always pass. Signed-out visitors pass only while the couple's "open access" switch is on. */
const requireViewer = (req, res, next) =>
  req.auth || getEvent().openAccess
    ? next()
    : res.status(401).json({ error: 'Please sign in with your invitation code.' });
const requireAdmin = (req, res, next) =>
  req.auth?.role === 'admin' ? next() : res.status(403).json({ error: 'Couple access only.' });

/* Basic brute-force protection for both login endpoints. */
const attempts = new Map();
function limited(req) {
  const now = Date.now();
  const key = req.ip;
  const list = (attempts.get(key) || []).filter((t) => now - t < 15 * 60 * 1000);
  attempts.set(key, list);
  return list.length >= 12;
}
const recordFailure = (req) => attempts.set(req.ip, [...(attempts.get(req.ip) || []), Date.now()]);

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const int = (v, min, max, fallback) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const hex = (v) => /^#[0-9a-fA-F]{6}$/.test(v);

const publicGuest = (g) => ({
  id: g.id,
  name: g.name,
  party_size: g.party_size,
  rsvp: g.rsvp,
  rsvp_count: g.rsvp_count,
  meal: g.meal,
  note: g.note,
  unlocked: !!g.unlocked,
});

const adminGuest = (g) => ({
  ...publicGuest(g),
  code: g.code,
  table_label: g.table_label,
  last_login: g.last_login,
  created_at: g.created_at,
});

const photoOut = (p, req) => ({
  id: p.id,
  url: `/uploads/${p.filename}`,
  caption: p.caption,
  author: p.author,
  created_at: p.created_at,
  mine: req.auth?.role === 'admin' || (p.guest_id != null && p.guest_id === req.auth?.guest?.id),
});

const messageOut = (m, req) => ({
  id: m.id,
  author: m.author,
  body: m.body,
  private: !!m.private,
  created_at: m.created_at,
  mine: req.auth?.role === 'admin' || (m.guest_id != null && m.guest_id === req.auth?.guest?.id),
});

/* ------------------------------------------------------------------ */
/* Public + auth                                                       */
/* ------------------------------------------------------------------ */

/** Only what the sealed-invitation screen needs: the names and the date. */
app.get('/api/public', (_req, res) => {
  const e = getEvent();
  res.json({ partner1: e.partner1, partner2: e.partner2, date: e.date, openAccess: !!e.openAccess });
});

app.post('/api/login', (req, res) => {
  if (limited(req)) return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes.' });
  const code = normalizeCode(req.body?.code);
  const guest = code ? db.prepare('SELECT * FROM guests WHERE code = ?').get(code) : null;
  if (!guest) {
    recordFailure(req);
    return res.status(401).json({ error: 'That code doesn’t match an invitation. Please check and try again.' });
  }
  db.prepare('UPDATE guests SET last_login = ? WHERE id = ?').run(nowIso(), guest.id);
  startSession(req, res, 'guest', guest.id, GUEST_TTL);
  res.json({ role: 'guest', guest: publicGuest(guest) });
});

app.post('/api/admin/login', (req, res) => {
  if (limited(req)) return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes.' });
  const username = str(req.body?.username, 60);
  const password = String(req.body?.password ?? '');
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (!admin || !verifyPassword(password, admin.salt, admin.hash)) {
    recordFailure(req);
    return res.status(401).json({ error: 'Incorrect username or password.' });
  }
  startSession(req, res, 'admin', null, ADMIN_TTL);
  res.json({ role: 'admin' });
});

app.post('/api/logout', (req, res) => {
  endSession(req, res);
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  if (!req.auth) return res.json({ role: null });
  if (req.auth.role === 'admin') return res.json({ role: 'admin' });
  res.json({ role: 'guest', guest: publicGuest(req.auth.guest) });
});

/* ------------------------------------------------------------------ */
/* Invitation + RSVP                                                   */
/* ------------------------------------------------------------------ */

app.get('/api/event', requireViewer, (_req, res) => {
  const { seatingPublished, ...event } = getEvent();
  res.json({ ...event, seatingPublished });
});

app.post('/api/rsvp', requireGuest, (req, res) => {
  if (req.auth.role !== 'guest') return res.status(400).json({ error: 'Only invited guests can RSVP.' });
  const g = req.auth.guest;
  const event = getEvent();
  const status = req.body?.status === 'yes' ? 'yes' : req.body?.status === 'no' ? 'no' : null;
  if (!status) return res.status(400).json({ error: 'Please choose accept or decline.' });
  const count = status === 'yes' ? int(req.body?.count, 1, g.party_size, 1) : 0;
  const meal = event.mealOptions.includes(req.body?.meal) ? req.body.meal : '';
  const note = str(req.body?.note, 300);
  db.prepare('UPDATE guests SET rsvp = ?, rsvp_count = ?, meal = ?, note = ? WHERE id = ?').run(
    status,
    count,
    status === 'yes' ? meal : '',
    note,
    g.id,
  );
  res.json({ guest: publicGuest(db.prepare('SELECT * FROM guests WHERE id = ?').get(g.id)) });
});

/* ------------------------------------------------------------------ */
/* Memories (photos)                                                   */
/* ------------------------------------------------------------------ */

const MIME_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + MIME_EXT[file.mimetype]),
  }),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    MIME_EXT[file.mimetype] ? cb(null, true) : cb(new Error('Only JPG, PNG, WebP or GIF photos are supported.')),
});

app.get('/uploads/:name', requireViewer, (req, res) => {
  if (!/^[a-f0-9]{32}\.(jpg|png|webp|gif)$/.test(req.params.name)) return res.status(404).end();
  res.set('Cache-Control', 'private, max-age=86400');
  res.sendFile(req.params.name, { root: UPLOAD_DIR, cacheControl: false }, (err) => {
    if (err && !res.headersSent) res.status(404).end();
  });
});

app.get('/api/photos', requireViewer, (req, res) => {
  const rows = db.prepare('SELECT * FROM photos ORDER BY id DESC').all();
  res.json({ photos: rows.map((p) => photoOut(p, req)) });
});

app.post('/api/photos', requireGuest, upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No photo received.' });
  const isAdmin = req.auth.role === 'admin';
  const guest = req.auth.guest;
  if (!isAdmin) {
    const n = db.prepare('SELECT COUNT(*) AS n FROM photos WHERE guest_id = ?').get(guest.id).n;
    if (n >= 150) {
      fs.rmSync(req.file.path, { force: true });
      return res.status(429).json({ error: 'You’ve reached the upload limit. Thank you for sharing so many!' });
    }
  }
  const info = db
    .prepare('INSERT INTO photos (guest_id, author, filename, caption, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(isAdmin ? null : guest.id, isAdmin ? 'The Couple' : guest.name, req.file.filename, str(req.body?.caption, 160), nowIso());
  const row = db.prepare('SELECT * FROM photos WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ photo: photoOut(row, req) });
});

app.delete('/api/photos/:id', requireGuest, (req, res) => {
  const p = db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Photo not found.' });
  if (!photoOut(p, req).mine) return res.status(403).json({ error: 'You can only remove your own photos.' });
  db.prepare('DELETE FROM photos WHERE id = ?').run(p.id);
  fs.rmSync(path.join(UPLOAD_DIR, p.filename), { force: true });
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* Messages                                                            */
/* ------------------------------------------------------------------ */

app.get('/api/messages', requireViewer, (req, res) => {
  const rows =
    req.auth?.role === 'admin'
      ? db.prepare('SELECT * FROM messages ORDER BY id DESC').all()
      : db
          .prepare('SELECT * FROM messages WHERE private = 0 OR guest_id = ? ORDER BY id DESC')
          .all(req.auth?.guest?.id ?? -1);
  res.json({ messages: rows.map((m) => messageOut(m, req)) });
});

app.post('/api/messages', requireGuest, (req, res) => {
  if (req.auth.role !== 'guest') return res.status(400).json({ error: 'Only invited guests can leave messages.' });
  const body = str(req.body?.body, 800);
  if (body.length < 2) return res.status(400).json({ error: 'Please write a message first.' });
  const g = req.auth.guest;
  const info = db
    .prepare('INSERT INTO messages (guest_id, author, body, private, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(g.id, g.name, body, req.body?.private ? 1 : 0, nowIso());
  const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ message: messageOut(row, req) });
});

app.delete('/api/messages/:id', requireGuest, (req, res) => {
  const m = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Message not found.' });
  if (!messageOut(m, req).mine) return res.status(403).json({ error: 'You can only remove your own messages.' });
  db.prepare('DELETE FROM messages WHERE id = ?').run(m.id);
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* Seating                                                             */
/* ------------------------------------------------------------------ */

app.get('/api/seating', requireViewer, (req, res) => {
  const published = getEvent().seatingPublished || req.auth?.role === 'admin';
  if (!published) return res.json({ published: false, tables: [], mine: null });
  const rows = db.prepare("SELECT name, table_label FROM guests WHERE table_label != '' ORDER BY name COLLATE NOCASE").all();
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.table_label)) map.set(r.table_label, []);
    map.get(r.table_label).push(r.name);
  }
  const tables = [...map.entries()]
    .map(([label, guests]) => ({ label, guests }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  const mine = req.auth?.role === 'guest' ? req.auth.guest.table_label || null : null;
  res.json({ published: true, tables, mine });
});

/* ------------------------------------------------------------------ */
/* Quiz                                                                */
/* ------------------------------------------------------------------ */

function leaderboard(limit = 10) {
  return db
    .prepare(
      `SELECT g.id, g.name, SUM(a.correct) AS score, COUNT(*) AS answered, MAX(a.answered_at) AS last_at
       FROM quiz_answers a JOIN guests g ON g.id = a.guest_id
       GROUP BY g.id
       ORDER BY score DESC, last_at ASC
       LIMIT ?`,
    )
    .all(limit)
    .map((r, i) => ({ rank: i + 1, id: r.id, name: r.name, score: r.score * 100, answered: r.answered }));
}

app.get('/api/quiz', requireViewer, (req, res) => {
  const status = getQuizStatus();
  const isAdmin = req.auth?.role === 'admin';
  const guest = req.auth?.guest;
  const eligible = !!guest?.unlocked;
  const total = db.prepare('SELECT COUNT(*) AS n FROM quiz_questions').get().n;
  const board = leaderboard(10);
  const out = { status, eligible, isAdmin, public: !req.auth, total, leaderboard: board, questions: [], answers: {}, me: null };

  if (guest) {
    const mine = db
      .prepare('SELECT question_id, choice, correct FROM quiz_answers WHERE guest_id = ?')
      .all(guest.id);
    const score = mine.reduce((s, a) => s + a.correct, 0) * 100;
    const all = leaderboard(1000);
    const rank = all.find((r) => r.id === guest.id)?.rank ?? null;
    out.me = { score, answered: mine.length, rank };
  }

  if (status === 'live' && eligible) {
    const qs = db.prepare('SELECT id, question, options FROM quiz_questions ORDER BY position, id').all();
    out.questions = qs.map((q) => ({ id: q.id, question: q.question, options: JSON.parse(q.options) }));
    const answered = db
      .prepare(
        `SELECT a.question_id, a.choice, a.correct, q.correct_index
         FROM quiz_answers a JOIN quiz_questions q ON q.id = a.question_id WHERE a.guest_id = ?`,
      )
      .all(guest.id);
    for (const a of answered)
      out.answers[a.question_id] = { choice: a.choice, correct: !!a.correct, correctIndex: a.correct_index };
  }
  res.json(out);
});

app.post('/api/quiz/answer', requireGuest, (req, res) => {
  const g = req.auth.guest;
  if (req.auth.role !== 'guest' || !g.unlocked) return res.status(403).json({ error: 'The quiz isn’t unlocked for you yet.' });
  if (getQuizStatus() !== 'live') return res.status(409).json({ error: 'The quiz isn’t live right now.' });
  const q = db.prepare('SELECT * FROM quiz_questions WHERE id = ?').get(req.body?.questionId);
  if (!q) return res.status(404).json({ error: 'Question not found.' });
  const options = JSON.parse(q.options);
  const choice = int(req.body?.choice, 0, options.length - 1, -1);
  if (choice < 0) return res.status(400).json({ error: 'Invalid answer.' });

  const existing = db.prepare('SELECT * FROM quiz_answers WHERE guest_id = ? AND question_id = ?').get(g.id, q.id);
  if (!existing) {
    db.prepare('INSERT INTO quiz_answers (guest_id, question_id, choice, correct, answered_at) VALUES (?, ?, ?, ?, ?)').run(
      g.id,
      q.id,
      choice,
      choice === q.correct_index ? 1 : 0,
      nowIso(),
    );
  }
  const a = existing || { choice, correct: choice === q.correct_index ? 1 : 0 };
  const score = db.prepare('SELECT COALESCE(SUM(correct), 0) AS s FROM quiz_answers WHERE guest_id = ?').get(g.id).s * 100;
  res.json({ choice: a.choice, correct: !!a.correct, correctIndex: q.correct_index, score });
});

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

const admin = express.Router();
admin.use(requireAdmin);

admin.get('/stats', (_req, res) => {
  const g = db.prepare(
    `SELECT COUNT(*) AS invited,
            SUM(rsvp = 'yes') AS yes, SUM(rsvp = 'no') AS no, SUM(rsvp = 'pending') AS pending,
            COALESCE(SUM(CASE WHEN rsvp = 'yes' THEN rsvp_count END), 0) AS headcount,
            COALESCE(SUM(unlocked), 0) AS unlocked,
            COALESCE(SUM(party_size), 0) AS seats
     FROM guests`,
  ).get();
  res.json({
    invited: g.invited,
    yes: g.yes || 0,
    no: g.no || 0,
    pending: g.pending || 0,
    headcount: g.headcount,
    unlocked: g.unlocked,
    seats: g.seats,
    photos: db.prepare('SELECT COUNT(*) AS n FROM photos').get().n,
    messages: db.prepare('SELECT COUNT(*) AS n FROM messages').get().n,
    openAccess: !!getEvent().openAccess,
    quizStatus: getQuizStatus(),
    quizQuestions: db.prepare('SELECT COUNT(*) AS n FROM quiz_questions').get().n,
  });
});

admin.get('/event', (_req, res) => res.json({ event: getEvent() }));

/** Global switch: show every page to visitors without a code (read-only). */
admin.put('/access', (req, res) => {
  const openAccess = !!req.body?.openAccess;
  setSetting('event', { ...getEvent(), openAccess });
  res.json({ openAccess });
});

admin.put('/event', (req, res) => {
  const b = req.body || {};
  const cur = getEvent();
  const next = {
    partner1: str(b.partner1, 40) || cur.partner1,
    partner2: str(b.partner2, 40) || cur.partner2,
    date: /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? b.date : cur.date,
    time: /^\d{2}:\d{2}$/.test(b.time) ? b.time : cur.time,
    venue: str(b.venue, 120),
    address: str(b.address, 200),
    mapUrl: /^https?:\/\//.test(b.mapUrl || '') ? str(b.mapUrl, 500) : '',
    note: str(b.note, 200),
    dressCode: str(b.dressCode, 60),
    dressNote: str(b.dressNote, 300),
    swatches: (Array.isArray(b.swatches) ? b.swatches : []).filter(hex).slice(0, 8),
    mealOptions: (Array.isArray(b.mealOptions) ? b.mealOptions : []).map((m) => str(m, 80)).filter(Boolean).slice(0, 10),
    rsvpDeadline: /^\d{4}-\d{2}-\d{2}$/.test(b.rsvpDeadline) ? b.rsvpDeadline : '',
    seatingPublished: !!b.seatingPublished,
    openAccess: !!cur.openAccess,
    schedule: (Array.isArray(b.schedule) ? b.schedule : [])
      .map((s) => ({ time: str(s.time, 8), title: str(s.title, 80), detail: str(s.detail, 160) }))
      .filter((s) => s.title)
      .slice(0, 30),
  };
  setSetting('event', next);
  res.json({ event: getEvent() });
});

admin.get('/guests', (_req, res) => {
  res.json({ guests: db.prepare('SELECT * FROM guests ORDER BY name COLLATE NOCASE').all().map(adminGuest) });
});

const insertGuest = (name, partySize, table) => {
  const info = db
    .prepare('INSERT INTO guests (name, code, party_size, table_label, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(name, generateCode(), partySize, table, nowIso());
  return db.prepare('SELECT * FROM guests WHERE id = ?').get(info.lastInsertRowid);
};

admin.post('/guests', (req, res) => {
  const name = str(req.body?.name, 80);
  if (!name) return res.status(400).json({ error: 'Please enter the guest’s name.' });
  const g = insertGuest(name, int(req.body?.party_size, 1, 20, 1), str(req.body?.table_label, 40));
  res.status(201).json({ guest: adminGuest(g) });
});

admin.post('/guests/bulk', (req, res) => {
  const lines = String(req.body?.text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 500);
  const out = db.transaction(() =>
    lines.map((line) => {
      const [name, seats, table] = line.split(',').map((s) => s.trim());
      return insertGuest(str(name, 80), int(seats, 1, 20, 1), str(table, 40));
    }),
  )();
  res.status(201).json({ guests: out.map(adminGuest) });
});

admin.put('/guests/:id', (req, res) => {
  const g = db.prepare('SELECT * FROM guests WHERE id = ?').get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Guest not found.' });
  const b = req.body || {};
  const next = {
    name: b.name !== undefined ? str(b.name, 80) || g.name : g.name,
    party_size: b.party_size !== undefined ? int(b.party_size, 1, 20, g.party_size) : g.party_size,
    table_label: b.table_label !== undefined ? str(b.table_label, 40) : g.table_label,
    unlocked: b.unlocked !== undefined ? (b.unlocked ? 1 : 0) : g.unlocked,
  };
  db.prepare('UPDATE guests SET name = ?, party_size = ?, table_label = ?, unlocked = ? WHERE id = ?').run(
    next.name,
    next.party_size,
    next.table_label,
    next.unlocked,
    g.id,
  );
  res.json({ guest: adminGuest(db.prepare('SELECT * FROM guests WHERE id = ?').get(g.id)) });
});

admin.post('/guests/:id/regenerate-code', (req, res) => {
  const g = db.prepare('SELECT * FROM guests WHERE id = ?').get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Guest not found.' });
  db.prepare('UPDATE guests SET code = ? WHERE id = ?').run(generateCode(), g.id);
  db.prepare('DELETE FROM sessions WHERE guest_id = ?').run(g.id);
  res.json({ guest: adminGuest(db.prepare('SELECT * FROM guests WHERE id = ?').get(g.id)) });
});

admin.delete('/guests/:id', (req, res) => {
  const id = Number(req.params.id);
  db.transaction(() => {
    db.prepare('DELETE FROM quiz_answers WHERE guest_id = ?').run(id);
    db.prepare('DELETE FROM sessions WHERE guest_id = ?').run(id);
    db.prepare('UPDATE photos SET guest_id = NULL WHERE guest_id = ?').run(id);
    db.prepare('UPDATE messages SET guest_id = NULL WHERE guest_id = ?').run(id);
    db.prepare('DELETE FROM guests WHERE id = ?').run(id);
  })();
  res.json({ ok: true });
});

/* Quiz management */

admin.get('/quiz', (_req, res) => {
  const questions = db
    .prepare('SELECT * FROM quiz_questions ORDER BY position, id')
    .all()
    .map((q) => ({ id: q.id, question: q.question, options: JSON.parse(q.options), correct_index: q.correct_index }));
  res.json({ status: getQuizStatus(), questions, leaderboard: leaderboard(50) });
});

const cleanQuestion = (b) => {
  const options = (Array.isArray(b?.options) ? b.options : []).map((o) => str(o, 100)).filter(Boolean).slice(0, 4);
  const question = str(b?.question, 200);
  const correct = int(b?.correct_index, 0, options.length - 1, 0);
  if (!question || options.length < 2) return null;
  return { question, options, correct };
};

admin.post('/quiz/questions', (req, res) => {
  const q = cleanQuestion(req.body);
  if (!q) return res.status(400).json({ error: 'A question needs text and at least two answers.' });
  const pos = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM quiz_questions').get().p;
  db.prepare('INSERT INTO quiz_questions (position, question, options, correct_index) VALUES (?, ?, ?, ?)').run(
    pos,
    q.question,
    JSON.stringify(q.options),
    q.correct,
  );
  res.status(201).json({ ok: true });
});

admin.put('/quiz/questions/:id', (req, res) => {
  const q = cleanQuestion(req.body);
  if (!q) return res.status(400).json({ error: 'A question needs text and at least two answers.' });
  db.prepare('UPDATE quiz_questions SET question = ?, options = ?, correct_index = ? WHERE id = ?').run(
    q.question,
    JSON.stringify(q.options),
    q.correct,
    req.params.id,
  );
  res.json({ ok: true });
});

admin.delete('/quiz/questions/:id', (req, res) => {
  db.prepare('DELETE FROM quiz_answers WHERE question_id = ?').run(req.params.id);
  db.prepare('DELETE FROM quiz_questions WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

admin.put('/quiz/order', (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const stmt = db.prepare('UPDATE quiz_questions SET position = ? WHERE id = ?');
  db.transaction(() => ids.forEach((id, i) => stmt.run(i, id)))();
  res.json({ ok: true });
});

admin.put('/quiz/status', (req, res) => {
  const status = ['off', 'live', 'ended'].includes(req.body?.status) ? req.body.status : null;
  if (!status) return res.status(400).json({ error: 'Invalid status.' });
  setSetting('quiz_status', status);
  res.json({ status });
});

admin.post('/quiz/reset', (_req, res) => {
  db.prepare('DELETE FROM quiz_answers').run();
  res.json({ ok: true });
});

/** Bulk-tag who can play: everyone attending, everybody, or nobody. */
admin.post('/quiz/unlock', (req, res) => {
  const mode = req.body?.mode;
  if (mode === 'attending') db.prepare("UPDATE guests SET unlocked = (rsvp = 'yes')").run();
  else if (mode === 'all') db.prepare('UPDATE guests SET unlocked = 1').run();
  else if (mode === 'none') db.prepare('UPDATE guests SET unlocked = 0').run();
  else return res.status(400).json({ error: 'Invalid mode.' });
  res.json({ ok: true });
});

app.use('/api/admin', admin);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));

/* ------------------------------------------------------------------ */
/* Static client                                                       */
/* ------------------------------------------------------------------ */

/** Personal invitation links: /i/ABCD-1234 -> /?code=ABCD-1234 */
app.get('/i/:code', (req, res) => res.redirect(302, `/?code=${encodeURIComponent(req.params.code)}`));

if (fs.existsSync(DIST)) {
  app.use(express.static(DIST, { index: false, maxAge: '1h' }));
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    res.sendFile('index.html', { root: DIST });
  });
} else {
  app.get('/', (_req, res) =>
    res.type('text').send('Client not built yet. Run `npm run build`, or use `npm run dev` for development.'),
  );
}

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'That photo is too large (max 25 MB).' : 'Upload failed.';
    return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: msg });
  }
  if (err?.message?.startsWith('Only JPG')) return res.status(415).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

app.listen(PORT, () => {
  console.log(`\n  Wedding app running on http://localhost:${PORT}`);
  if (created) {
    console.log('\n  First-run couple login (shown once):');
    console.log(`    username: ${created.username}`);
    console.log(`    password: ${created.password}${created.generated ? '' : '  (from ADMIN_PASSWORD)'}`);
    console.log('    Change it any time with: npm run admin:password -- <new password>');
  }
  console.log('');
});
