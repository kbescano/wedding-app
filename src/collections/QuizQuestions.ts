import type { CollectionConfig } from 'payload'
import { isAdmin, adminOnlyField } from '../lib/access'

/**
 * Quiz questions. Read/write is couple-only: the site sends guests the question text
 * and options from the server (never the correct answer) and checks answers server-side.
 */
export const QuizQuestions: CollectionConfig = {
  slug: 'quiz-questions',
  labels: { singular: 'Quiz question', plural: 'Quiz questions' },
  admin: {
    useAsTitle: 'question',
    group: 'Wedding',
    defaultColumns: ['order', 'question'],
    description: 'Switch the quiz on under Globals → Wedding → “Access & games”, and tag guests under Guests.',
  },
  defaultSort: 'order',
  access: { read: isAdmin, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    { name: 'question', type: 'text', required: true, maxLength: 200 },
    {
      name: 'options',
      type: 'array',
      label: 'Answers',
      minRows: 2,
      maxRows: 4,
      required: true,
      labels: { singular: 'Answer', plural: 'Answers' },
      admin: { description: 'Add 2–4 answers and tick exactly one as correct.' },
      validate: (value: unknown) => {
        const rows = (Array.isArray(value) ? value : []) as { isCorrect?: boolean | null }[]
        if (rows.length < 2) return 'Add at least two answers.'
        return rows.filter((r) => r?.isCorrect).length === 1 || 'Tick exactly one correct answer.'
      },
      fields: [
        { name: 'text', type: 'text', required: true, maxLength: 100 },
        { name: 'isCorrect', type: 'checkbox', label: 'Correct answer', defaultValue: false },
      ],
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar', description: 'Lower numbers come first.' },
      access: { update: adminOnlyField },
    },
  ],
}
