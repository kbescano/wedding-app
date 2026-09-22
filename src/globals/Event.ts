import type { GlobalConfig } from 'payload'
import { canView, isAdmin } from '../lib/access'

const hhmm = (v: unknown) => !v || /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v)) || 'Use 24-hour time, like 16:00'
const ymd = (v: unknown) => !v || /^\d{4}-\d{2}-\d{2}$/.test(String(v)) || 'Use the format 2027-05-15'
const hex = (v: unknown) => /^#[0-9a-fA-F]{6}$/.test(String(v ?? '')) || 'Use a hex colour, like #1E3B2E'

/**
 * The wedding's global settings: everything guests see on the invitation,
 * plus the switches that control access and the quiz.
 */
export const Event: GlobalConfig = {
  slug: 'event',
  label: 'Wedding',
  admin: { group: 'Wedding' },
  access: {
    // Signed-in guests, or anyone while Open access is on. The public sealed screen only ever gets
    // the names and date, and those are read on the server, never through this endpoint.
    read: canView,
    update: isAdmin,
  },
  fields: [
    /* --- Sidebar: the switches the couple reach for during the event --- */
    {
      name: 'openAccess',
      type: 'checkbox',
      label: 'Open access',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'ON: anyone with the link can view every page, no code needed. They can still only add photos or messages, RSVP and play the quiz with a personal code. OFF: the invitation stays sealed until a code is entered.',
      },
    },
    {
      name: 'quizStatus',
      type: 'radio',
      label: 'Quiz',
      defaultValue: 'off',
      options: [
        { label: 'Off (guests see “opens during the celebration”)', value: 'off' },
        { label: 'Live (tagged guests can play now)', value: 'live' },
        { label: 'Ended (final standings)', value: 'ended' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'seatingPublished',
      type: 'checkbox',
      label: 'Publish seating plan',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'Assign tables under Guests first.' },
    },

    {
      type: 'tabs',
      tabs: [
        {
          label: 'Couple & venue',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'partner1', type: 'text', required: true, defaultValue: 'Nira' },
                { name: 'partner2', type: 'text', required: true, defaultValue: 'Ken' },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'date',
                  type: 'text',
                  required: true,
                  defaultValue: '2027-05-15',
                  validate: ymd,
                  label: 'Wedding date',
                  admin: { description: 'Format: 2027-05-15' },
                },
                {
                  name: 'time',
                  type: 'text',
                  required: true,
                  defaultValue: '16:00',
                  validate: hhmm,
                  label: 'Ceremony time',
                  admin: { description: '24-hour, e.g. 16:00' },
                },
              ],
            },
            {
              name: 'note',
              type: 'text',
              maxLength: 200,
              defaultValue: 'We can’t wait to celebrate with you.',
              label: 'A few words on the invitation',
            },
            { name: 'venue', type: 'text', defaultValue: 'The Garden Pavilion at Tagaytay' },
            { name: 'address', type: 'text', defaultValue: '123 Aguinaldo Highway, Tagaytay City, Cavite' },
            {
              name: 'mapUrl',
              type: 'text',
              label: 'Map link (optional)',
              validate: (v: unknown) =>
                !v || /^https?:\/\//.test(String(v)) || 'Use a full link starting with https://',
            },
          ],
        },
        {
          label: 'Dress code',
          fields: [
            { name: 'dressCode', type: 'text', defaultValue: 'Garden formal (barong and filipiniana welcome)' },
            {
              name: 'dressNote',
              type: 'textarea',
              maxLength: 300,
              defaultValue:
                'Think deep greens, warm neutrals and soft golds — barong tagalog and filipiniana are especially welcome. Flats or block heels are best, as the lawn is soft.',
            },
            {
              name: 'swatches',
              type: 'array',
              label: 'Colour palette',
              maxRows: 8,
              labels: { singular: 'Colour', plural: 'Colours' },
              defaultValue: ['#1F3A2E', '#6B7F5E', '#C9A15B', '#E8DCC4', '#8C5A3C'].map((color) => ({ color })),
              fields: [
                {
                  name: 'color',
                  type: 'text',
                  required: true,
                  validate: hex,
                  admin: { description: 'Hex colour, e.g. #1E3B2E' },
                },
              ],
            },
          ],
        },
        {
          label: 'Order of the day',
          fields: [
            {
              name: 'schedule',
              type: 'array',
              maxRows: 30,
              labels: { singular: 'Item', plural: 'Items' },
              defaultValue: [
                { time: '15:30', title: 'Guests arrive', detail: 'Welcome drinks with a view of Taal Volcano.' },
                { time: '16:00', title: 'Ceremony', detail: 'Vows beneath the garden pavilion.' },
                { time: '17:00', title: 'Cocktail hour', detail: 'Pulutan, music and the first photos.' },
                { time: '18:30', title: 'Dinner', detail: 'Find your table and settle in.' },
                {
                  time: '20:30',
                  title: 'First dance & party',
                  detail: 'The money dance, then the quiz goes live somewhere in between.',
                },
              ],
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'time',
                      type: 'text',
                      validate: hhmm,
                      admin: { width: '25%', description: '24-hour, e.g. 16:00' },
                    },
                    { name: 'title', type: 'text', required: true, admin: { width: '75%' } },
                  ],
                },
                { name: 'detail', type: 'text', maxLength: 160 },
              ],
            },
          ],
        },
        {
          label: 'RSVP',
          fields: [
            {
              name: 'rsvpDeadline',
              type: 'text',
              validate: ymd,
              label: 'Reply-by date',
              defaultValue: '2027-04-15',
              admin: { description: 'Format: 2027-04-15' },
            },
            {
              name: 'mealOptions',
              type: 'array',
              maxRows: 10,
              labels: { singular: 'Meal option', plural: 'Meal options' },
              defaultValue: ['Chicken inasal', 'Beef kare-kare', 'Pancit bihon (vegetarian)'].map((option) => ({
                option,
              })),
              fields: [{ name: 'option', type: 'text', required: true, maxLength: 80 }],
            },
          ],
        },
      ],
    },
  ],
}
