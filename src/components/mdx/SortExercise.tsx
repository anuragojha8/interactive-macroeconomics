import { useState } from 'react';
import { recordSorting } from '../../state/progress';
import { MathText } from './MathText';
import './predict.css';

export interface SortItem {
  id: string;
  latex: string;
  answer: 'accounting' | 'assumption';
  because: string;
}

/**
 * The terminal exercise of Chapter 0, and the most important one in the book: an
 * unlabelled equation is either true by construction or an assumption about
 * behaviour, and telling them apart is the skill everything else rests on.
 */
export function SortExercise({ id, items }: { id: string; items: SortItem[] }): JSX.Element {
  const [picks, setPicks] = useState<Record<string, 'accounting' | 'assumption'>>({});
  const [checked, setChecked] = useState(false);

  const answered = items.filter((i) => picks[i.id]).length;
  const score = items.filter((i) => picks[i.id] === i.answer).length;

  const check = () => {
    if (answered < items.length || checked) return;
    setChecked(true);
    recordSorting({ id, at: new Date().toISOString(), score, total: items.length });
  };

  return (
    <div className="sorter">
      <span className="eyebrow predict__eyebrow">Which is which</span>
      <p className="predict__question">
        Each equation below is either true by construction or an assumption about how somebody
        behaves. Nothing in the notation distinguishes them.
      </p>

      <ul className="sorter__rows">
        {items.map((item) => {
          const picked = picks[item.id];
          const right = checked && picked === item.answer;
          return (
            <li
              key={item.id}
              className={checked ? (right ? 'sorter__row--right' : 'sorter__row--wrong') : ''}
            >
              <span className="mono sorter__eq">
                <MathText latex={item.latex} />
              </span>
              <span className="sorter__buttons">
                {(['accounting', 'assumption'] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    disabled={checked}
                    aria-pressed={picked === kind}
                    className={`sorter__opt sorter__opt--${kind} ${
                      picked === kind ? 'sorter__opt--on' : ''
                    } ${checked && item.answer === kind ? 'sorter__opt--truth' : ''}`}
                    onClick={() => setPicks((p) => ({ ...p, [item.id]: kind }))}
                  >
                    {kind}
                  </button>
                ))}
              </span>
              {checked ? <p className="sorter__because">{item.because}</p> : null}
            </li>
          );
        })}
      </ul>

      <div className="predict__foot">
        <button
          type="button"
          className="predict__run"
          disabled={answered < items.length || checked}
          onClick={check}
        >
          {checked ? `${score} of ${items.length}` : 'check'}
        </button>
        <span className="predict__hint">
          {checked
            ? score === items.length
              ? 'Every one correct. That distinction is the whole of Part I.'
              : 'The explanations are above. Being wrong here is the point of doing it early.'
            : `${answered} of ${items.length} sorted`}
        </span>
      </div>
    </div>
  );
}
