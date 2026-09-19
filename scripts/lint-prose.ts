/**
 * Mechanical checks for docs/STYLE.md.
 *
 * Catches only what a regular expression can honestly catch: the collaborative
 * voice, the banished vocabulary, and the words that blame the reader. Second
 * person is reported rather than failed, because the guide permits it in
 * operations and forbids it in exposition, and no regex knows the difference.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const ROOTS = ['src'];
const EXTENSIONS = new Set(['.tsx', '.ts', '.mdx']);

/** Patterns that fail the build. */
const BANNED: Array<{ re: RegExp; why: string }> = [
  // §1: "we" and "you" are welcome. The chummy register that flatters or
  // presumes is not.
  {
    re: /\blet['’]s (dive|explore|unpack|take a (look|closer look)|get started|begin)\b|\bbuckle up\b|\bhere['’]s the thing\b|\byou (might|may) be wondering\b|\bas you can see\b|\byou['’]ll notice\b|\bspoiler alert\b/gi,
    why: 'the chummy register (§1, §8)',
  },
  { re: /\b(obviously|of course|clearly|trivially)\b/gi,
    why: 'blames the reader for finding it hard (§8)' },
  { re: /\b(delve|tapestry|beacon|testament|paramount|furthermore|moreover|seamless|game-changing|robustly)\b/gi,
    why: 'banished vocabulary (§8)' },
  { re: /\bin conclusion\b|\bit is (important|crucial) to (note|remember)\b|\bat the end of the day\b/gi,
    why: 'banished vocabulary (§8)' },
  { re: /!(?!=)/g, why: 'no exclamation marks (§1)' },
];

/** Reported, not failed — a rule a regular expression cannot decide on its own. */
const REVIEW: Array<{ re: RegExp; why: string }> = [
  {
    re: /\b\d[\d,]*(\.\d+)?\s*(percent|per cent|%|times|-fold|fold)\b/gi,
    why: 'a figure in prose: must not assert a model result (§6)',
  },
  // §6 covers numbers written as words. A rule that catches 27000 and misses
  // "twenty-seven thousand" makes the prose stiff without making it reliable.
  {
    re: /\b(a|one)\s+factor\s+of\s+\w+/gi,
    why: 'a figure in prose, spelled out: must not assert a model result (§6)',
  },
  {
    re: /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)([- ]\w+){0,2}\s+(times|thirds|halves|quarters|fold|-fold|percent|per cent)\b/gi,
    why: 'a figure in prose, spelled out: must not assert a model result (§6)',
  },
  {
    re: /\b(cubed|squared)\b/gi,
    why: 'an operation on a figure in prose: check it is not a model result (§6)',
  },
];

interface Finding {
  file: string;
  line: number;
  text: string;
  match: string;
  why: string;
}

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return files(full);
    return EXTENSIONS.has(extname(full)) ? [full] : [];
  });
}

/**
 * Extracts prose, not code.
 *
 * Two sources: string literals of three or more words, and JSX text nodes. A
 * non-null assertion is not an exclamation mark and `justify-content` is not the
 * word "just", so neither reaches the checks.
 */
function looksLikeProse(text: string): boolean {
  const t = text.trim();
  if (t.split(/\s+/).length < 3) return false;
  if (/[;(){}=<>]|=>|\$\{|\bconst\b|\bimport\b/.test(t)) return false;
  // Code that survived the first filter: nullish coalescing, comparisons,
  // non-null assertions, and object-literal keys.
  if (/\?\?|!==|!=|![,.)\];]|^\s*[A-Za-z_$]+:\s/.test(t)) return false;
  if (!/[a-z]{3}/.test(t)) return false;
  return true;
}

function proseLines(source: string): Array<{ line: number; text: string; block: boolean }> {
  const out: Array<{ line: number; text: string; block: boolean }> = [];
  source.split('\n').forEach((raw, i) => {
    const line = i + 1;
    if (/^\s*(import|export type|\/\/|\*|\/\*)/.test(raw)) return;

    for (const m of raw.matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g)) {
      const value = m[1] ?? m[2] ?? '';
      if (looksLikeProse(value)) out.push({ line, text: value, block: false });
    }

    const jsxText = raw
      .replace(/\{[^}]*\}/g, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&mdash;/g, '\u2014')
      .replace(/&[a-z]+;/g, ' ');
    if (looksLikeProse(jsxText) && !raw.includes("'") && !raw.includes('"')) {
      out.push({ line, text: jsxText, block: true });
    }
  });
  return out;
}

