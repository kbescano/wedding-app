# Wedding app

A guest-only wedding site: a sealed invitation on the front page, photo **Memories**, **Messages** to the
couple, a live **Quiz**, an RSVP form, a seating finder, and a dashboard for the couple.

## Run it

```bash
npm install
npm run build        # builds the client into client/dist
npm start            # http://localhost:3000
```

For development with hot reload: `npm run dev` (site on :5173, API on :3000).

**Try the demo:** `npm run demo` adds sample guests and photos.

| Who | How |
| --- | --- |
| Guest (demo) | open `/i/WELC-OME7` or enter code `WELC-OME7` |
| Couple | `/admin`, username `couple`, password `forever2027` |

> Change the demo password before sharing anything: `npm run admin:password -- "your new password"`.
> Start fresh (deletes guests, photos, messages): `npm run reset`.

On a brand-new database with no demo data, a random couple password is printed **once** in the server console
(or set `ADMIN_USER` / `ADMIN_PASSWORD` before the first start).

## How it works

- **Sealed by default.** Signed-out visitors see the pages blurred with placeholder content only. Real venue,
  schedule, photos, messages and names never leave the server until a valid code is used.
- **Open access (optional).** In **Dashboard → Event details → Open access**, the couple can switch on a global
  toggle that shows every page to anyone with the link, no code needed. It's off by default and takes effect
  immediately. Visitors can look around (photos, public messages, quiz leaderboard, published seating), but adding
  photos or messages, RSVPing and playing the quiz still need a personal code, because those carry a name. Private
  messages and admin tools stay protected either way.
- **Personal logins.** The couple add guests in **Dashboard → Guests** and press **Send login** for a personal link
  (`/i/ABCD-1234`), QR code and a ready-made WhatsApp/email/text message. A new code can be issued any time.
- **Memories.** Guests upload photos (resized in the browser first). Each shows "Uploaded by NAME". Guests can
  delete their own; the couple can delete any.
- **Messages.** Shown as "Message by NAME". Guests can mark a message private so only the couple can read it.
- **Quiz.** Unlocks only when **both** are true: the couple switch the quiz to **Live**, and the guest is **tagged**
  (Dashboard → Quiz or the "Quiz" switch on each guest). Guest pages unlock automatically within a few seconds.
  Answers are checked on the server, so the correct answers are never sent to the browser early.
- **RSVP + seating.** Guests reply on the invitation. Assign tables in Guests, then publish seating in Event details.

## Deploying

- Needs Node 20+ and a place to keep the `data/` folder (SQLite database + uploaded photos). Set `DATA_DIR` to move it.
- Serve over **HTTPS**. Behind a proxy (nginx, Caddy, Render, Fly, etc.) set `TRUST_PROXY=1` so cookies are marked `Secure`.
- Set `PORT` if needed. Back up `data/` regularly, especially around the wedding.
- Invitation codes act like passwords: anyone with a link can get in as that guest. Login attempts are rate-limited.
