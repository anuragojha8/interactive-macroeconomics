import { useMemo, useState } from 'react';
import { CHAPTERS } from '../../book';
import { models } from '../../models/registry';
import { MathText } from '../mdx/MathText';
import './book.css';

/**
 * Notation, as a reference the reader can keep open.
 *
 * Scoped to what the reader has met. A sheet that lists every symbol in the book
 * shows Chapter 3 the bathtub's litres and the lemonade stand's inventory, and
 * the reader has to search a reference that is mostly irrelevant to the page
 * they are on.
 */
export function SymbolSheet({ chapterId }: { chapterId?: string }): JSX.Element {
  const [open, setOpen] = useState(true);
  const upTo = CHAPTERS.find((c) => c.id === chapterId)?.number ?? Infinity;
  const entries = useMemo(() => {
    const seen = new Map<
      string,
      { id: string; symbol: string; name: string; unit: string; where: string }
    >();
        for (const model of models) {
      for (const v of model.variables) {
        if (!v.introducedIn || seen.has(v.id)) continue;
        const chapter = CHAPTERS.find((c) => v.introducedIn!.startsWith(c.id));
        if (chapter && chapter.number > upTo) continue;
        seen.set(v.id, {
          id: v.id,
          symbol: v.symbol,
          name: v.name,
          unit: v.unit.label,
          where: v.introducedIn,
        });
      }
    }
        return [...seen.values()];
  }, [upTo]);

  return (
    <section className="rail__block">
      <button className="rail__toggle" type="button" onClick={() => setOpen((o) => !o)}>
        <span className="eyebrow">Symbols</span>
        <span className="mono rail__chevron">{open ? '−' : '+'}</span>
      </button>
      {open ? (
        <ul className="symbols">
          {entries.map((e) => (
            <li key={e.id}>
              <span className="mono symbols__sym">
                <MathText latex={e.symbol} />
              </span>
              <span className="symbols__name">{e.name}</span>
              <span className="mono symbols__unit">{e.unit}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
