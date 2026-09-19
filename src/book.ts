import type { Primitive } from './engine/types';

export interface ChapterMeta {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  primitives: Primitive[];
  readingMinutes: number;
  sources: string[];
  /** Section anchors, in reading order, for the contents rail. */
  sections: Array<{ id: string; title: string }>;
}

export const CHAPTERS: ChapterMeta[] = [
  {
    id: 'ch0-kernel',
    number: 0,
    title: 'The Kernel',
    subtitle: 'Five primitives, no economics',
    primitives: ['P1', 'P2', 'P3', 'P4', 'P5'],
    readingMinutes: 16,
    sources: ['Jones, Macroeconomics 5e, ch. 1'],
    sections: [
      { id: 'stocks', title: 'Stocks and flows' },
      { id: 'identities', title: 'Identities and budgets' },
      { id: 'rules', title: 'Behavioural rules' },
      { id: 'clearing', title: 'Market clearing' },
      { id: 'sorting', title: 'Which is which' },
      { id: 'case', title: 'Case · a briefing note' },
    ],
  },
  {
    id: 'ch1-measurement',
    number: 1,
    title: 'Measuring the macroeconomy',
    subtitle: 'What cannot be false',
    primitives: ['P2', 'P3'],
    readingMinutes: 21,
    sources: ['Jones, Macroeconomics 5e, ch. 2'],
    sections: [
      { id: 'circular-flow', title: 'The circular flow' },
      { id: 'balances', title: 'Sector balances' },
      { id: 'real-nominal', title: 'Real and nominal' },
      { id: 'case', title: 'Case · the accounts' },
    ],
  },
  {
    id: 'ch2-production',
    number: 2,
    title: 'A model of production',
    subtitle: 'The first solvable model',
    primitives: ['P4', 'P5'],
    readingMinutes: 24,
    sources: ['Jones, Macroeconomics 5e, ch. 4'],
    sections: [
      { id: 'technology', title: 'The production function' },
      { id: 'shares', title: 'Factor payments' },
      { id: 'development', title: 'Development accounting' },
      { id: 'case', title: 'Case · the sovereign fund' },
    ],
  },
  {
    id: 'ch3-solow',
    number: 3,
    title: 'The Solow model',
    subtitle: 'What one accumulator does to everything',
    primitives: ['P1', 'P2', 'P4'],
    readingMinutes: 28,
    sources: ['Jones, Macroeconomics 5e, ch. 5'],
    sections: [
      { id: 'accumulation', title: 'Adding one relation' },
      { id: 'steady-state', title: 'The resting point' },
      { id: 'saving', title: 'Saving more' },
      { id: 'case', title: 'Case · the plan, and the storm' },
    ],
  },
];

export const chapterById = new Map(CHAPTERS.map((c) => [c.id, c]));
