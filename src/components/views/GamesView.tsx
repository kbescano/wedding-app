'use client'
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { ArrowRight, Check, Crown, Lock, LockOpen, PartyPopper, Trophy, X } from 'lucide-react'
import Page from '../Page'
import Gate from '../Gate'
import { CountUp, Reveal, ease } from '../Motion'
import { useAuth } from '../AuthContext'
import { useToast } from '../Toast'
import { answerQuestion } from '@/app/(frontend)/actions'
import { errorMessage } from '../../lib/client-api'
import type { LeaderRow, QuizAnswer, QuizState, QuizStatus } from '../../lib/views'

const COLORS = ['#B98A3E', '#D9B877', '#1E3B2E', '#F6F0E4', '#6B7F5E']

const fire = (origin = { x: 0.5, y: 0.6 }, count = 70) =>
  confetti({
    particleCount: count,
    spread: 75,
    startVelocity: 38,
    origin,
    colors: COLORS,
    disableForReducedMotion: true,
    ticks: 190,
  })

function bigBurst() {
  fire({ x: 0.2, y: 0.7 }, 90)
  setTimeout(() => fire({ x: 0.8, y: 0.7 }, 90), 180)
  setTimeout(() => fire({ x: 0.5, y: 0.5 }, 120), 380)
}

