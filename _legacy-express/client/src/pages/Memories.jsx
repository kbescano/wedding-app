import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, ChevronLeft, ChevronRight, Download, ImagePlus, Trash2, X, UploadCloud, Check, AlertCircle } from 'lucide-react';
import Page from '../components/Page.jsx';
import Gate from '../components/Gate.jsx';
import { Reveal } from '../components/Motion.jsx';
import { useAuth } from '../context.jsx';
import { useToast } from '../toast.jsx';
import { api, uploadPhoto } from '../api.js';
import { FAKE_PHOTOS } from '../fixtures.js';
import { prepareImage, timeAgo } from '../format.js';

const ease = [0.22, 1, 0.36, 1];

function Tile({ photo }) {
  if (photo.tone) {
    return <div className="tile-fake" style={{ aspectRatio: `${photo.ratio}`, background: `linear-gradient(135deg, ${photo.tone[0]}, ${photo.tone[1]})` }} />;
  }
  return <img src={photo.url} alt={photo.caption || `Photo by ${photo.author}`} loading="lazy" decoding="async" />;
}

function Polaroid({ photo, index, onOpen }) {
  const tilt = ((photo.id * 37) % 7) - 3; // -3..3, stable per photo
  return (
    <motion.figure
      className="polaroid"
      style={{ '--tilt': `${tilt * 0.22}deg` }}
      initial={{ opacity: 0, y: 34, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.7, delay: Math.min(index, 12) * 0.06, ease }}
    >
      <button className="polaroid-img" onClick={() => onOpen(index)} aria-label={`Open photo${photo.caption ? `: ${photo.caption}` : ''}`}>
        <Tile photo={photo} />
      </button>
      <figcaption>
        {photo.caption && <span className="cap">{photo.caption}</span>}
        <span className="by">Uploaded by <b>{photo.author}</b></span>
      </figcaption>
    </motion.figure>
  );
}

