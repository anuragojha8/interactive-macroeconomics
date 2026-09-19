/**
 * Performance budget (spec §5.6), enforced rather than aspired to.
 * Gzipped, because that is what a reader downloads.
 */
import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const BUDGETS: Array<{ ext: string; limit: number; label: string }> = [
  { ext: '.js', limit: 250 * 1024, label: 'JavaScript' },
  { ext: '.css', limit: 60 * 1024, label: 'CSS' },
];

const dir = 'dist/assets';
let failed = false;

for (const { ext, limit, label } of BUDGETS) {
  const total = readdirSync(dir)
    .filter((f) => extname(f) === ext)
    .reduce((sum, f) => sum + gzipSync(readFileSync(join(dir, f))).length, 0);
  const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;
  if (total > limit) {
    console.error(`${label} is ${kb(total)} gzipped, over the ${kb(limit)} budget.`);
    failed = true;
  } else {
    console.log(`${label}: ${kb(total)} gzipped, budget ${kb(limit)}.`);
  }
}

if (failed) process.exit(1);