function Leaderboard({ rows, meId, title = 'Leaderboard' }: { rows: LeaderRow[]; meId?: number; title?: string }) {
  return (
    <aside className="leaderboard card">
      <header>
        <Trophy size={18} />
        <h3>{title}</h3>
      </header>
      {rows.length === 0 ? (
        <p className="muted small">No scores yet. Be the first on the board.</p>
      ) : (
        <ol>
          <AnimatePresence initial={false}>
            {rows.map((r) => (
              <motion.li
                key={r.id}
                layout
                className={`lb-row rank-${r.rank} ${r.id === meId ? 'is-me' : ''}`}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                <span className="lb-rank">{r.rank === 1 ? <Crown size={15} /> : r.rank}</span>
                <span className="lb-name">
                  {r.name}
                  {r.id === meId && <em> (you)</em>}
                </span>
                <span className="lb-score">{r.score}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}
    </aside>
  )
}

function StatePanel({
  icon,
  open = false,
  eyebrow,
  title,
  children,
}: {
  icon?: ReactNode
  open?: boolean
  eyebrow: string
  title: string
  children?: ReactNode
}) {
  return (
    <motion.div
      className="state-panel card"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease }}
    >
      <div className={`padlock ${open ? 'is-open' : ''}`}>
        <motion.span
          key={open ? 'o' : 'c'}
          initial={{ scale: 0.5, rotate: open ? -25 : 0, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 13 }}
        >
          {icon || (open ? <LockOpen size={34} /> : <Lock size={34} />)}
        </motion.span>
        {!open && <i className="pulse-ring" />}
        {!open && <i className="pulse-ring delay" />}
      </div>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="h2">{title}</h2>
      <div className="state-body">{children}</div>
    </motion.div>
  )
}

function Play({ data, refresh }: { data: QuizState; refresh: () => void }) {
  const toast = useToast()
  const qs = data.questions
  const [answers, setAnswers] = useState<Record<string, QuizAnswer>>(data.answers)
  const [started, setStarted] = useState(Object.keys(data.answers).length > 0)
  const [idx, setIdx] = useState(() => {
    const i = qs.findIndex((q) => !data.answers[q.id])
    return i === -1 ? qs.length : i
  })
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(0)

  const q = qs[idx] as QuizState['questions'][number] | undefined
  const a: QuizAnswer | undefined = q ? answers[q.id] : undefined
  const done = idx >= qs.length
  const correctCount = Object.values(answers).filter((x) => x.correct).length
  const score = correctCount * 100

  useEffect(() => {
    if (done && qs.length) setTimeout(bigBurst, 350)
  }, [done]) // eslint-disable-line react-hooks/exhaustive-deps

  const pick = async (i: number, e: MouseEvent<HTMLButtonElement>) => {
    if (!q || a || busy) return
    const rect = e.currentTarget.getBoundingClientRect()
    setBusy(true)
    try {
      const r = await answerQuestion(q.id, i)
      if ('error' in r) throw new Error(r.error)
      setAnswers((cur) => ({ ...cur, [q.id]: { choice: r.choice, correct: r.correct, correctIndex: r.correctIndex } }))
      if (r.correct)
        fire({ x: (rect.left + rect.width / 2) / innerWidth, y: (rect.top + rect.height / 2) / innerHeight }, 55)
      else setShake((n) => n + 1)
      refresh()
    } catch (err) {
      toast(errorMessage(err), 'error')
      refresh()
    } finally {
      setBusy(false)
    }
  }

  if (!qs.length) {
    return (
      <StatePanel eyebrow="Almost ready" title="No questions yet">
        The couple are still writing the questions. Hang tight.
      </StatePanel>
    )
  }

  if (done) {
    return (
      <motion.div
        className="quiz-card result card"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease }}
      >
        <motion.span
          className="result-icon"
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.2 }}
        >
          <PartyPopper size={34} />
        </motion.span>
        <p className="eyebrow">You finished</p>
        <p className="result-score">
          <CountUp to={score} />
          <small> pts</small>
        </p>
        <p className="lede">
          {correctCount} of {qs.length} right
          {data.me?.rank ? ` · you’re #${data.me.rank} on the leaderboard` : ''}
        </p>
        <p className="muted">
          {correctCount === qs.length
            ? 'A perfect score. You know them very well.'
            : correctCount >= qs.length / 2
              ? 'Nicely done. You clearly pay attention.'
              : 'Good effort. There’s always the dance floor.'}
        </p>
      </motion.div>
    )
  }

  if (!started) {
    return (
      <motion.div
        className="quiz-card intro card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease }}
      >
        <span className="result-icon">
          <LockOpen size={30} />
        </span>
        <p className="eyebrow">You’re in</p>
        <h2 className="h2">{qs.length} questions about the couple</h2>
        <p className="muted">
          Each right answer is worth 100 points. Answers lock in as soon as you tap, so go with your gut.
        </p>
        <button className="btn btn-brass big" onClick={() => setStarted(true)}>
          Start the quiz <ArrowRight size={18} />
        </button>
      </motion.div>
    )
  }

  if (!q) return null // (unreachable: `done` above covers running out of questions)

  return (
    <div className="quiz-card card">
      <header className="quiz-top">
        <span>
          Question <b>{idx + 1}</b> of {qs.length}
        </span>
        <span className="score-chip">
          <motion.b key={score} initial={{ scale: 1.5 }} animate={{ scale: 1 }}>
            {score}
          </motion.b>{' '}
          pts
        </span>
      </header>
      <div className="quiz-progress">
        <motion.i
          animate={{ width: `${(idx / qs.length) * 100 + (a ? 100 / qs.length : 0)}%` }}
          transition={{ duration: 0.7, ease }}
        />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={q.id}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -60 }}
          transition={{ duration: 0.4, ease }}
        >
          <motion.h2
            className="quiz-question"
            key={shake}
            animate={shake ? { x: [0, -8, 7, -4, 0] } : undefined}
            transition={{ duration: 0.4 }}
          >
            {q.question}
          </motion.h2>
          <div className="options">
            {q.options.map((opt, i) => {
              const isPicked = a?.choice === i
              const isCorrect = a && a.correctIndex === i
              const cls = a ? (isCorrect ? 'is-correct' : isPicked ? 'is-wrong' : 'is-dim') : ''
              return (
                <motion.button
                  key={i}
                  className={`option ${cls}`}
                  onClick={(e) => pick(i, e)}
                  disabled={!!a || busy}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * i + 0.1, duration: 0.5, ease }}
                  whileHover={!a ? { x: 6 } : undefined}
                  whileTap={!a ? { scale: 0.98 } : undefined}
                >
                  <span className="opt-letter">
                    {isCorrect ? <Check size={16} /> : isPicked && a ? <X size={16} /> : 'ABCD'[i]}
                  </span>
                  <span className="opt-text">{opt}</span>
                </motion.button>
              )
            })}
          </div>

          <AnimatePresence>
            {a && (
              <motion.div
                className="quiz-feedback"
                initial={{ opacity: 0, y: 12, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                transition={{ duration: 0.4, ease }}
              >
                <p className={a.correct ? 'good' : 'bad'}>
                  {a.correct ? 'Correct! +100 points' : `Not quite. It was “${q.options[a.correctIndex]}”.`}
                </p>
                <button className="btn btn-primary" onClick={() => setIdx((n) => n + 1)}>
                  {idx + 1 >= qs.length ? 'See my results' : 'Next question'} <ArrowRight size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

const PREVIEW = {
  question: 'How well do you know the couple?',
  options: ['First answer', 'Second answer', 'Third answer', 'Fourth answer'],
}

export default function GamesView({ data }: { data: QuizState | null }) {
  const { role, guest, canView, openSignIn } = useAuth()
  const toast = useToast()
  const router = useRouter()
  const locked = !canView
  const prev = useRef<{ status: QuizStatus; eligible: boolean } | null>(null)
  const load = () => router.refresh()

  /* The couple switch the quiz on during the event: poll the server so it unlocks by itself. */
  useEffect(() => {
    if (locked) return
    const id = setInterval(() => !document.hidden && router.refresh(), 4000)
    const onVis = () => !document.hidden && router.refresh()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [locked, router])

  /* The moment the couple switch the quiz on (or tag this guest), celebrate the unlock. */
  const eligible = data?.eligible
  useEffect(() => {
    if (!data) return
    const was = prev.current
    prev.current = { status: data.status, eligible: data.eligible }
    if (was && data.status === 'live' && data.eligible && !(was.status === 'live' && was.eligible)) {
      toast('The quiz just unlocked. Good luck!')
      bigBurst()
    }
  }, [data?.status, eligible]) // eslint-disable-line react-hooks/exhaustive-deps

  const status = data?.status
  const meId = guest?.id

  let body: ReactNode
  if (locked) {
    body = (
      <div className="quiz-card card">
        <header className="quiz-top">
          <span>
            Question <b>1</b> of 5
          </span>
          <span className="score-chip">
            <b>0</b> pts
          </span>
        </header>
        <div className="quiz-progress">
          <i style={{ width: '20%' }} />
        </div>
        <h2 className="quiz-question">{PREVIEW.question}</h2>
        <div className="options">
          {PREVIEW.options.map((o, i) => (
            <button key={i} className="option">
              <span className="opt-letter">{'ABCD'[i]}</span>
              <span className="opt-text">{o}</span>
            </button>
          ))}
        </div>
      </div>
    )
  } else if (!data) {
    body = (
      <div className="state-panel card">
        <p className="muted">Loading…</p>
      </div>
    )
  } else if (data.isAdmin) {
    body = (
      <StatePanel
        open={status === 'live'}
        eyebrow="Couple view"
        title={
          status === 'live'
            ? 'The quiz is live'
            : status === 'ended'
              ? 'The quiz has ended'
              : 'The quiz is switched off'
        }
      >
        <p className="muted">
          You control the quiz from your dashboard: switch it live, tag guests, and edit questions.
        </p>
        <a href="/admin/globals/event" className="btn btn-primary">
          Open dashboard <ArrowRight size={16} />
        </a>
      </StatePanel>
    )
  } else if (status === 'off') {
    body = (
      <StatePanel eyebrow="Coming up" title="Opens during the celebration">
        <p className="muted">
          The couple will switch the quiz on during the event. Keep this page open. It unlocks by itself the moment they
          do.
        </p>
        <p className="waiting">
          <i /> Waiting for the couple
        </p>
      </StatePanel>
    )
  } else if (status === 'live' && data.public) {
    body = (
      <StatePanel eyebrow="The quiz is live" title="Sign in to play">
        <p className="muted">
          Scores are kept by name, so playing needs your personal invitation code. You can follow the leaderboard in the
          meantime.
        </p>
        <button className="btn btn-brass" onClick={openSignIn}>
          Sign in with code
        </button>
      </StatePanel>
    )
  } else if (status === 'live' && !data.eligible) {
    body = (
      <StatePanel eyebrow="The quiz is live" title="One more step">
        <p className="muted">
          The quiz is on, but your invitation hasn’t been tagged in yet. Say hello to the couple (or the host) at the
          event and they’ll unlock it for you. This page will open the moment they do.
        </p>
        <p className="waiting">
          <i /> Waiting to be tagged in
        </p>
      </StatePanel>
    )
  } else if (status === 'live') {
    body = <Play data={data} refresh={load} />
  } else {
    body = (
      <StatePanel open icon={<Trophy size={34} />} eyebrow="That’s a wrap" title="The quiz has ended">
        {data.me?.answered ? (
          <p className="lede">
            You scored{' '}
            <b>
              <CountUp to={data.me.score} />
            </b>{' '}
            points{data.me.rank ? ` and finished #${data.me.rank}` : ''}.
          </p>
        ) : (
          <p className="muted">Thanks for being part of the celebration. See the final standings below.</p>
        )}
      </StatePanel>
    )
  }

  const showBoard = !locked && data && (status === 'live' || status === 'ended')
  const pill =
    locked || !data
      ? null
      : status === 'live'
        ? ['live', 'Live now']
        : status === 'ended'
          ? ['ended', 'Finished']
          : ['off', 'Not started']

  return (
    <Page className="games">
      <Gate section="games">
        <section className="page-head">
          <Reveal y={16}>
            <p className="eyebrow">Games</p>
          </Reveal>
          <Reveal y={20} delay={0.08}>
            <h1 className="h1">
              How well do you <em>know us?</em>
            </h1>
          </Reveal>
          <Reveal y={20} delay={0.16}>
            <p className="lede">
              A little quiz about the couple. Unlocked at the event for guests the couple tag in, and only while it’s
              live.
            </p>
          </Reveal>
          {pill && (
            <Reveal y={10} delay={0.22}>
              <span className={`status-pill ${pill[0]}`}>
                <i /> {pill[1]}
              </span>
            </Reveal>
          )}
        </section>

        <section className={`quiz-layout ${showBoard ? 'with-board' : ''}`}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={locked ? 'preview' : `${status}-${data?.eligible}-${data?.isAdmin}`}
              className="quiz-main"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.4, ease }}
            >
              {body}
            </motion.div>
          </AnimatePresence>
          {showBoard && (
            <Leaderboard
              rows={data.leaderboard}
              meId={meId}
              title={status === 'ended' ? 'Final standings' : 'Live leaderboard'}
            />
          )}
        </section>
      </Gate>
    </Page>
  )
}