function Lightbox({ photos, index, onClose, onNav, onDelete }) {
  const photo = photos[index];
  const [dir, setDir] = useState(0);
  const [asking, setAsking] = useState(false);
  const go = useCallback(
    (d) => {
      if (photos.length < 2) return;
      setDir(d);
      setAsking(false);
      onNav((index + d + photos.length) % photos.length);
    },
    [index, photos.length, onNav],
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [go, onClose]);

  if (!photo) return null;
  return (
    <motion.div className="lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} onClick={onClose}>
      <div className="lightbox-bar" onClick={(e) => e.stopPropagation()}>
        <span className="lightbox-count">{index + 1} / {photos.length}</span>
        <div className="lightbox-actions">
          <a className="icon-btn light" href={photo.url} download aria-label="Download photo" title="Download"><Download size={18} /></a>
          {photo.mine && !asking && <button className="icon-btn light" onClick={() => setAsking(true)} aria-label="Delete photo" title="Delete"><Trash2 size={18} /></button>}
          {asking && (
            <span className="lightbox-confirm">
              <button className="mini danger" onClick={() => { setAsking(false); onDelete(photo); }}>Delete photo</button>
              <button className="mini light" onClick={() => setAsking(false)}>Keep</button>
            </span>
          )}
          <button className="icon-btn light" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
      </div>

      <div className="lightbox-stage" onClick={(e) => e.stopPropagation()}>
        <button className="lb-nav prev" onClick={() => go(-1)} aria-label="Previous photo"><ChevronLeft size={26} /></button>
        <AnimatePresence mode="popLayout" custom={dir} initial={false}>
          <motion.figure
            key={photo.id}
            className="lightbox-figure"
            custom={dir}
            variants={{
              enter: (d) => ({ opacity: 0, x: d * 90, scale: 0.96 }),
              center: { opacity: 1, x: 0, scale: 1 },
              exit: (d) => ({ opacity: 0, x: d * -90, scale: 0.96 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.45, ease }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.4}
            onDragEnd={(_, info) => {
              if (info.offset.x < -70) go(1);
              else if (info.offset.x > 70) go(-1);
            }}
          >
            <img src={photo.url} alt={photo.caption || `Photo by ${photo.author}`} draggable={false} />
            <figcaption>
              {photo.caption && <p className="lb-cap">{photo.caption}</p>}
              <p className="lb-by">Uploaded by <b>{photo.author}</b> · {timeAgo(photo.created_at)}</p>
            </figcaption>
          </motion.figure>
        </AnimatePresence>
        <button className="lb-nav next" onClick={() => go(1)} aria-label="Next photo"><ChevronRight size={26} /></button>
      </div>
    </motion.div>
  );
}

function UploadSheet({ onClose, onUploaded }) {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const input = useRef(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => () => itemsRef.current.forEach((i) => URL.revokeObjectURL(i.preview)), []);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [busy, onClose]);

  const add = (fileList) => {
    const files = [...fileList].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return toast('Please choose image files.', 'error');
    setItems((cur) =>
      [...cur, ...files.map((file) => ({ id: Math.random().toString(36).slice(2), file, preview: URL.createObjectURL(file), caption: '', status: 'ready', progress: 0, error: '' }))].slice(0, 12),
    );
  };
  const patch = (id, p) => setItems((cur) => cur.map((i) => (i.id === id ? { ...i, ...p } : i)));
  const remove = (id) => setItems((cur) => cur.filter((i) => i.id !== id));

  const start = async () => {
    setBusy(true);
    let ok = 0;
    for (const it of itemsRef.current.filter((i) => i.status !== 'done')) {
      patch(it.id, { status: 'uploading', progress: 0, error: '' });
      try {
        const prepared = await prepareImage(it.file);
        const photo = await uploadPhoto(prepared, it.caption, (p) => patch(it.id, { progress: p }));
        patch(it.id, { status: 'done', progress: 1 });
        onUploaded(photo);
        ok++;
      } catch (err) {
        patch(it.id, { status: 'error', error: err.message });
      }
    }
    setBusy(false);
    const failed = itemsRef.current.some((i) => i.status === 'error');
    if (ok && !failed) {
      toast(ok === 1 ? 'Photo added. Thank you!' : `${ok} photos added. Thank you!`);
      setTimeout(onClose, 650);
    }
  };

  const pending = items.filter((i) => i.status !== 'done').length;

  return (
    <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !busy && onClose()}>
      <motion.div
        className="sheet"
        role="dialog"
        aria-label="Add photos"
        initial={{ y: 80, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sheet-head">
          <div>
            <p className="eyebrow">Add to the wall</p>
            <h2 className="h3">Share your photos</h2>
          </div>
          <button className="icon-btn" onClick={onClose} disabled={busy} aria-label="Close"><X size={20} /></button>
        </header>

        <div
          className={`dropzone ${dragging ? 'is-drag' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); add(e.dataTransfer.files); }}
        >
          <motion.span className="drop-icon" animate={dragging ? { y: -6, scale: 1.1 } : { y: 0, scale: 1 }}><UploadCloud size={30} /></motion.span>
          <p><b>Drag photos here</b> or</p>
          <button className="btn btn-primary" onClick={() => input.current.click()} disabled={busy}><ImagePlus size={16} /> Choose photos</button>
          <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
          <p className="muted small">Up to 12 at a time. Your name is added to each one.</p>
        </div>

        <ul className="upload-list">
          <AnimatePresence initial={false}>
            {items.map((it) => (
              <motion.li key={it.id} layout className="upload-item" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.35, ease }}>
                <img src={it.preview} alt="" />
                <div className="upload-fields">
                  <input value={it.caption} maxLength={160} placeholder="Add a caption (optional)" disabled={it.status !== 'ready' && it.status !== 'error'} onChange={(e) => patch(it.id, { caption: e.target.value })} aria-label="Caption" />
                  {it.status === 'uploading' && <div className="progress"><motion.i animate={{ width: `${Math.max(6, it.progress * 100)}%` }} /></div>}
                  {it.status === 'error' && <p className="form-error inline"><AlertCircle size={13} /> {it.error}</p>}
                </div>
                <span className="upload-state">
                  {it.status === 'done' ? <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="done-badge"><Check size={14} /></motion.span> : it.status === 'ready' || it.status === 'error' ? (
                    <button className="icon-btn subtle" onClick={() => remove(it.id)} aria-label="Remove" disabled={busy}><X size={16} /></button>
                  ) : null}
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {items.length > 0 && (
          <footer className="sheet-foot">
            <button className="btn btn-brass" onClick={start} disabled={busy || !pending}>
              <Camera size={16} /> {busy ? 'Uploading…' : `Upload ${pending} ${pending === 1 ? 'photo' : 'photos'}`}
            </button>
          </footer>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function Memories() {
  const { role, canView, openSignIn } = useAuth();
  const toast = useToast();
  const locked = !canView;
  const addPhotos = () => (role ? setSheet(true) : openSignIn());
  const [photos, setPhotos] = useState(null);
  const [open, setOpen] = useState(null);
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    if (locked) return;
    api.get('/api/photos').then((r) => setPhotos(r.photos)).catch((e) => toast(e.message, 'error'));
  }, [locked, role]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = locked ? FAKE_PHOTOS : photos || [];

  const remove = async (photo) => {
    try {
      await api.del(`/api/photos/${photo.id}`);
      setOpen(null);
      setPhotos((cur) => cur.filter((p) => p.id !== photo.id));
      toast('Photo removed.');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <Page className="memories">
      <Gate section="memories">
        <section className="page-head">
          <Reveal y={16}><p className="eyebrow">Memories</p></Reveal>
          <Reveal y={20} delay={0.08}><h1 className="h1">Moments worth <em>keeping</em></h1></Reveal>
          <Reveal y={20} delay={0.16}>
            <p className="lede">Every photo from the celebration, shared by the people who were there. Add yours; your name goes with each one.</p>
          </Reveal>
          <Reveal y={20} delay={0.24} className="head-actions">
            <button className="btn btn-brass" onClick={addPhotos}><Camera size={17} /> {role ? 'Add photos' : 'Sign in to add photos'}</button>
            {!locked && photos && <span className="count-chip">{photos.length} {photos.length === 1 ? 'photo' : 'photos'}</span>}
          </Reveal>
        </section>

        <section className="wall">
          {!locked && photos && photos.length === 0 ? (
            <Reveal className="empty">
              <div className="empty-arch"><Camera size={28} /></div>
              <h3 className="h3">The wall is waiting</h3>
              <p className="muted">Be the first to add a memory.</p>
              <button className="btn btn-primary" onClick={addPhotos}>{role ? 'Add a photo' : 'Sign in to add one'}</button>
            </Reveal>
          ) : (
            <div className="masonry">
              <AnimatePresence initial>
                {list.map((p, i) => (
                  <Polaroid key={p.id} photo={p} index={i} onOpen={setOpen} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      </Gate>

      <AnimatePresence>
        {!locked && open !== null && list[open] && (
          <Lightbox photos={list} index={open} onClose={() => setOpen(null)} onNav={setOpen} onDelete={remove} />
        )}
        {role && sheet && (
          <UploadSheet onClose={() => setSheet(false)} onUploaded={(p) => setPhotos((cur) => [p, ...(cur || [])])} />
        )}
      </AnimatePresence>
    </Page>
  );
}
