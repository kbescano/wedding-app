'use client'
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1];

/** Fade + rise when scrolled into view. */
export function Reveal({ children, delay = 0, y = 28, className = '', as = 'div', ...rest }) {
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -70px 0px' }}
      transition={{ duration: 0.85, delay, ease }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Words slide up out of a mask, one after another. */
export function Words({ text, className = '', delay = 0, stagger = 0.1, as: Tag = 'span' }) {
  return (
    <Tag className={className} aria-label={text}>
      {text.split(' ').map((w, i) => (
        <span className="word-mask" key={i} aria-hidden="true">
          <motion.span
            className="word"
            initial={{ y: '112%', rotate: 3 }}
            animate={{ y: 0, rotate: 0 }}
            transition={{ duration: 1, delay: delay + i * stagger, ease }}
          >
            {w}
          </motion.span>
          {i < text.split(' ').length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  );
}

/** Slow drifting petals. Pure CSS animation, hidden for reduced motion. */
export function Petals({ count = 16 }) {
  const petals = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const r = (n) => {
          const x = Math.sin((i + 1) * 9301 + n * 49297) * 233280;
          return x - Math.floor(x);
        };
        return {
          left: `${Math.round(r(1) * 100)}%`,
          size: 8 + Math.round(r(2) * 12),
          dur: 14 + r(3) * 14,
          delay: -r(4) * 26,
          sway: 3 + r(5) * 4,
          tone: i % 3,
        };
      }),
    [count],
  );
  return (
    <div className="petals" aria-hidden="true">
      {petals.map((p, i) => (
        <span key={i} className="petal-fall" style={{ left: p.left, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s` }}>
          <i className={`petal tone-${p.tone}`} style={{ width: p.size, height: p.size, animationDuration: `${p.sway}s` }} />
        </span>
      ))}
    </div>
  );
}

function Digit({ value }) {
  return (
    <span className="digit">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          className="digit-face"
          initial={{ y: '-70%', opacity: 0, rotateX: 60 }}
          animate={{ y: 0, opacity: 1, rotateX: 0 }}
          exit={{ y: '70%', opacity: 0, rotateX: -60 }}
          transition={{ duration: 0.45, ease }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function Countdown({ target }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target.getTime() - now);
  const units = [
    ['Days', Math.floor(diff / 86400000)],
    ['Hours', Math.floor(diff / 3600000) % 24],
    ['Minutes', Math.floor(diff / 60000) % 60],
    ['Seconds', Math.floor(diff / 1000) % 60],
  ];
  return (
    <div className="countdown" role="timer" aria-label="Time until the wedding">
      {units.map(([label, n]) => (
        <div className="count-unit" key={label}>
          <div className="count-num">
            {String(n).padStart(label === 'Days' ? 2 : 2, '0').split('').map((d, i) => (
              <Digit key={`${label}-${i}`} value={d} />
            ))}
          </div>
          <span className="count-label">{label}</span>
        </div>
      ))}
    </div>
  );
}

/** Numbers that count up when shown. */
export function CountUp({ to, duration = 1.1 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / (duration * 1000));
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{n}</>;
}
