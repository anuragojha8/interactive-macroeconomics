import { Link } from 'react-router-dom';
import { CHAPTERS } from '../book';
import { loadProgress } from '../state/progress';
import { VERANO_PLAN_RATE, VERANO_SOLOW } from '../case/verano';

const PRIMITIVES: Record<string, string> = {
  P1: 'stocks & flows',
  P2: 'identities',
  P3: 'budget constraints',
  P4: 'behavioural rules',
  P5: 'market clearing',
};

export function Contents(): JSX.Element {
  const progress = loadProgress();
  const correct = progress.sorting.reduce((n, s) => n + s.score, 0);
  const attempted = progress.sorting.reduce((n, s) => n + s.total, 0);
  const calls = progress.predictions.length;
  const right = progress.predictions.filter((p) => p.correct).length;

  return (
    <main className="prose prose--wide">
      <span className="eyebrow">Part I</span>
      <h1>One economy, five primitives</h1>
      <p className="lede">
        This book builds one small economy, piece by piece, inside a simulator you can take apart.
        Every chapter adds a few relations to the same engine, and every claim in the text can be
        run, pushed and traced back to the assumption that produced it. If a sentence and the
        simulator ever disagree, trust the simulator and tell the author.
      </p>

      <div className="caseintro">
        <span className="eyebrow">The case of Verano</span>
        <p>
          One case runs through every chapter. Verano is a middle-income island economy of two
          million workers, and its government is debating a National Investment Plan that would raise
          the share of output it invests by{' '}
          {Math.round((VERANO_PLAN_RATE - VERANO_SOLOW.s!) * 100)} points. Each chapter ends by
          answering the part of that debate its own tools can reach. No part can be answered with
          only the chapters before it, which is roughly how real policy debates feel.
        </p>
        <p className="caseintro__note">
          Verano is invented, and its figures are a calibration rather than a set of facts. Its
          accounts are in billions of veral and its workforce in thousands, which is how the panels
          read them. Every number in the case is computed from that calibration by the same engine
          that runs the chapters.
        </p>
      </div>

      <ul className="toc">
        {CHAPTERS.map((c) => (
          <li key={c.id}>
            <Link to={`/${c.id}`}>
              <span className="mono toc__num">{c.number}</span>
              <span className="toc__body">
                <span className="toc__title">{c.title}</span>
                <span className="toc__sub">{c.subtitle}</span>
                <span className="mono toc__meta">
                  {c.readingMinutes} min · {c.primitives.map((p) => PRIMITIVES[p]).join(', ')}
                </span>
              </span>
              {progress.visited[c.id] ? <span className="mono toc__seen">read</span> : null}
            </Link>
          </li>
        ))}
      </ul>

      {calls > 0 || attempted > 0 ? (
        <div className="record">
          <span className="eyebrow">Record</span>
          {calls > 0 ? (
            <p>
              {right} of {calls} predictions correct.
            </p>
          ) : null}
          {attempted > 0 ? (
            <p>
              {correct} of {attempted} equations sorted correctly.
            </p>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