/** Consecutive JSX text lines are one paragraph, which is what §3 measures. */
function paragraphs(
  lines: Array<{ line: number; text: string; block: boolean }>,
): Array<{ line: number; text: string }> {
  const out: Array<{ line: number; text: string }> = [];
  let current: { line: number; text: string; last: number } | null = null;
  for (const entry of lines) {
    if (!entry.block) {
      out.push({ line: entry.line, text: entry.text });
      current = null;
      continue;
    }
    if (current && entry.line === current.last + 1) {
      current.text += ' ' + entry.text.trim();
      current.last = entry.line;
    } else {
      current = { line: entry.line, text: entry.text.trim(), last: entry.line };
      out.push(current);
    }
  }
  return out.map((p) => ({ line: p.line, text: p.text.replace(/\s+/g, ' ').trim() }));
}

const sentencesOf = (text: string): string[] =>
  text
    .split(/(?<=[.!?])\s+(?=[A-Z\u201c"])/)
    .map((x) => x.trim())
    .filter((x) => /[a-z]/.test(x));

const wordCount = (sentence: string): number =>
  sentence.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;

const failures: Finding[] = [];
const reviews: Finding[] = [];

const longSentences: Finding[] = [];
const noShortSentence: Finding[] = [];

for (const root of ROOTS) {
  for (const file of files(root)) {
    const source = readFileSync(file, 'utf8');
    const blocks = paragraphs(proseLines(source));

    for (const { line, text } of blocks) {
      // §3: the contrast-then-correction tic, the loudest tell in version 1.
      const tic = /\b(?:is|are|was|were)(?: not|n['’]t) [^.!?]{1,90}[.!?]\s+(?:It|That|This|They|These) (?:is|are|was|were)\b/.exec(text);
      if (tic) {
        failures.push({ file, line, text: tic[0], match: 'X is not Y. It is Z.', why: 'the contrast-then-correction tic (§3)' });
      }
      // §3: at most one pair of em-dashes a paragraph.
      const dashes = (text.match(/\u2014/g) ?? []).length;
      if (dashes > 2) {
        failures.push({ file, line, text: text.slice(0, 90), match: `${dashes} em-dashes`, why: 'more than one pair of em-dashes in a paragraph (§3)' });
      }
      const sentences = sentencesOf(text);
      if (sentences.length === 0) continue;
      for (const sentence of sentences) {
        const words = wordCount(sentence);
        if (words > 40) {
          failures.push({ file, line, text: sentence, match: `${words} words`, why: 'far over the 25-word guideline (§3)' });
        } else if (words > 25) {
          longSentences.push({ file, line, text: sentence, match: `${words} words`, why: 'over 25 words (§3)' });
        }
      }
      // §3: a short sentence is emphasis, and emphasis spent three times in one
      // paragraph is worth nothing.
      const short = sentences.filter((x) => wordCount(x) < 8).length;
      if (short >= 3) {
        noShortSentence.push({ file, line, text: text.slice(0, 90), match: `${short} short sentences`, why: 'emphasis spent until it is worth nothing (§3)' });
      }
    }

    for (const { line, text } of proseLines(source)) {
      for (const { re, why } of BANNED) {
        for (const m of text.matchAll(re)) {
          failures.push({ file, line, text: text.trim(), match: m[0], why });
        }
      }
      for (const { re, why } of REVIEW) {
        for (const m of text.matchAll(re)) {
          reviews.push({ file, line, text: text.trim(), match: m[0], why });
        }
      }
    }
  }
}

for (const f of failures) {
  console.error(`${f.file}:${f.line}  "${f.match}" — ${f.why}\n    ${f.text.slice(0, 110)}`);
}
if (longSentences.length > 0) {
  console.log(`\n${longSentences.length} sentence(s) over 25 words:`);
  for (const f of longSentences) console.log(`  ${f.file}:${f.line}  ${f.match}  ${f.text.slice(0, 88)}`);
}
if (noShortSentence.length > 0) {
  console.log(`\n${noShortSentence.length} paragraph(s) over-using the short sentence:`);
  for (const f of noShortSentence) console.log(`  ${f.file}:${f.line}  ${f.text}`);
}
if (reviews.length > 0) {
  console.log(`\n${reviews.length} second-person use(s) for review:`);
  for (const r of reviews) console.log(`  ${r.file}:${r.line}  "${r.match}"  ${r.text.slice(0, 90)}`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} style violation(s).`);
  process.exit(1);
}
console.log(`\nNo style violations.`);
