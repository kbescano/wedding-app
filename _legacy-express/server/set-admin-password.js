import { db, hashPassword } from './db.js';

const [password, username = process.env.ADMIN_USER || 'couple'] = process.argv.slice(2);
if (!password || password.length < 8) {
  console.error('Usage: npm run admin:password -- <new password (8+ characters)> [username]');
  process.exit(1);
}
const { salt, hash } = hashPassword(password);
const res = db.prepare('UPDATE admins SET salt = ?, hash = ? WHERE username = ?').run(salt, hash, username);
if (!res.changes) db.prepare('INSERT INTO admins (username, salt, hash) VALUES (?, ?, ?)').run(username, salt, hash);
db.prepare("DELETE FROM sessions WHERE role = 'admin'").run();
console.log(`Password updated for "${username}".`);
