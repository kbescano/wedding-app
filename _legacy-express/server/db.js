import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(root, 'data'));
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const db = new Database(path.join(DATA_DIR, 'wedding.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  salt TEXT NOT NULL,
  hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS guests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  party_size INTEGER NOT NULL DEFAULT 1,
  rsvp TEXT NOT NULL DEFAULT 'pending',
  rsvp_count INTEGER NOT NULL DEFAULT 0,
  meal TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  table_label TEXT NOT NULL DEFAULT '',
  unlocked INTEGER NOT NULL DEFAULT 0,
  last_login TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  guest_id INTEGER,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id INTEGER,
  author TEXT NOT NULL,
  filename TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id INTEGER,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  private INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS quiz_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  position INTEGER NOT NULL DEFAULT 0,
  question TEXT NOT NULL,
  options TEXT NOT NULL,
  correct_index INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS quiz_answers (
  guest_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  choice INTEGER NOT NULL,
  correct INTEGER NOT NULL,
  answered_at TEXT NOT NULL,
  PRIMARY KEY (guest_id, question_id)
);
`);

/* ---------- settings ---------- */

export const DEFAULT_EVENT = {
  partner1: 'Isabelle',
  partner2: 'Julian',
  date: '2027-05-15',
  time: '16:00',
  venue: 'The Glasshouse at Willow Bend',
  address: '12 Orchard Lane, Willow Bend',
  mapUrl: '',
  note: "We can’t wait to celebrate with you.",
  dressCode: 'Garden formal',
  dressNote:
    'Think deep greens, warm neutrals and soft golds. Flats or block heels are best, as the lawn is soft.',
  swatches: ['#1F3A2E', '#6B7F5E', '#C9A15B', '#E8DCC4', '#8C5A3C'],
  mealOptions: ['Herb-roasted chicken', 'Seared salmon', 'Wild mushroom risotto (vegetarian)'],
  rsvpDeadline: '2027-04-15',
  seatingPublished: false,
  openAccess: false,
  schedule: [
    { time: '15:30', title: 'Guests arrive', detail: 'Welcome drinks on the terrace.' },
    { time: '16:00', title: 'Ceremony', detail: 'Vows beneath the glass dome.' },
    { time: '17:00', title: 'Cocktail hour', detail: 'Canapés, music and the first photos.' },
    { time: '18:30', title: 'Dinner', detail: 'Find your table and settle in.' },
    { time: '20:30', title: 'First dance & party', detail: 'The quiz goes live somewhere in between.' },
  ],
};

export function getSetting(key, fallback = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (!row) return fallback;
  try {
    return JSON.parse(row.value);
  } catch {
    return fallback;
  }
}

export function setSetting(key, value) {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  ).run(key, JSON.stringify(value));
}

export function getEvent() {
  return { ...DEFAULT_EVENT, ...(getSetting('event', {}) || {}) };
}

export function getQuizStatus() {
  return getSetting('quiz_status', 'off');
}

/* ---------- helpers ---------- */

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateCode() {
  for (;;) {
    let code = '';
    const bytes = crypto.randomBytes(8);
    for (let i = 0; i < 8; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    const exists = db.prepare('SELECT 1 FROM guests WHERE code = ?').get(code);
    if (!exists) return code;
  }
}

export const normalizeCode = (input) =>
  String(input || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password, salt, hash) {
  const candidate = crypto.scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, 'hex');
  return candidate.length === stored.length && crypto.timingSafeEqual(candidate, stored);
}

export const nowIso = () => new Date().toISOString();

/** Make sure at least one admin exists. Returns the generated password when one had to be created. */
export function ensureAdmin() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM admins').get().n;
  if (count > 0) return null;
  const username = process.env.ADMIN_USER || 'couple';
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(5).toString('hex');
  const { salt, hash } = hashPassword(password);
  db.prepare('INSERT INTO admins (username, salt, hash) VALUES (?, ?, ?)').run(username, salt, hash);
  return { username, password, generated: !process.env.ADMIN_PASSWORD };
}

export const SAMPLE_QUESTIONS = [
  {
    question: 'Where did the couple first meet?',
    options: ['At a friend’s party', 'On a train', 'At university', 'In a coffee shop'],
    correct_index: 3,
  },
  {
    question: 'Who said “I love you” first?',
    options: ['Isabelle', 'Julian', 'At the same time', 'Nobody remembers'],
    correct_index: 1,
  },
  {
    question: 'What was the first trip they took together?',
    options: ['A weekend by the sea', 'A city break in Lisbon', 'Camping in the mountains', 'A road trip'],
    correct_index: 0,
  },
  {
    question: 'Which one of them is always late?',
    options: ['Isabelle', 'Julian', 'Both, equally', 'Neither, they’re early'],
    correct_index: 2,
  },
  {
    question: 'What song do they say is “their song”?',
    options: ['Can’t Help Falling in Love', 'At Last', 'Thinking Out Loud', 'Just the Way You Are'],
    correct_index: 1,
  },
];

export function ensureSampleQuiz() {
  const n = db.prepare('SELECT COUNT(*) AS n FROM quiz_questions').get().n;
  if (n > 0) return;
  const insert = db.prepare(
    'INSERT INTO quiz_questions (position, question, options, correct_index) VALUES (?, ?, ?, ?)',
  );
  SAMPLE_QUESTIONS.forEach((q, i) => insert.run(i, q.question, JSON.stringify(q.options), q.correct_index));
}
