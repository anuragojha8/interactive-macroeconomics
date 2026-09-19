import type { ReactNode } from 'react';

/**
 * A technical term, at the sentence that defines it (STYLE §5).
 *
 * One style wherever it appears. A plain <em> inherits the colour of its box,
 * so the same kind of word read dark in the body and grey in a Break-it box,
 * and emphasis and definition looked identical. This carries neither problem.
 */
export function Term({ children }: { children: ReactNode }): JSX.Element {
  return <dfn className="term">{children}</dfn>;
}
