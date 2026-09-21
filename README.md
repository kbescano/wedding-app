# Wedding app (Next.js + Payload)

A guest-only wedding site built on **Next.js 16** and **Payload CMS 3**: a sealed invitation on the front page,
photo **Memories**, **Messages** to the couple, a live **Quiz**, an RSVP form and a seating finder.
The couple run everything from the Payload admin at `/admin`.

## Run it

```bash
npm install
cp .env.example .env     # then put a long random string in PAYLOAD_SECRET  (openssl rand -hex 32)
npm run dev              # http://localhost:3000   (site)   http://localhost:3000/admin   (couple)
```

Try it with sample data: `npm run seed`

| Who | How |
| --- | --- |
| Guest (demo, quiz-tagged) | open `/i/WELC-OME7`, or enter the code `WELC-OME7` |
| Couple | `/admin` — `couple@example.com` / `forever2027!` (**change this**) |

Without the seed, the first visit to `/admin` asks you to create the couple's login.

## Where things live in Payload

| In the admin | What it is |
| --- | --- |
| **Wedding** (Global) | Everything guests see: names, date, venue, dress code, schedule, RSVP options. The sidebar holds the switches: **Open access**, **Quiz** (off / live / ended) and **Publish seating plan**. |
| **Guests** | Who's invited. Open a guest for their personal link, QR code and a ready-made WhatsApp/email/text message. Guests also carry RSVP answers, table and the "tagged for the quiz" checkbox. |
| **Photos / Messages** | Everything guests share. Delete anything you don't want on the wall. |
| **Quiz questions** | Write questions, tick the correct answer. Deleting rows in **Quiz answers** resets scores. |
| **Couple logins** | Add another admin. |

## How it works

- **Sealed by default.** Signed-out visitors get the pages blurred with placeholder content only. Real venue, schedule,
  photos, messages and names are never sent until a valid code is used (check "view source").
- **Invitation codes.** Guests sign in with the code the couple send them, with no email or password. A signed,
  HTTP-only cookie keeps them signed in for 60 days. Changing a guest's code in the admin invalidates their old link.
- **Open access (optional).** Tick **Open access** in the Wedding global to show every page to anyone with the link, no
  code needed. It's off by default and takes effect as soon as you save. Visitors can look around (photos, public
  messages, quiz leaderboard, published seating), but adding photos or messages, RSVPing and playing the quiz still need
  a personal code, because those carry a name. Private messages and all admin data stay protected either way.
- **The dashboard is couple-only.** The Payload admin, its API and its data need a couple login (Couple logins in the
  admin), and Open access never changes that. Guests and signed-out visitors can't reach the dashboard, guest codes or
  quiz answers. Re-check it any time (the site must be running):
  `COUPLE_EMAIL=you@example.com COUPLE_PASSWORD='...' GUEST_CODE=WELC-OME7 npm run check:access`
  (it tries everything with Open access on and off, then restores your setting).
- **Quiz.** Guests can play only when the quiz is **Live** *and* they're **tagged** (Guests list → "Quiz tagging", or the
  checkbox on each guest). Their page unlocks by itself within a few seconds. Answers are checked on the server, so the
  correct answer is never sent to the browser before a question is answered.
- **Responsive.** Designed for phones, tablets and desktop: a bottom tab bar on phones, a top bar from tablet width up, the
  invitation card and text scale to any screen (including long names), 44px touch targets, no iOS zoom on form fields, and
  the sign-in card stays reachable on a phone in landscape and around notches. The Payload admin is responsive too.
- **Access rules are in Payload**, not just in the UI: every collection and the Wedding global have explicit `access`
  functions (see `src/collections/*` and `src/lib/access.ts`), so the REST API enforces the same rules as the site.
  Photo files are served through Payload too, so they follow the same rule.

## Deploying

```bash
npm run build
npm start
```

- Needs Node 20+ and somewhere to keep two folders: `data/` (SQLite database) and `media/` (uploaded photos).
  Set `DATABASE_URI` (e.g. `file:/var/data/wedding.db`) to move the database.
- Development uses `data/wedding-dev.db` (schema syncs automatically); production uses `data/wedding.db` and applies
  the migrations in `src/migrations` on startup. Use a fresh database for production rather than reusing the dev one.
  If you change collections or fields, run `npm run migrate:create -- my-change` and commit the new migration.
- Serve over **HTTPS**. Behind a proxy (nginx, Caddy, Render, Fly…) make sure it forwards `X-Forwarded-Proto` so
  the guest cookie is marked `Secure`.
- Set a strong `PAYLOAD_SECRET` and keep it. Changing it signs every guest out.
- Back up `data/` and `media/` regularly, especially around the wedding.
- Invitation codes act like passwords: anyone with a link can get in as that guest. Wrong-code attempts are rate-limited.

## Project layout

```
src/
  payload.config.ts        Payload config (collections, global, SQLite)
  collections/             Guests (code sign-in), Photos, Messages, Quiz questions/answers, Users
  globals/Event.ts         The "Wedding" global (incl. Open access)
  components/admin/        Payload admin extras: overview, invite link + QR, quiz tagging
  app/(payload)/           Payload admin + REST routes (generated)
  app/(frontend)/          The guest-facing site (server components + server action for quiz answers)
  components/              Site UI (framer-motion animations)  ·  lib/  server helpers  ·  styles/
  seed.ts                  npm run seed
_legacy-express/           The first version (Express + Vite). Kept for reference; safe to delete.
```
