'use server'

import { getEventRaw, getPayloadClient, getViewer } from '@/lib/site'
import type { QuizAnswer } from '@/payload-types'
import type { AnswerResult } from '@/lib/views'

/** Check a quiz answer on the server. Only tagged guests can answer, and only while the quiz is Live. */
export async function answerQuestion(questionId: number, choice: number): Promise<AnswerResult> {
  const viewer = await getViewer()
  if (viewer.role !== 'guest' || !viewer.user.unlocked) return { error: 'The quiz isn’t unlocked for you yet.' }
  const event = await getEventRaw()
  if (event.quizStatus !== 'live') return { error: 'The quiz isn’t live right now.' }

  const payload = await getPayloadClient()
  const q = await payload.findByID({
    collection: 'quiz-questions',
    id: questionId,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  })
  if (!q) return { error: 'Question not found.' }
  const options = q.options
  const correctIndex = options.findIndex((o) => o.isCorrect)
  if (!Number.isInteger(choice) || choice < 0 || choice >= options.length) return { error: 'Invalid answer.' }

  const existing = await payload.find({
    collection: 'quiz-answers',
    where: { and: [{ guest: { equals: viewer.user.id } }, { question: { equals: q.id } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  let answer: QuizAnswer | undefined = existing.docs[0]
  if (!answer) {
    answer = await payload.create({
      collection: 'quiz-answers',
      data: { guest: viewer.user.id, question: q.id, choice, correct: choice === correctIndex },
      overrideAccess: true,
    })
  }
  const right = await payload.count({
    collection: 'quiz-answers',
    where: { and: [{ guest: { equals: viewer.user.id } }, { correct: { equals: true } }] },
  })
  return { choice: answer.choice as number, correct: !!answer.correct, correctIndex, score: right.totalDocs * 100 }
}
