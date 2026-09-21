/**
 * Fills the app with sample guests, messages and a few placeholder photos so you can
 * click around straight away.   npm run demo      (wipe everything again with: npm run reset)
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { db, UPLOAD_DIR, generateCode, nowIso, ensureAdmin, ensureSampleQuiz, setSetting } from './db.js';

ensureAdmin();
ensureSampleQuiz();

if (db.prepare('SELECT COUNT(*) AS n FROM guests').get().n > 0) {
  console.log('Guests already exist — run `npm run reset` first if you want a fresh demo.');
  process.exit(0);
}

const guests = [
  ['Welcome Guest', 2, 'Table 1', 'yes', 2, 1, 'WELCOME7'],
  ['Amara Okafor', 2, 'Table 1', 'yes', 2, 1],
  ['Daniel Reyes', 1, 'Table 2', 'yes', 1, 1],
  ['The Whitfield Family', 4, 'Table 3', 'yes', 3, 0],
  ['Priya Nair', 2, 'Table 2', 'pending', 0, 0],
  ['Tomás Ferreira', 1, 'Table 3', 'no', 0, 0],
  ['Grandma Rosa', 1, 'Table 1', 'yes', 1, 1],
  ['Lena & Marcus Bauer', 2, 'Table 4', 'pending', 0, 0],
];

const insert = db.prepare(
  `INSERT INTO guests (name, code, party_size, table_label, rsvp, rsvp_count, unlocked, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
);
const ids = guests.map(([name, size, table, rsvp, count, unlocked, code]) =>
  Number(insert.run(name, code || generateCode(), size, table, rsvp, count, unlocked, nowIso()).lastInsertRowid),
);

const msg = db.prepare('INSERT INTO messages (guest_id, author, body, private, created_at) VALUES (?, ?, ?, 0, ?)');
[
  [1, 'Two of the kindest people we know. Here’s to a lifetime of Sunday mornings and long dinners.'],
  [2, 'We’re counting down the days! Save us a dance, and please, no speeches longer than the cake.'],
  [6, 'From the first coffee to the first dance. So happy for you both. All my love, always.'],
].forEach(([i, body], n) => msg.run(ids[i], guests[i][0], body, new Date(Date.now() - n * 3600e3).toISOString()));

/* ---- tiny PNG writer for placeholder "photos" (no image libraries needed) ---- */
const crcOf = (buf) => {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crcOf(body));
  return Buffer.concat([len, body, crc]);
};
function png(w, h, pixel) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const [r, g, b] = pixel(x / w, y / h);
      const o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const scenes = [
  { w: 420, h: 560, a: [31, 58, 46], b: [201, 161, 91], caption: 'Golden hour on the terrace' },
  { w: 560, h: 420, a: [232, 220, 196], b: [140, 90, 60], caption: 'The cake, before it disappeared' },
  { w: 420, h: 420, a: [107, 127, 94], b: [247, 242, 232], caption: 'Cheers!' },
  { w: 420, h: 600, a: [60, 45, 40], b: [222, 190, 140], caption: '' },
  { w: 560, h: 380, a: [201, 161, 91], b: [31, 58, 46], caption: 'Dancing until the lights came on' },
  { w: 420, h: 520, a: [140, 90, 60], b: [232, 220, 196], caption: 'Best seats in the house' },
];
const ins = db.prepare('INSERT INTO photos (guest_id, author, filename, caption, created_at) VALUES (?, ?, ?, ?, ?)');
scenes.forEach((s, i) => {
  const file = crypto.randomBytes(16).toString('hex') + '.png';
  const buf = png(s.w, s.h, (x, y) => {
    const t = Math.min(1, Math.max(0, (x * 0.35 + y * 0.65)));
    const glow = Math.max(0, 1 - Math.hypot(x - 0.65, y - 0.3) * 2.2);
    const base = mix(s.a, s.b, t);
    return mix(base, [255, 244, 220], glow * 0.45);
  });
  fs.writeFileSync(path.join(UPLOAD_DIR, file), buf);
  const who = [1, 2, 3, 6, 1, 3][i];
  ins.run(ids[who], guests[who][0], file, s.caption, new Date(Date.now() - i * 5400e3).toISOString());
});

setSetting('quiz_status', 'off');
console.log('Demo data added. Try the guest code  WELC-OME7  (guest, quiz-tagged) — or open /admin.');
