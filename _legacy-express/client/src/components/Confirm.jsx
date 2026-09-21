import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';

/** A trash button that asks "sure?" inline before firing. */
export default function ConfirmDelete({ onConfirm, label = 'Delete', className = '' }) {
  const [asking, setAsking] = useState(false);
  useEffect(() => {
    if (!asking) return;
    const t = setTimeout(() => setAsking(false), 4000);
    return () => clearTimeout(t);
  }, [asking]);
  return (
    <span className={`confirm ${className}`}>
      <AnimatePresence mode="wait" initial={false}>
        {asking ? (
          <motion.span key="ask" className="confirm-ask" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
            <button className="mini danger" onClick={() => { setAsking(false); onConfirm(); }}>Yes, delete</button>
            <button className="mini" onClick={() => setAsking(false)}>Keep</button>
          </motion.span>
        ) : (
          <motion.button key="btn" className="icon-btn subtle" aria-label={label} title={label} onClick={() => setAsking(true)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Trash2 size={15} />
          </motion.button>
        )}
      </AnimatePresence>
    </span>
  );
}
