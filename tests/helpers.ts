import { expect } from 'vitest';

/** Reports absolute *and* relative error on failure, which is what you need. */
export function expectClose(actual: number, expected: number, relTol = 1e-12): void {
  const scale = Math.max(Math.abs(actual), Math.abs(expected), 1e-300);
  const rel = Math.abs(actual - expected) / scale;
  if (rel > relTol) {
    expect.fail(
      `expected ${actual} to be within relative ${relTol} of ${expected}\n` +
        `  absolute error: ${Math.abs(actual - expected)}\n` +
        `  relative error: ${rel}`,
    );
  }
}

/** For quantities that genuinely reach zero, where relative error is meaningless. */
export function expectNear(actual: number, expected: number, absTol: number): void {
  if (Math.abs(actual - expected) > absTol) {
    expect.fail(`expected ${actual} to be within ${absTol} of ${expected}`);
  }
}

export function relErr(actual: number, expected: number): number {
  const scale = Math.max(Math.abs(actual), Math.abs(expected), 1e-300);
  return Math.abs(actual - expected) / scale;
}
