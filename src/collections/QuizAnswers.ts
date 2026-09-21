import type { CollectionConfig } from 'payload'
import { isAdmin } from '../lib/access'

/** One row per guest per question. Written only by the server after it checks the answer. */
export const QuizAnswers: CollectionConfig = {
  slug: 'quiz-answers',
  labels: { singular: 'Quiz answer', plural: 'Quiz answers' },
  admin: {
    group: 'Wedding',
    defaultColumns: ['guest', 'question', 'correct', 'createdAt'],
    description: 'Delete rows here to reset scores.',
  },
  access: { read: isAdmin, create: () => false, update: () => false, delete: isAdmin },
  indexes: [{ fields: ['guest', 'question'], unique: true }],
  fields: [
    { name: 'guest', type: 'relationship', relationTo: 'guests', required: true, maxDepth: 1 },
    { name: 'question', type: 'relationship', relationTo: 'quiz-questions', required: true, maxDepth: 0 },
    { name: 'choice', type: 'number', required: true },
    { name: 'correct', type: 'checkbox', defaultValue: false },
  ],
}
