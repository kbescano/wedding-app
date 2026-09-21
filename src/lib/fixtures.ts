/** Placeholder content shown behind the blur. None of it is real guest data. */
export const FAKE_PHOTOS = [
  { id: -1, tone: ['#1F3A2E', '#C9A15B'], ratio: 1.3, author: 'A guest', caption: 'A moment from the day' },
  { id: -2, tone: ['#E8DCC4', '#8C5A3C'], ratio: 0.78, author: 'A guest', caption: 'Something to remember' },
  { id: -3, tone: ['#6B7F5E', '#F7F2E8'], ratio: 1, author: 'A guest', caption: '' },
  { id: -4, tone: ['#3C2D28', '#DEBE8C'], ratio: 1.4, author: 'A guest', caption: 'Golden hour' },
  { id: -5, tone: ['#C9A15B', '#1F3A2E'], ratio: 0.9, author: 'A guest', caption: 'Cheers' },
  { id: -6, tone: ['#8C5A3C', '#E8DCC4'], ratio: 1.2, author: 'A guest', caption: '' },
  { id: -7, tone: ['#1F3A2E', '#E8DCC4'], ratio: 0.8, author: 'A guest', caption: 'Together' },
  { id: -8, tone: ['#DEBE8C', '#3C2D28'], ratio: 1.1, author: 'A guest', caption: '' },
].map((p) => ({ ...p, created_at: new Date().toISOString(), mine: false }));

export const FAKE_MESSAGES = [
  { id: -1, author: 'A guest', body: 'Wishing you both a lifetime of joy, laughter and very long dinners together.', created_at: new Date().toISOString() },
  { id: -2, author: 'A guest', body: 'So happy for you. Can’t wait to celebrate with everyone who loves you.', created_at: new Date().toISOString() },
  { id: -3, author: 'A guest', body: 'From the first hello to this day. Congratulations, with all our love.', created_at: new Date().toISOString() },
  { id: -4, author: 'A guest', body: 'Thank you for letting us be part of it.', created_at: new Date().toISOString() },
];

export const FAKE_TABLES = [1, 2, 3, 4, 5, 6].map((n) => ({ label: `Table ${n}`, guests: ['A guest', 'A guest', 'A guest', 'A guest'] }));
